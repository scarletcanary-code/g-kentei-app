#!/usr/bin/env node
/**
 * felo-audit-question-content.mjs
 * Felo API を使って問題の定性品質を審査するスクリプト（LLM 監査 0033）
 *
 * 使用方法:
 *   node --env-file=.env scripts/felo-audit-question-content.mjs --qids <id1,id2,...> [--dry-run] [--output-dir <path>]
 *   node --env-file=.env scripts/felo-audit-question-content.mjs --all [--output-dir <path>]
 *
 * 環境変数:
 *   FELO_API_KEY: Felo API キー（.env ファイルに設定）--dry-run 時は不要
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// ============================================================
// コマンドライン引数のパース
// ============================================================
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const useAll = args.includes('--all');

// --qids と --all が両方指定された場合はエラー
const qidsArgIdx = args.indexOf('--qids');
const qidsArg = (qidsArgIdx !== -1 && qidsArgIdx + 1 < args.length) ? args[qidsArgIdx + 1] : null;

if (useAll && qidsArg !== null) {
  process.stderr.write('エラー: --all と --qids は同時に指定できません。どちらか一方を使用してください。\n');
  process.exit(1);
}

// --output-dir オプション
const outputDirArgIdx = args.indexOf('--output-dir');
const outputDirArg = (outputDirArgIdx !== -1 && outputDirArgIdx + 1 < args.length) ? args[outputDirArgIdx + 1] : null;
const outputDir = outputDirArg
  ? (outputDirArg.startsWith('/') || outputDirArg.match(/^[A-Za-z]:/) ? outputDirArg : join(process.cwd(), outputDirArg))
  : join(projectRoot, '../.harness/runs/0033-full');

// --all でも --qids でもない場合はエラー（dry-run のみも含む）
if (!useAll && qidsArg === null) {
  process.stderr.write('エラー: --qids <id1,id2,...> または --all が必要です。\n');
  process.stderr.write('使用方法:\n');
  process.stderr.write('  node scripts/felo-audit-question-content.mjs --qids <id1,id2,...> [--dry-run] [--output-dir <path>]\n');
  process.stderr.write('  node scripts/felo-audit-question-content.mjs --all [--output-dir <path>]\n');
  process.exit(1);
}

// ============================================================
// FELO_API_KEY バリデーション（dry-run 以外）
// ============================================================
const apiKey = process.env.FELO_API_KEY;
if (!dryRun) {
  if (!apiKey || apiKey.trim() === '') {
    process.stderr.write('エラー: FELO_API_KEY が設定されていません。.env ファイルに FELO_API_KEY=<your-key> を設定してください。\n');
    process.exit(1);
  }
}

// ============================================================
// 定数・パス
// ============================================================
const FELO_API_URL = 'https://openapi.felo.ai/v2/chat';
const CHAPTERS = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8'];
const resultsPath = join(outputDir, 'audit-llm-results.json');
const rawPath = join(outputDir, 'audit-llm-raw.json');
const summaryPath = join(outputDir, 'audit-llm-summary.md');
const comparisonPath = join(outputDir, 'audit-llm-comparison.md');
const logPath = join(outputDir, 'run.log');
const rejectedPath = join(outputDir, 'rejected.json');
const abortedPath = join(outputDir, 'aborted.md');

// ヒューリスティック audit 結果パス（比較用）
const heuristicResultsPath = join(projectRoot, '../.harness/runs/0031-audit/audit-results.json');

// 審査項目
const REVIEW_ITEMS = [
  'fact_accuracy',
  'syllabus_alignment',
  'one_best_answer',
  'distractor_quality',
  'explanation_quality',
  'ambiguity_risk',
  'exam_likeness',
  'readability',
  'option_naturalness',
  'explanation_resolves_misconception',
  'unexplained_jargon',
];

// ============================================================
// ユーティリティ
// ============================================================
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function byteLen(s) {
  return Buffer.byteLength(s, 'utf8');
}

function extractAnswer(data) {
  if (data && data.data && data.data.answer) return data.data.answer;
  if (data && data.answer) return data.answer;
  if (data && data.result) return data.result;
  if (data && data.text) return data.text;
  if (data && data.content) return data.content;
  return JSON.stringify(data);
}

function parseJsonBlock(text) {
  // 1. コードブロック形式を試す（配列）
  const matchArr = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
  if (matchArr) {
    try {
      return JSON.parse(matchArr[1].trim());
    } catch (_) {}
  }
  // 2. コードブロック形式を試す（オブジェクト）
  const matchObj = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (matchObj) {
    try {
      return JSON.parse(matchObj[1].trim());
    } catch (_) {}
  }
  // 3. テキスト全体が JSON 配列の場合を試す
  const trimmed = text.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      return JSON.parse(trimmed);
    } catch (_) {}
  }
  // 4. テキスト全体が JSON オブジェクトの場合を試す
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      return JSON.parse(trimmed);
    } catch (_) {}
  }
  // 5. テキスト内の最初の [ から最後の ] までを抽出して試す
  const startArr = text.indexOf('[');
  const endArr = text.lastIndexOf(']');
  if (startArr !== -1 && endArr !== -1 && startArr < endArr) {
    try {
      return JSON.parse(text.substring(startArr, endArr + 1));
    } catch (_) {}
  }
  // 6. テキスト内の最初の { から最後の } までを抽出して試す
  const startObj = text.indexOf('{');
  const endObj = text.lastIndexOf('}');
  if (startObj !== -1 && endObj !== -1 && startObj < endObj) {
    try {
      return JSON.parse(text.substring(startObj, endObj + 1));
    } catch (_) {}
  }
  return null;
}

// ============================================================
// ログ出力（stdout + ファイル）
// ============================================================
function log(msg) {
  const line = msg + '\n';
  process.stdout.write(line);
  appendFileSync(logPath, line, 'utf-8');
}

// ============================================================
// 問題データ読み込み
// ============================================================
function loadAllChapters() {
  const map = {};
  for (const ch of CHAPTERS) {
    const p = join(projectRoot, 'src/data/questions', `${ch}.json`);
    map[ch] = JSON.parse(readFileSync(p, 'utf-8'));
  }
  return map;
}

// ============================================================
// 問題データのバイト数スナップショット（中断条件6用）
// ============================================================
function getChapterByteSnapshot() {
  const snapshot = {};
  for (const ch of CHAPTERS) {
    const p = join(projectRoot, 'src/data/questions', `${ch}.json`);
    snapshot[ch] = statSync(p).size;
  }
  return snapshot;
}

function checkChapterBytesUnchanged(snapshot) {
  for (const ch of CHAPTERS) {
    const p = join(projectRoot, 'src/data/questions', `${ch}.json`);
    const currentSize = statSync(p).size;
    if (currentSize !== snapshot[ch]) {
      return { changed: true, chapter: ch, expected: snapshot[ch], actual: currentSize };
    }
  }
  return { changed: false };
}

// ============================================================
// 中断処理
// ============================================================
let abortTriggered = false;

function abort(conditionNum, conditionName, processedCount, lastQid, detail) {
  if (abortTriggered) return;
  abortTriggered = true;
  const now = new Date().toISOString();
  const abortMd = `# 中断レポート

中断日時: ${now}
中断条件: 条件${conditionNum}「${conditionName}」
処理済み件数: ${processedCount} / 292
最後に処理した questionId: ${lastQid || '（なし）'}
詳細: ${detail}
`;
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(abortedPath, abortMd, 'utf-8');
  log(`[ABORT] 中断条件${conditionNum}「${conditionName}」発火: ${detail}`);
}

// ============================================================
// 共通プロンプトサフィックス（出力フォーマット指示）
// ============================================================
const REVIEW_OUTPUT_SCHEMA = '[{"questionId":"ID","overall":"PASS/WARN/FAIL","review":{"fact_accuracy":{"status":"PASS","reason":"理由"},"syllabus_alignment":{"status":"PASS","reason":"理由"},"one_best_answer":{"status":"PASS","reason":"理由"},"distractor_quality":{"status":"PASS","reason":"理由"},"explanation_quality":{"status":"PASS","reason":"理由"},"ambiguity_risk":{"status":"PASS","reason":"理由"},"exam_likeness":{"status":"PASS","reason":"理由"},"readability":{"status":"PASS","reason":"理由"},"option_naturalness":{"status":"PASS","reason":"理由"},"explanation_resolves_misconception":{"status":"PASS","reason":"理由"},"unexplained_jargon":{"status":"PASS","reason":"理由"}},"recommendedAction":"keep/revise/delete/manual_review","priority":"none/low/medium/high"}]';

// ============================================================
// プロンプト構築（バッチ共通: N問/req）
// ============================================================
function buildAuditPrompt(questions) {
  // 入力データのフォールバックバリアント（**explanation は全レベルで保持**、削除厳禁）
  const mkFull = qs => qs.map(q => ({
    id: q.id, question: q.question, choices: q.choices, correctIndex: q.correctIndex,
    explanation: q.explanation, cognitiveLevel: q.cognitiveLevel,
    learningObjective: q.learningObjective, misconceptionTarget: q.misconceptionTarget,
    optionRationales: q.optionRationales,
  }));
  // optionRationales を削除（最も大きいフィールドの一つ）
  const mkShort = qs => qs.map(q => ({
    id: q.id, question: q.question, choices: q.choices, correctIndex: q.correctIndex,
    explanation: q.explanation, cognitiveLevel: q.cognitiveLevel,
    learningObjective: q.learningObjective, misconceptionTarget: q.misconceptionTarget,
  }));
  // メタデータ系を削除、explanation は残す
  const mkMin = qs => qs.map(q => ({
    id: q.id, question: q.question, choices: q.choices, correctIndex: q.correctIndex,
    explanation: q.explanation,
  }));
  // choices を text 配列に圧縮、explanation は残す
  const mkUltraMin = qs => qs.map(q => ({
    id: q.id, question: q.question,
    choices: q.choices.map(c => c.text),
    correctIndex: q.correctIndex,
    explanation: q.explanation,
  }));
  // 最終フォールバック: explanation を冒頭 200 字に切り詰めるが、保持は必須
  const mkNanoMin = qs => qs.map(q => ({
    id: q.id, question: q.question,
    choices: q.choices.map(c => c.text),
    correctIndex: q.correctIndex,
    explanation: (q.explanation || '').slice(0, 200),
  }));

  const makePrompt = (inputData) =>
    `G検定問題品質審査。JSONのみ出力。\n` +
    `注意:入力 explanation が空でない場合「解説がない」を理由にWARN/FAIL禁止。\n` +
    `11項目をPASS/WARN/FAILで判定。WARN/FAILは reason に具体根拠(どの選択肢/explanation のどこ)必須。\n` +
    `fact_accuracy(根拠不十分→WARN+insufficient_evidence),syllabus_alignment,distractor_quality,ambiguity_risk,exam_likeness,readability,option_naturalness,unexplained_jargon,\n` +
    `one_best_answer(専門的一意→PASS,迷うが一意→WARN,複数正解/条件不足→FAIL),\n` +
    `explanation_quality(explanation空→FAIL,正解理由あり→PASS,誤答理由不足→WARN),\n` +
    `explanation_resolves_misconception(explanation/optionRationalesで解消→PASS,弱い→WARN,空→FAIL).\n` +
    `問題:${JSON.stringify(inputData)}\n出力:${REVIEW_OUTPUT_SCHEMA}`;

  const candidates = [
    { data: mkFull(questions), level: 'full' },
    { data: mkShort(questions), level: 'short' },
    { data: mkMin(questions), level: 'min' },
    { data: mkUltraMin(questions), level: 'ultraMin' },
    { data: mkNanoMin(questions), level: 'nanoMin' },
  ];

  for (const c of candidates) {
    const prompt = makePrompt(c.data);
    if (byteLen(prompt) <= 1950) {
      return { prompt, level: c.level };
    }
  }
  // 最後の候補を強制使用
  const last = candidates[candidates.length - 1];
  return { prompt: makePrompt(last.data), level: last.level + '+overflow' };
}

// ============================================================
// Felo API 呼び出し
// ============================================================
async function feloChat(prompt) {
  const response = await fetch(FELO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query: prompt }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '(レスポンスボディ取得失敗)');
    throw new Error(`Felo API HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data;
}

// ============================================================
// レスポンス検証
// ============================================================
function validateAuditResponse(parsed, expectedCount) {
  // 配列かどうか
  if (!Array.isArray(parsed)) {
    // 単一オブジェクトを配列にラップ
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      parsed = [parsed];
    } else {
      return { ok: false, reason: 'response is not an array or object', data: null };
    }
  }

  // 長さ確認
  if (parsed.length !== expectedCount) {
    return { ok: false, reason: `array length mismatch: expected ${expectedCount}, got ${parsed.length}`, data: null };
  }

  // 各エントリを検証
  for (const entry of parsed) {
    if (!entry.questionId || !entry.overall || !entry.review || !entry.recommendedAction || !entry.priority) {
      return { ok: false, reason: `missing required fields in entry: ${JSON.stringify(Object.keys(entry))}`, data: null };
    }

    // 11 項目の存在確認
    for (const item of REVIEW_ITEMS) {
      if (!entry.review[item]) {
        return { ok: false, reason: `missing review item: ${entry.questionId} -> ${item}`, data: null };
      }
      if (!entry.review[item].status || entry.review[item].reason === undefined) {
        return { ok: false, reason: `missing status/reason in: ${entry.questionId} -> ${item}`, data: null };
      }
      // WARN/FAIL の reason 空欄禁止
      if ((entry.review[item].status === 'WARN' || entry.review[item].status === 'FAIL') && (!entry.review[item].reason || entry.review[item].reason.trim() === '')) {
        return { ok: false, reason: `empty reason for ${entry.review[item].status}: ${entry.questionId} -> ${item}`, data: null };
      }
    }
  }

  return { ok: true, data: parsed };
}

// ============================================================
// overall / recommendedAction / priority の計算
// ============================================================
function computeOverall(review) {
  let failCount = 0;
  let warnCount = 0;
  for (const item of REVIEW_ITEMS) {
    const status = review[item]?.status;
    if (status === 'FAIL') failCount++;
    if (status === 'WARN') warnCount++;
  }

  if (failCount > 0) return 'FAIL';
  if (warnCount >= 2) return 'WARN';
  return 'PASS';
}

function computeRecommendedAction(overall, review) {
  if (overall === 'FAIL') {
    if (review.fact_accuracy?.status === 'FAIL') return 'manual_review';
    return 'revise';
  }
  if (overall === 'WARN') {
    if (review.fact_accuracy?.status === 'WARN') return 'manual_review';
    return 'revise';
  }
  return 'keep';
}

function computePriority(overall, review) {
  if (review.fact_accuracy?.status === 'FAIL') return 'high';
  if (overall === 'FAIL') return 'high';
  if (overall === 'WARN') {
    let warnCount = 0;
    for (const item of REVIEW_ITEMS) {
      if (review[item]?.status === 'WARN') warnCount++;
    }
    if (warnCount >= 4) return 'high';
    if (warnCount >= 2) return 'medium';
    return 'low';
  }
  return 'none';
}

// ============================================================
// rejected ダンプへの追記
// ============================================================
function appendRejected(entry) {
  let existing = [];
  if (existsSync(rejectedPath)) {
    try {
      existing = JSON.parse(readFileSync(rejectedPath, 'utf-8'));
    } catch (_) {}
  }
  existing.push(entry);
  writeFileSync(rejectedPath, JSON.stringify(existing, null, 2), 'utf-8');
}

// ============================================================
// 中断条件チェック変数
// ============================================================
let consecutiveParseErrors = 0;
let consecutiveBatchFails = 0;
let consecutiveAllPassThin = 0;

// ============================================================
// バッチ処理（2 問/req、1 問/req への自動降格付き）
// ============================================================
async function processBatch(questions) {
  const ids = questions.map(q => q.id).join(', ');

  // 2 問/req か確認
  let batchSize = questions.length;
  let promptObj;

  if (batchSize === 2) {
    promptObj = buildAuditPrompt(questions);
    if (byteLen(promptObj.prompt) > 1950) {
      // 1 問/req に自動降格
      log(`[DOWNGRADE] バッチサイズを 2→1 に変更: ${ids}`);
      batchSize = 1;
    }
  }

  if (batchSize === 1) {
    // 1 問ずつ処理
    const results = [];
    for (const q of questions) {
      const result = await processSingleQuestion(q);
      results.push(result);
    }
    return results;
  }

  // 2 問/req で処理
  log(`[INFO] バッチ開始: ${ids}  (2問/req)`);

  for (let attempt = 1; attempt <= 3; attempt++) {
    let data;
    let answerText = '';
    try {
      data = await feloChat(promptObj.prompt);
      answerText = extractAnswer(data).trim();
    } catch (e) {
      const reason = `API error: ${e.message}`;
      consecutiveBatchFails++;
      if (consecutiveBatchFails >= 5) {
        abort(4, 'API制限/出力制限でバッチ失敗が連続5件', -1, ids, `連続バッチ失敗 5件に達した`);
        return questions.map(q => ({ id: q.id, error: reason }));
      }
      if (attempt < 3) {
        log(`[RETRY] バッチ再試行 (試行 ${attempt + 1}/3): ${ids}  理由: ${reason}`);
        await sleep(2000);
        continue;
      }
      log(`[FAIL] バッチ失敗 (3/3): ${ids}  → rejected.json に追記`);
      for (const q of questions) {
        appendRejected({ id: q.id, reason });
      }
      return questions.map(q => ({ id: q.id, error: reason }));
    }

    let parsed = parseJsonBlock(answerText);

    if (parsed === null) {
      consecutiveParseErrors++;
      if (consecutiveParseErrors >= 5) {
        abort(1, 'JSONパースエラーが5件以上連続発生', -1, ids, `連続JSONパースエラー 5件に達した`);
        return questions.map(q => ({ id: q.id, error: 'JSON parse error (abort triggered)' }));
      }
      const reason = `JSON parse failed`;
      consecutiveBatchFails++;
      if (consecutiveBatchFails >= 5) {
        abort(4, 'API制限/出力制限でバッチ失敗が連続5件', -1, ids, `連続バッチ失敗 5件に達した`);
        return questions.map(q => ({ id: q.id, error: reason }));
      }
      if (attempt < 3) {
        log(`[RETRY] バッチ再試行 (試行 ${attempt + 1}/3): ${ids}  理由: ${reason}`);
        await sleep(2000);
        continue;
      }
      log(`[FAIL] バッチ失敗 (3/3): ${ids}  → rejected.json に追記`);
      for (const q of questions) {
        appendRejected({ id: q.id, reason });
      }
      return questions.map(q => ({ id: q.id, error: reason }));
    }

    // パース成功 → consecutiveParseErrors をリセット
    consecutiveParseErrors = 0;

    // 単一オブジェクトを配列にラップ
    if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') {
      parsed = [parsed];
    }

    const validation = validateAuditResponse(parsed, questions.length);
    if (!validation.ok) {
      consecutiveBatchFails++;
      if (consecutiveBatchFails >= 5) {
        abort(4, 'API制限/出力制限でバッチ失敗が連続5件', -1, ids, `連続バッチ失敗 5件に達した`);
        return questions.map(q => ({ id: q.id, error: validation.reason }));
      }
      const reason = `validation failed: ${validation.reason}`;
      if (attempt < 3) {
        log(`[RETRY] バッチ再試行 (試行 ${attempt + 1}/3): ${ids}  理由: ${reason}`);
        await sleep(2000);
        continue;
      }
      log(`[FAIL] バッチ失敗 (3/3): ${ids}  → rejected.json に追記`);
      for (const q of questions) {
        appendRejected({ id: q.id, reason });
      }
      return questions.map(q => ({ id: q.id, error: reason }));
    }

    // 中断条件5: questionId と送信 qid の一致確認
    for (let idx = 0; idx < validation.data.length; idx++) {
      const returnedId = validation.data[idx].questionId;
      const sentId = questions[idx].id;
      if (returnedId !== sentId) {
        abort(5, 'questionIdと出力結果の対応が崩れる', -1, sentId, `送信 qid=${sentId}, 返却 questionId=${returnedId}`);
        return questions.map(q => ({ id: q.id, error: 'questionId mismatch (abort triggered)' }));
      }
    }

    // overall / recommendedAction / priority をスクリプト側で計算して上書き
    const finalResults = validation.data.map(entry => {
      const overall = computeOverall(entry.review);
      const recommendedAction = computeRecommendedAction(overall, entry.review);
      const priority = computePriority(overall, entry.review);
      return {
        ...entry,
        overall,
        recommendedAction,
        priority,
      };
    });

    // バッチ成功 → consecutiveBatchFails をリセット
    consecutiveBatchFails = 0;

    // 中断条件2: explanation 存在なのに「解説なし」判定の検出
    for (const entry of finalResults) {
      const eq = entry.review?.explanation_quality;
      if (!eq) continue;
      if (eq.status === 'FAIL' || eq.status === 'WARN') {
        const noExplPatterns = ['解説がない', '解説なし', 'no explanation'];
        const hasNoExplReason = noExplPatterns.some(p => (eq.reason || '').includes(p));
        if (hasNoExplReason) {
          const orig = targetQuestionsMap[entry.questionId];
          if (orig && orig.explanation && orig.explanation.trim() !== '') {
            abort(2, 'explanationが存在するのに「解説なし」と判定する事象が再発', -1, entry.questionId,
              `questionId=${entry.questionId}, reason="${eq.reason}", explanation前半="${orig.explanation.slice(0,80)}"`);
            return finalResults.map(r => ({ ...r, _aborted: true }));
          }
        }
      }
    }

    // 中断条件3: 10問以上連続で全項目PASSかつ理由が薄い
    for (const entry of finalResults) {
      const allPass = REVIEW_ITEMS.every(item => entry.review?.[item]?.status === 'PASS');
      if (allPass) {
        const reasons = REVIEW_ITEMS.map(item => entry.review?.[item]?.reason || '');
        const avgLen = reasons.reduce((sum, r) => sum + r.length, 0) / reasons.length;
        if (avgLen < 15) {
          consecutiveAllPassThin++;
          if (consecutiveAllPassThin >= 10) {
            abort(3, '10問以上連続で全項目PASSかつ理由が薄い', -1, entry.questionId,
              `連続全PASS+薄い理由 10件に達した。直近の entry questionId=${entry.questionId}`);
            return finalResults.map(r => ({ ...r, _aborted: true }));
          }
        } else {
          consecutiveAllPassThin = 0;
        }
      } else {
        consecutiveAllPassThin = 0;
      }
    }

    log(`[OK] バッチ成功: ${ids}`);
    return finalResults;
  }

  return questions.map(q => ({ id: q.id, error: 'unknown error' }));
}

// ============================================================
// 1 問単独処理
// ============================================================
async function processSingleQuestion(q) {
  log(`[INFO] バッチ開始: ${q.id}  (1問/req)`);
  const promptObj = buildAuditPrompt([q]);

  for (let attempt = 1; attempt <= 3; attempt++) {
    let data;
    let answerText = '';
    try {
      data = await feloChat(promptObj.prompt);
      answerText = extractAnswer(data).trim();
    } catch (e) {
      const reason = `API error: ${e.message}`;
      consecutiveBatchFails++;
      if (consecutiveBatchFails >= 5) {
        abort(4, 'API制限/出力制限でバッチ失敗が連続5件', -1, q.id, `連続バッチ失敗 5件に達した`);
        return { id: q.id, error: reason };
      }
      if (attempt < 3) {
        log(`[RETRY] バッチ再試行 (試行 ${attempt + 1}/3): ${q.id}  理由: ${reason}`);
        await sleep(2000);
        continue;
      }
      log(`[FAIL] バッチ失敗 (3/3): ${q.id}  → rejected.json に追記`);
      appendRejected({ id: q.id, reason });
      return { id: q.id, error: reason };
    }

    let parsed = parseJsonBlock(answerText);

    if (parsed === null) {
      consecutiveParseErrors++;
      if (consecutiveParseErrors >= 5) {
        abort(1, 'JSONパースエラーが5件以上連続発生', -1, q.id, `連続JSONパースエラー 5件に達した`);
        return { id: q.id, error: 'JSON parse error (abort triggered)' };
      }
      const reason = `JSON parse failed`;
      consecutiveBatchFails++;
      if (consecutiveBatchFails >= 5) {
        abort(4, 'API制限/出力制限でバッチ失敗が連続5件', -1, q.id, `連続バッチ失敗 5件に達した`);
        return { id: q.id, error: reason };
      }
      if (attempt < 3) {
        log(`[RETRY] バッチ再試行 (試行 ${attempt + 1}/3): ${q.id}  理由: ${reason}`);
        await sleep(2000);
        continue;
      }
      log(`[FAIL] バッチ失敗 (3/3): ${q.id}  → rejected.json に追記`);
      appendRejected({ id: q.id, reason });
      return { id: q.id, error: reason };
    }

    // パース成功 → consecutiveParseErrors をリセット
    consecutiveParseErrors = 0;

    // 単一オブジェクトを配列にラップ
    if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') {
      parsed = [parsed];
    }

    const validation = validateAuditResponse(parsed, 1);
    if (!validation.ok) {
      consecutiveBatchFails++;
      if (consecutiveBatchFails >= 5) {
        abort(4, 'API制限/出力制限でバッチ失敗が連続5件', -1, q.id, `連続バッチ失敗 5件に達した`);
        return { id: q.id, error: validation.reason };
      }
      const reason = `validation failed: ${validation.reason}`;
      if (attempt < 3) {
        log(`[RETRY] バッチ再試行 (試行 ${attempt + 1}/3): ${q.id}  理由: ${reason}`);
        await sleep(2000);
        continue;
      }
      log(`[FAIL] バッチ失敗 (3/3): ${q.id}  → rejected.json に追記`);
      appendRejected({ id: q.id, reason });
      return { id: q.id, error: reason };
    }

    // 中断条件5: questionId と送信 qid の一致確認
    const returnedId = validation.data[0].questionId;
    if (returnedId !== q.id) {
      abort(5, 'questionIdと出力結果の対応が崩れる', -1, q.id, `送信 qid=${q.id}, 返却 questionId=${returnedId}`);
      return { id: q.id, error: 'questionId mismatch (abort triggered)' };
    }

    const entry = validation.data[0];
    const overall = computeOverall(entry.review);
    const recommendedAction = computeRecommendedAction(overall, entry.review);
    const priority = computePriority(overall, entry.review);

    // バッチ成功 → カウンタをリセット
    consecutiveBatchFails = 0;

    const finalEntry = {
      ...entry,
      overall,
      recommendedAction,
      priority,
    };

    // 中断条件2: explanation 存在なのに「解説なし」判定の検出
    const eq = finalEntry.review?.explanation_quality;
    if (eq && (eq.status === 'FAIL' || eq.status === 'WARN')) {
      const noExplPatterns = ['解説がない', '解説なし', 'no explanation'];
      const hasNoExplReason = noExplPatterns.some(p => (eq.reason || '').includes(p));
      if (hasNoExplReason) {
        const orig = targetQuestionsMap[q.id];
        if (orig && orig.explanation && orig.explanation.trim() !== '') {
          abort(2, 'explanationが存在するのに「解説なし」と判定する事象が再発', -1, q.id,
            `questionId=${q.id}, reason="${eq.reason}", explanation前半="${orig.explanation.slice(0,80)}"`);
          return { id: q.id, error: 'explanation false negative (abort triggered)' };
        }
      }
    }

    // 中断条件3: 10問以上連続で全項目PASSかつ理由が薄い
    const allPass = REVIEW_ITEMS.every(item => finalEntry.review?.[item]?.status === 'PASS');
    if (allPass) {
      const reasons = REVIEW_ITEMS.map(item => finalEntry.review?.[item]?.reason || '');
      const avgLen = reasons.reduce((sum, r) => sum + r.length, 0) / reasons.length;
      if (avgLen < 15) {
        consecutiveAllPassThin++;
        if (consecutiveAllPassThin >= 10) {
          abort(3, '10問以上連続で全項目PASSかつ理由が薄い', -1, q.id,
            `連続全PASS+薄い理由 10件に達した。直近 questionId=${q.id}`);
          return { id: q.id, error: 'all pass thin (abort triggered)' };
        }
      } else {
        consecutiveAllPassThin = 0;
      }
    } else {
      consecutiveAllPassThin = 0;
    }

    // raw レスポンスを記録
    rawResponses.push({
      questionId: q.id,
      rawText: answerText.slice(0, 2000),
    });

    log(`[OK] バッチ成功: ${q.id}`);
    return finalEntry;
  }

  return { id: q.id, error: 'unknown error' };
}

// ============================================================
// Markdown サマリ生成（full 版）
// ============================================================
function generateFullSummary(results, allQuestionsMap, totalCount) {
  const today = new Date().toISOString().split('T')[0];
  const successResults = results.filter(r => !r.error && !r._error);
  const failedCount = results.filter(r => r.error || r._error).length;

  // 集計
  const overallCounts = { PASS: 0, WARN: 0, FAIL: 0 };
  const actionCounts = { keep: 0, revise: 0, delete: 0, manual_review: 0 };
  const priorityCounts = { none: 0, low: 0, medium: 0, high: 0 };
  const itemCounts = {};
  for (const item of REVIEW_ITEMS) {
    itemCounts[item] = { PASS: 0, WARN: 0, FAIL: 0 };
  }

  for (const entry of successResults) {
    overallCounts[entry.overall] = (overallCounts[entry.overall] || 0) + 1;
    actionCounts[entry.recommendedAction] = (actionCounts[entry.recommendedAction] || 0) + 1;
    priorityCounts[entry.priority] = (priorityCounts[entry.priority] || 0) + 1;
    for (const item of REVIEW_ITEMS) {
      const status = entry.review?.[item]?.status;
      if (status) {
        itemCounts[item][status] = (itemCounts[item][status] || 0) + 1;
      }
    }
  }

  // 章ごとの情報を付与
  const getChapter = (qid) => {
    const m = qid && qid.match(/^(ch\d+)-/);
    return m ? m[1] : '';
  };

  let md = `# LLM 監査 本実施 レポート（0033-full）\n\n`;
  md += `実行日: ${today}\n`;
  md += `対象問題数: ${totalCount}（処理成功: ${successResults.length} / 失敗: ${failedCount}）\n\n`;

  md += `## 全体サマリ\n\n`;
  md += `| 項目 | 件数 |\n|---|---|\n`;
  md += `| overall PASS | ${overallCounts.PASS} |\n`;
  md += `| overall WARN | ${overallCounts.WARN} |\n`;
  md += `| overall FAIL | ${overallCounts.FAIL} |\n`;
  md += `| recommendedAction: keep | ${actionCounts.keep} |\n`;
  md += `| recommendedAction: revise | ${actionCounts.revise} |\n`;
  md += `| recommendedAction: delete | ${actionCounts.delete} |\n`;
  md += `| recommendedAction: manual_review | ${actionCounts.manual_review} |\n`;
  md += `| priority none | ${priorityCounts.none} |\n`;
  md += `| priority low | ${priorityCounts.low} |\n`;
  md += `| priority medium | ${priorityCounts.medium} |\n`;
  md += `| priority high | ${priorityCounts.high} |\n`;
  md += '\n';

  md += `## 審査項目別集計（11 項目）\n\n`;
  md += `| 項目 | PASS | WARN | FAIL |\n|---|---|---|---|\n`;
  for (const item of REVIEW_ITEMS) {
    md += `| ${item} | ${itemCounts[item].PASS || 0} | ${itemCounts[item].WARN || 0} | ${itemCounts[item].FAIL || 0} |\n`;
  }
  md += '\n';

  md += `## 修正候補リスト\n\n`;

  // priority ごとに整理
  const byPriority = { high: [], medium: [], low: [] };
  for (const entry of successResults) {
    if (entry.priority === 'high' || entry.priority === 'medium' || entry.priority === 'low') {
      const failWarnItems = REVIEW_ITEMS.filter(item =>
        entry.review?.[item]?.status === 'FAIL' || entry.review?.[item]?.status === 'WARN'
      ).map(item => `${item}(${entry.review[item].status})`);
      byPriority[entry.priority].push({
        questionId: entry.questionId,
        chapter: getChapter(entry.questionId),
        overall: entry.overall,
        failWarnItems: failWarnItems.join(', '),
        recommendedAction: entry.recommendedAction,
      });
    }
  }

  for (const prio of ['high', 'medium', 'low']) {
    md += `### ${prio} priority\n\n`;
    if (byPriority[prio].length === 0) {
      md += `（該当なし）\n\n`;
    } else {
      md += `| questionId | 章 | overall | FAIL/WARN 項目 | recommendedAction |\n|---|---|---|---|---|\n`;
      for (const item of byPriority[prio]) {
        md += `| ${item.questionId} | ${item.chapter} | ${item.overall} | ${item.failWarnItems} | ${item.recommendedAction} |\n`;
      }
      md += '\n';
    }
  }

  md += `## FAIL 問題一覧\n\n`;
  const failEntries = successResults.filter(e => e.overall === 'FAIL');
  if (failEntries.length === 0) {
    md += `（該当なし）\n\n`;
  } else {
    md += `| questionId | 章 | overall | FAIL 項目 | Felo 理由（抜粋） | recommendedAction | priority |\n|---|---|---|---|---|---|---|\n`;
    for (const entry of failEntries) {
      const failItems = REVIEW_ITEMS.filter(item => entry.review?.[item]?.status === 'FAIL');
      const reasons = failItems.map(item => entry.review[item].reason.slice(0, 40)).join(' / ');
      md += `| ${entry.questionId} | ${getChapter(entry.questionId)} | ${entry.overall} | ${failItems.join(', ')} | ${reasons} | ${entry.recommendedAction} | ${entry.priority} |\n`;
    }
    md += '\n';
  }

  md += `## WARN 問題一覧\n\n`;
  const warnEntries = successResults.filter(e => e.overall === 'WARN');
  if (warnEntries.length === 0) {
    md += `（該当なし）\n\n`;
  } else {
    md += `| questionId | WARN 項目 | 理由（抜粋） | recommendedAction | priority |\n|---|---|---|---|---|\n`;
    for (const entry of warnEntries) {
      const warnItems = REVIEW_ITEMS.filter(item => entry.review?.[item]?.status === 'WARN');
      const reasons = warnItems.map(item => entry.review[item].reason.slice(0, 40)).join(' / ');
      md += `| ${entry.questionId} | ${warnItems.join(', ')} | ${reasons} | ${entry.recommendedAction} | ${entry.priority} |\n`;
    }
    md += '\n';
  }

  return md;
}

// ============================================================
// 比較レポート生成
// ============================================================
function generateComparisonReport(llmResults) {
  const today = new Date().toISOString().split('T')[0];

  let heuristicData = [];
  let heuristicAvail = false;
  try {
    heuristicData = JSON.parse(readFileSync(heuristicResultsPath, 'utf-8'));
    heuristicAvail = true;
  } catch (_) {
    heuristicAvail = false;
  }

  if (!heuristicAvail) {
    return `# LLM 監査 vs ヒューリスティック 比較レポート\n\n実行日: ${today}\n\nヒューリスティック audit 結果が見つかりませんでした: ${heuristicResultsPath}\n`;
  }

  // ヒューリスティック結果をマップに変換
  const hMap = {};
  for (const h of heuristicData) {
    hMap[h.id] = h;
  }

  // LLM 結果をマップに変換
  const llmMap = {};
  for (const l of llmResults) {
    if (!l.error && !l._error) {
      llmMap[l.questionId] = l;
    }
  }

  // 集計
  const bothPass = [];
  const hWarnFeloPass = [];
  const hPassFeloWarnFail = [];
  const bothProblematic = [];

  const hPassCount = heuristicData.filter(h => h.status === 'PASS').length;
  const hWarnCount = heuristicData.filter(h => h.status === 'WARN').length;
  const llmSuccessResults = llmResults.filter(r => !r.error && !r._error);
  const llmPassCount = llmSuccessResults.filter(r => r.overall === 'PASS').length;
  const llmWarnCount = llmSuccessResults.filter(r => r.overall === 'WARN').length;
  const llmFailCount = llmSuccessResults.filter(r => r.overall === 'FAIL').length;

  for (const qid of Object.keys(llmMap)) {
    const h = hMap[qid];
    const l = llmMap[qid];
    if (!h) continue;

    const hStatus = h.status; // PASS or WARN
    const lOverall = l.overall; // PASS, WARN, or FAIL

    if (hStatus === 'PASS' && lOverall === 'PASS') {
      bothPass.push({ questionId: qid });
    } else if (hStatus === 'WARN' && lOverall === 'PASS') {
      const hReasons = Array.isArray(h.reasons) ? h.reasons.join(', ') : '';
      hWarnFeloPass.push({ questionId: qid, hReason: hReasons, lReason: 'PASS' });
    } else if (hStatus === 'PASS' && (lOverall === 'WARN' || lOverall === 'FAIL')) {
      const failWarnItems = REVIEW_ITEMS.filter(item =>
        l.review?.[item]?.status === 'FAIL' || l.review?.[item]?.status === 'WARN'
      );
      const lReason = failWarnItems.map(item => `${item}(${l.review[item].status}): ${l.review[item].reason.slice(0,40)}`).join('; ');
      hPassFeloWarnFail.push({ questionId: qid, lOverall, lReason });
    } else if (hStatus === 'WARN' && (lOverall === 'WARN' || lOverall === 'FAIL')) {
      bothProblematic.push({ questionId: qid, hStatus, lOverall });
    }
  }

  let md = `# LLM 監査 vs ヒューリスティック 比較レポート\n\n`;
  md += `実行日: ${today}\n`;
  md += `ヒューリスティック audit: .harness/runs/0031-audit/audit-results.json（PASS ${hPassCount} / WARN ${hWarnCount} / FAIL 0）\n`;
  md += `LLM 監査: .harness/runs/0033-full/audit-llm-results.json（PASS ${llmPassCount} / WARN ${llmWarnCount} / FAIL ${llmFailCount}）\n\n`;

  md += `## 概況\n\n`;
  md += `| 比較カテゴリ | 件数 |\n|---|---|\n`;
  md += `| 両方 PASS | ${bothPass.length} |\n`;
  md += `| heuristic WARN かつ Felo PASS | ${hWarnFeloPass.length} |\n`;
  md += `| heuristic PASS かつ Felo WARN/FAIL | ${hPassFeloWarnFail.length} |\n`;
  md += `| 両方で問題あり（heuristic WARN かつ Felo WARN/FAIL） | ${bothProblematic.length} |\n\n`;

  md += `## heuristic WARN → Felo PASS（代表例 5 件）\n\n`;
  if (hWarnFeloPass.length === 0) {
    md += `（該当なし）\n\n`;
  } else {
    const samples = hWarnFeloPass.slice(0, 5);
    md += `| questionId | heuristic WARN 理由 | Felo PASS 判定 |\n|---|---|---|\n`;
    for (const item of samples) {
      md += `| ${item.questionId} | ${item.hReason} | PASS |\n`;
    }
    md += '\n';
  }

  md += `## heuristic PASS → Felo WARN/FAIL（代表例 5 件）\n\n`;
  if (hPassFeloWarnFail.length === 0) {
    md += `（該当なし）\n\n`;
  } else {
    const samples = hPassFeloWarnFail.slice(0, 5);
    md += `| questionId | Felo WARN/FAIL 項目 | Felo 理由 |\n|---|---|---|\n`;
    for (const item of samples) {
      md += `| ${item.questionId} | ${item.lOverall} | ${item.lReason.slice(0, 80)} |\n`;
    }
    md += '\n';
  }

  md += `## 両方で問題あり\n\n`;
  if (bothProblematic.length === 0) {
    md += `（該当なし）\n\n`;
  } else {
    md += `件数: ${bothProblematic.length}\n\n`;
    md += `| questionId | heuristic | Felo |\n|---|---|---|\n`;
    for (const item of bothProblematic) {
      md += `| ${item.questionId} | ${item.hStatus} | ${item.lOverall} |\n`;
    }
    md += '\n';
  }

  md += `## 乖離が大きい代表例\n\n`;
  const divergent = hPassFeloWarnFail.filter(i => i.lOverall === 'FAIL').slice(0, 5);
  if (divergent.length === 0) {
    // WARN から代表を取る
    const divergentWarn = hPassFeloWarnFail.slice(0, 3);
    if (divergentWarn.length === 0) {
      md += `（乖離が大きい例なし）\n\n`;
    } else {
      for (const item of divergentWarn) {
        const l = llmMap[item.questionId];
        md += `### ${item.questionId} (heuristic: PASS → Felo: ${item.lOverall})\n\n`;
        const failWarnItems = REVIEW_ITEMS.filter(x => l.review?.[x]?.status === 'FAIL' || l.review?.[x]?.status === 'WARN');
        for (const fi of failWarnItems) {
          md += `- **${fi}** (${l.review[fi].status}): ${l.review[fi].reason}\n`;
        }
        md += '\n';
      }
    }
  } else {
    for (const item of divergent) {
      const l = llmMap[item.questionId];
      md += `### ${item.questionId} (heuristic: PASS → Felo: FAIL)\n\n`;
      const failItems = REVIEW_ITEMS.filter(x => l.review?.[x]?.status === 'FAIL');
      for (const fi of failItems) {
        md += `- **${fi}** (FAIL): ${l.review[fi].reason}\n`;
      }
      md += '\n';
    }
  }

  return md;
}

// ============================================================
// メイン処理
// ============================================================

// 出力ディレクトリを作成
mkdirSync(outputDir, { recursive: true });

// ログファイルを初期化（既存があれば上書き）
writeFileSync(logPath, '', 'utf-8');

// 問題データ読み込み
const chapterData = loadAllChapters();

// 中断条件6: 起動時に全章のバイト数スナップショットを取得
const chapterByteSnapshot = getChapterByteSnapshot();

// 全問題マップを構築（中断条件2で使用）
const targetQuestionsMap = {};
for (const ch of CHAPTERS) {
  for (const q of chapterData[ch]) {
    targetQuestionsMap[q.id] = q;
  }
}

// 処理対象の問題を特定
let targetQids = [];
if (useAll) {
  // 全 8 章から ID を収集
  for (const ch of CHAPTERS) {
    for (const q of chapterData[ch]) {
      targetQids.push(q.id);
    }
  }
  log(`[INFO] --all フラグ: 全 ${targetQids.length} 問を対象に設定`);
} else {
  targetQids = qidsArg.split(',').map(s => s.trim()).filter(Boolean);
}

if (targetQids.length === 0) {
  process.stderr.write('エラー: 有効な qid が指定されていません。\n');
  process.exit(1);
}

const targetQuestions = [];
const allQuestionsMap = {};

for (const qid of targetQids) {
  let found = null;
  for (const ch of CHAPTERS) {
    const q = chapterData[ch].find(q => q.id === qid);
    if (q) {
      found = { ...q, _chapter: ch };
      break;
    }
  }
  if (!found) {
    process.stderr.write(`エラー: id "${qid}" の問題が見つかりません。\n`);
    process.exit(1);
  }
  targetQuestions.push(found);
  allQuestionsMap[qid] = found;
}

// dry-run の場合: プロンプトのみ出力して終了
if (dryRun) {
  process.stderr.write(`[dry-run] ${targetQuestions.length} 問のプロンプトを出力します。\n`);

  // 2 問ずつバッチでプロンプト出力
  for (let i = 0; i < targetQuestions.length; i += 2) {
    const batch = targetQuestions.slice(i, i + 2);
    const promptObj = buildAuditPrompt(batch);
    const ids = batch.map(q => q.id).join(', ');
    const reqLabel = batch.length === 2 ? '2問/req' : '1問/req';
    process.stdout.write(`=== [dry-run] ${ids} (${reqLabel}, ${promptObj.level}) ===\n`);
    process.stdout.write(promptObj.prompt);
    process.stdout.write('\n\n');
  }
  process.exit(0);
}

// raw レスポンス収集配列
const rawResponses = [];

// バッチ処理ループ
const allResults = [];
let successCount = 0;
let failCount = 0;
let batchIndex = 0;
let lastProcessedQid = '';

for (let i = 0; i < targetQuestions.length; i += 2) {
  // 中断フラグのチェック
  if (abortTriggered) {
    // 中断発生 → 処理済み件数でabortedを再記録
    abort(
      parseInt((existsSync(abortedPath) ? readFileSync(abortedPath,'utf-8').match(/中断条件: 条件(\d+)/)?.[1] : '0') || '0'),
      '（再記録）',
      allResults.length,
      lastProcessedQid,
      '中断フラグ検出により処理を停止'
    );
    break;
  }

  // 中断条件6: バッチ前にバイト数チェック
  const byteCheck = checkChapterBytesUnchanged(chapterByteSnapshot);
  if (byteCheck.changed) {
    abort(6, '監査対象問題データが変更される', allResults.length, lastProcessedQid,
      `${byteCheck.chapter}.json のバイト数が変化: ${byteCheck.expected} → ${byteCheck.actual}`);
    break;
  }

  const batch = targetQuestions.slice(i, i + 2);

  // 2 バッチ目以降は 1 秒スリープ
  if (batchIndex > 0) {
    await sleep(1000);
  }
  batchIndex++;

  const results = await processBatch(batch);

  for (const result of results) {
    if (result._aborted) {
      // abort が発火したエントリは以降の処理をスキップ
      failCount++;
      allResults.push({
        questionId: result.questionId || result.id,
        overall: 'FAIL',
        review: REVIEW_ITEMS.reduce((acc, item) => {
          acc[item] = { status: 'FAIL', reason: `審査スキップ（中断: ${result._error || 'abort triggered'}）` };
          return acc;
        }, {}),
        recommendedAction: 'manual_review',
        priority: 'high',
        _error: 'abort triggered',
      });
    } else if (result.error) {
      failCount++;
      allResults.push({
        questionId: result.questionId || result.id,
        overall: 'FAIL',
        review: REVIEW_ITEMS.reduce((acc, item) => {
          acc[item] = { status: 'FAIL', reason: `審査スキップ（エラー: ${result.error}）` };
          return acc;
        }, {}),
        recommendedAction: 'manual_review',
        priority: 'high',
        _error: result.error,
      });
    } else {
      successCount++;
      allResults.push(result);
      lastProcessedQid = result.questionId || '';
    }
  }

  // 中断発火後の保存
  if (abortTriggered) {
    break;
  }
}

if (abortTriggered) {
  // 中断時でも処理済み分を保存
  writeFileSync(resultsPath, JSON.stringify(allResults, null, 2), 'utf-8');
  writeFileSync(rawPath, JSON.stringify(rawResponses, null, 2), 'utf-8');
  log(`[ABORT] 処理を中断しました。処理済み: ${allResults.length} / ${targetQuestions.length}`);
  process.exit(1);
}

log(`[DONE] 全バッチ完了。成功: ${successCount}件, 失敗: ${failCount}件`);

// 結果を JSON として書き出し
writeFileSync(resultsPath, JSON.stringify(allResults, null, 2), 'utf-8');
process.stdout.write(`\n監査結果を出力しました: ${resultsPath}\n`);

// raw レスポンスを保存
writeFileSync(rawPath, JSON.stringify(rawResponses, null, 2), 'utf-8');
process.stdout.write(`raw レスポンスを出力しました: ${rawPath}\n`);

// Markdown サマリ生成（full 版）
const summaryMd = generateFullSummary(allResults, allQuestionsMap, targetQuestions.length);
writeFileSync(summaryPath, summaryMd, 'utf-8');
process.stdout.write(`サマリを出力しました: ${summaryPath}\n`);

// 比較レポート生成
const comparisonMd = generateComparisonReport(allResults);
writeFileSync(comparisonPath, comparisonMd, 'utf-8');
process.stdout.write(`比較レポートを出力しました: ${comparisonPath}\n`);

process.exit(0);
