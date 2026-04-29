#!/usr/bin/env node
/**
 * felo-rewrite-question.mjs
 * 用語定義型（definition_type=WARN）問題を understand / compare / apply 型にリライトするスクリプト
 *
 * 使用方法:
 *   node --env-file=.env scripts/felo-rewrite-question.mjs --qid <id> [--dry-run] [--write]
 *   node --env-file=.env scripts/felo-rewrite-question.mjs --qids <id1,id2,...> [--dry-run] [--write]
 *
 * 環境変数:
 *   FELO_API_KEY: Felo API キー（.env ファイルに設定）--dry-run 時は不要
 */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs';
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
const writeFlag = args.includes('--write');

const qidArgIdx = args.indexOf('--qid');
const qidArg = (qidArgIdx !== -1 && qidArgIdx + 1 < args.length) ? args[qidArgIdx + 1] : null;

const qidsArgIdx = args.indexOf('--qids');
const qidsArg = (qidsArgIdx !== -1 && qidsArgIdx + 1 < args.length) ? args[qidsArgIdx + 1] : null;

// --qid / --qids のいずれも未指定で exit 1
if (qidArg === null && qidsArg === null) {
  process.stderr.write('エラー: --qid <id> または --qids <id1,id2,...> が必要です。\n');
  process.stderr.write('使用方法: node scripts/felo-rewrite-question.mjs --qid <id> [--dry-run] [--write]\n');
  process.stderr.write('         node scripts/felo-rewrite-question.mjs --qids <id1,id2,...> [--dry-run] [--write]\n');
  process.exit(1);
}

// 処理対象 qid リストを決定
let targetQids = [];
if (qidArg !== null) {
  targetQids = [qidArg];
} else if (qidsArg !== null) {
  targetQids = qidsArg.split(',').map(s => s.trim()).filter(Boolean);
}

if (targetQids.length === 0) {
  process.stderr.write('エラー: 有効な qid が指定されていません。\n');
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
const backupDir = join(projectRoot, '../.harness/runs/0032b-pilot-backup');
const rejectedPath = join(projectRoot, '../.harness/runs/0032b-pilot-rejected.json');
const diffPath = join(projectRoot, '../.harness/runs/0032b-pilot-diff.md');

// 定義型判定パターン
const DEFINITION_PATTERN = /[^\s]{1,20}(とは|とはなにか|とは何か|の説明として正しい|の定義として正しい|について正しく説明している)/;

// ============================================================
// ユーティリティ
// ============================================================
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
  // 1. コードブロック形式を試す
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) {
    try {
      return JSON.parse(match[1].trim());
    } catch (_) {}
  }
  // 2. テキスト全体が JSON オブジェクトの場合を試す
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      return JSON.parse(trimmed);
    } catch (_) {}
  }
  // 3. テキスト内の最初の { から最後の } までを抽出して試す
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && start < end) {
    try {
      return JSON.parse(text.substring(start, end + 1));
    } catch (_) {}
  }
  return null;
}

// ============================================================
// 問題データ読み込み
// ============================================================
function loadChapter(chName) {
  const p = join(projectRoot, 'src/data/questions', `${chName}.json`);
  const raw = readFileSync(p, 'utf-8');
  return JSON.parse(raw);
}

function loadAllChapters() {
  const map = {};
  for (const ch of CHAPTERS) {
    map[ch] = loadChapter(ch);
  }
  return map;
}

// ============================================================
// 三重ガード: 不変フィールドを凍結
// ============================================================
const IMMUTABLE_FIELDS = ['id', 'categoryId', 'tags', 'difficulty', 'relatedTermIds', 'source_ref', 'source_ref_supplements'];

function freezeImmutableFields(q) {
  const frozen = {};
  for (const f of IMMUTABLE_FIELDS) {
    frozen[f] = JSON.stringify(q[f]);
  }
  return Object.freeze(frozen);
}

// ガード 2: 書き込み直前に不変フィールドの一致を確認
function assertImmutableFields(original, frozenSnapshot) {
  for (const f of IMMUTABLE_FIELDS) {
    const origVal = JSON.stringify(original[f]);
    const frozenVal = frozenSnapshot[f];
    if (origVal !== frozenVal) {
      process.stderr.write(`不変フィールドの改変が検出されました: ${original.id} フィールド: ${f}\n`);
      process.exit(1);
    }
  }
}

// ガード 3: 書き込み後の再検証
function verifyWrittenFile(chName, frozenSnapshots) {
  const p = join(projectRoot, 'src/data/questions', `${chName}.json`);
  const written = JSON.parse(readFileSync(p, 'utf-8'));
  let diffs = 0;
  for (const q of written) {
    const snapshot = frozenSnapshots.get(q.id);
    if (!snapshot) continue;
    for (const f of IMMUTABLE_FIELDS) {
      if (JSON.stringify(q[f]) !== snapshot[f]) {
        process.stderr.write(`[ガード3] 書き込み後に不変フィールドの差異を検出: ${q.id} フィールド: ${f}\n`);
        diffs++;
      }
    }
  }
  return diffs;
}

// ============================================================
// Felo プロンプト構築
// ============================================================
function buildRewritePrompt(q) {
  const inputData = {
    id: q.id,
    categoryId: q.categoryId,
    question: q.question,
    choices: q.choices,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
    cognitiveLevel: q.cognitiveLevel,
    learningObjective: q.learningObjective,
    misconceptionTarget: q.misconceptionTarget,
    optionRationales: q.optionRationales,
    tags: q.tags,
    source_ref: q.source_ref,
  };

  const prompt = `あなたは G検定対策の問題品質改善者です。
以下の問題は「用語定義型（とは何か型）」と判定されました。
この問題を、定義の暗記だけでなく概念の理解・比較・適用を問う形にリライトしてください。

現在の問題データ:
\`\`\`json
${JSON.stringify(inputData, null, 2)}
\`\`\`

リライト要件:
1. question: 「〜とは何か」「〜の説明として正しい」などの定義想起パターンを使わないこと
2. cognitiveLevel: "understand" / "compare" / "apply" のいずれかに変更（"recall" は禁止）
3. choices: 選択肢は正解 1 つ + 誤答 3 つで、各誤答は実際に混同されやすい内容にすること。フィラー（「〜という技術」「〜という学習アプローチ」のような意味のない付け足し）を含めないこと
4. correctIndex: 変更後 choices の正解インデックス（0-3）
5. explanation: 正答理由と主要誤答の否定理由を両方含むこと（40 字以上）
6. learningObjective: リライト後の問いに合わせて 30〜200 字で記述。フィラー禁止
7. misconceptionTarget: リライト後の誤答が狙う誤解パターン（20〜80 字）
8. optionRationales: choices と同数の配列。正解は「正解。〜だから」、誤答は「誤り。〜と混同している」または「誤り。〜が正しい」（各要素 30〜80 字）
9. qualityFlags: ["rewritten_in_0032b_pilot"] を設定

変更禁止フィールド（出力に含めないか、入力と同値にすること）:
id, categoryId, tags, difficulty, relatedTermIds, source_ref, source_ref_supplements

出力フォーマット（このフォーマット以外で出力しないこと）:
\`\`\`json
{
  "id": "...",
  "question": "...",
  "choices": [{"text": "..."}, {"text": "..."}, {"text": "..."}, {"text": "..."}],
  "correctIndex": 0,
  "explanation": "...",
  "cognitiveLevel": "understand|compare|apply",
  "learningObjective": "...",
  "misconceptionTarget": "...",
  "optionRationales": ["...", "...", "...", "..."],
  "qualityFlags": ["rewritten_in_0032b_pilot"]
}
\`\`\``;

  return prompt;
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
  const dir = rejectedPath.substring(0, rejectedPath.lastIndexOf('/'));
  mkdirSync(dir, { recursive: true });
  writeFileSync(rejectedPath, JSON.stringify(existing, null, 2), 'utf-8');
}

// ============================================================
// レスポンス検証
// ============================================================
function validateRewriteResult(parsed, q) {
  // id 一致チェック
  if (parsed.id !== q.id) {
    return { ok: false, reason: `id mismatch: got "${parsed.id}"` };
  }

  // cognitiveLevel チェック（recall 禁止）
  const validLevels = ['understand', 'apply', 'compare'];
  if (!validLevels.includes(parsed.cognitiveLevel)) {
    return { ok: false, reason: `invalid cognitiveLevel: "${parsed.cognitiveLevel}" (must be understand/apply/compare)` };
  }

  // choices 長さチェック
  if (!Array.isArray(parsed.choices) || parsed.choices.length !== 4) {
    return { ok: false, reason: `choices length invalid: ${Array.isArray(parsed.choices) ? parsed.choices.length : 'non-array'}` };
  }

  // correctIndex チェック
  if (typeof parsed.correctIndex !== 'number' || parsed.correctIndex < 0 || parsed.correctIndex > 3) {
    return { ok: false, reason: `correctIndex invalid: ${parsed.correctIndex}` };
  }

  // explanation 長さチェック（40 字以上）
  if (typeof parsed.explanation !== 'string' || parsed.explanation.length < 40) {
    return { ok: false, reason: `explanation too short: ${parsed.explanation?.length ?? 0} chars (need >=40)` };
  }

  // learningObjective 文字数チェック（30〜200字）
  if (typeof parsed.learningObjective !== 'string' || parsed.learningObjective.length < 30 || parsed.learningObjective.length > 200) {
    const len = typeof parsed.learningObjective === 'string' ? parsed.learningObjective.length : 0;
    return { ok: false, reason: `learningObjective length invalid: ${len} chars (need 30-200)` };
  }

  // misconceptionTarget チェック（20〜80 字）
  if (typeof parsed.misconceptionTarget !== 'string' || parsed.misconceptionTarget.length < 20 || parsed.misconceptionTarget.length > 80) {
    const len = typeof parsed.misconceptionTarget === 'string' ? parsed.misconceptionTarget.length : 0;
    return { ok: false, reason: `misconceptionTarget length invalid: ${len} chars (need 20-80)` };
  }

  // optionRationales 長さチェック
  if (!Array.isArray(parsed.optionRationales) || parsed.optionRationales.length !== 4) {
    return { ok: false, reason: `optionRationales length invalid: ${Array.isArray(parsed.optionRationales) ? parsed.optionRationales.length : 'non-array'}` };
  }

  // question が定義型パターンに一致しないこと
  if (DEFINITION_PATTERN.test(parsed.question)) {
    return { ok: false, reason: `question still matches definition_type pattern: "${parsed.question}"` };
  }

  // 選択肢文字数比チェック（V7: max/min <= 1.6）
  const choiceLengths = parsed.choices.map(c => (c.text || '').length);
  const minLen = Math.min(...choiceLengths);
  const maxLen = Math.max(...choiceLengths);
  if (minLen === 0 || maxLen / minLen > 1.6) {
    return { ok: false, reason: `choices length ratio too high: ${minLen === 0 ? 'minLen=0' : (maxLen/minLen).toFixed(2)} (V7 limit: 1.6)` };
  }

  // qualityFlags チェック
  if (!Array.isArray(parsed.qualityFlags) || !parsed.qualityFlags.includes('rewritten_in_0032b_pilot')) {
    return { ok: false, reason: `qualityFlags missing "rewritten_in_0032b_pilot"` };
  }

  return { ok: true };
}

// ============================================================
// 単問処理（リトライ付き、最大 3 回）
// ============================================================
async function processQuestion(q, qIndex, totalQuestions) {
  const prompt = buildRewritePrompt(q);

  if (dryRun) {
    process.stdout.write(`=== [dry-run] ${q.id} ===\n`);
    process.stdout.write(prompt);
    process.stdout.write('\n\n');
    return null;
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    let data;
    try {
      data = await feloChat(prompt);
    } catch (e) {
      process.stderr.write(`[${q.id}] attempt ${attempt}/3 API error: ${e.message}\n`);
      if (attempt < 3) {
        await sleep(2000);
        continue;
      }
      return { error: `API error after 3 attempts: ${e.message}` };
    }

    const answerText = extractAnswer(data).trim();
    const parsed = parseJsonBlock(answerText);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      process.stderr.write(`[${q.id}] attempt ${attempt}/3 JSON parse failed\n`);
      if (attempt < 3) {
        await sleep(2000);
        continue;
      }
      return { error: 'JSON parse failed after 3 attempts' };
    }

    // 検証
    const validation = validateRewriteResult(parsed, q);
    if (!validation.ok) {
      process.stderr.write(`[${q.id}] attempt ${attempt}/3 validation failed: ${validation.reason}\n`);
      if (attempt < 3) {
        await sleep(2000);
        continue;
      }
      return { error: `validation failed after 3 attempts: ${validation.reason}` };
    }

    // 成功
    process.stderr.write(`[${q.id}] (${qIndex}/${totalQuestions}) OK cognitiveLevel=${parsed.cognitiveLevel}\n`);
    return {
      id: parsed.id,
      question: parsed.question,
      choices: parsed.choices,
      correctIndex: parsed.correctIndex,
      explanation: parsed.explanation,
      cognitiveLevel: parsed.cognitiveLevel,
      learningObjective: parsed.learningObjective,
      misconceptionTarget: parsed.misconceptionTarget,
      optionRationales: parsed.optionRationales,
      qualityFlags: parsed.qualityFlags,
    };
  }

  return { error: 'unknown error' };
}

// ============================================================
// バックアップ作成（全 8 章）
// ============================================================
function createBackup() {
  mkdirSync(backupDir, { recursive: true });
  for (const ch of CHAPTERS) {
    const src = join(projectRoot, 'src/data/questions', `${ch}.json`);
    const dst = join(backupDir, `${ch}.json`);
    copyFileSync(src, dst);
  }
  process.stderr.write(`バックアップを作成しました: .harness/runs/0032b-pilot-backup/ (8 ファイル)\n`);
}

// ============================================================
// 比較表生成
// ============================================================
function generateDiffMarkdown(originalQuestions, rewrittenResults) {
  const today = new Date().toISOString().split('T')[0];
  let md = `# 0032b パイロット リライト比較表\n\n生成日: ${today}\n\n---\n\n`;

  const chapterTitles = {
    'ch1': 'AI基礎',
    'ch3': '機械学習',
    'ch5': 'DL要素技術',
    'ch7': '社会実装',
    'ch8': '法律・倫理',
  };

  let sectionNum = 1;
  for (const { original, rewritten } of rewrittenResults) {
    const ch = original.id.split('-')[0];
    const title = chapterTitles[ch] || ch;
    const defTypeResolved = !DEFINITION_PATTERN.test(rewritten.question) ? 'Yes' : 'No';

    md += `## ${sectionNum}. ${original.id}（${ch}: ${title}）\n\n`;
    md += `| 項目 | 内容 |\n|---|---|\n`;
    md += `| questionId | ${original.id} |\n`;
    md += `| 変更前 question | ${original.question} |\n`;
    md += `| 変更後 question | ${rewritten.question} |\n`;
    md += `| 変更前 cognitiveLevel | ${original.cognitiveLevel || '（未設定）'} |\n`;
    md += `| 変更後 cognitiveLevel | ${rewritten.cognitiveLevel} |\n`;
    md += `| definition_type 解消 | ${defTypeResolved} |\n`;
    md += `| リライト意図 | 定義型問いを${rewritten.cognitiveLevel}型へ変換。${rewritten.learningObjective} |\n`;
    md += `| 注意点・人間確認が必要な点 | 正答の事実正確性・選択肢バランスを目視確認すること |\n`;
    md += `\n`;

    // 変更前（フルテキスト）
    md += `### 変更前（フルテキスト）\n\n`;
    md += `**question**: ${original.question}\n\n`;
    md += `**choices**:\n`;
    (original.choices || []).forEach((c, i) => {
      const marker = i === original.correctIndex ? '(正解)' : '';
      md += `- [${i}] ${c.text} ${marker}\n`;
    });
    md += `\n**correctIndex**: ${original.correctIndex}\n\n`;
    md += `**explanation**: ${original.explanation}\n\n`;
    md += `**cognitiveLevel**: ${original.cognitiveLevel || '（未設定）'}\n\n`;
    md += `**learningObjective**: ${original.learningObjective || '（未設定）'}\n\n`;
    md += `**misconceptionTarget**: ${original.misconceptionTarget || '（未設定）'}\n\n`;
    md += `**optionRationales**:\n`;
    (original.optionRationales || []).forEach((r, i) => {
      md += `- [${i}] ${r}\n`;
    });
    md += `\n`;

    // 変更後（フルテキスト）
    md += `### 変更後（フルテキスト）\n\n`;
    md += `**question**: ${rewritten.question}\n\n`;
    md += `**choices**:\n`;
    (rewritten.choices || []).forEach((c, i) => {
      const marker = i === rewritten.correctIndex ? '(正解)' : '';
      md += `- [${i}] ${c.text} ${marker}\n`;
    });
    md += `\n**correctIndex**: ${rewritten.correctIndex}\n\n`;
    md += `**explanation**: ${rewritten.explanation}\n\n`;
    md += `**cognitiveLevel**: ${rewritten.cognitiveLevel}\n\n`;
    md += `**learningObjective**: ${rewritten.learningObjective}\n\n`;
    md += `**misconceptionTarget**: ${rewritten.misconceptionTarget}\n\n`;
    md += `**optionRationales**:\n`;
    (rewritten.optionRationales || []).forEach((r, i) => {
      md += `- [${i}] ${r}\n`;
    });
    md += `\n`;

    md += `---\n\n`;
    sectionNum++;
  }

  return md;
}

// ============================================================
// メイン処理
// ============================================================
const chapterData = loadAllChapters();

// 処理対象の問題を特定
const targetQuestions = [];
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
}

// dry-run の場合: プロンプトのみ出力して終了
if (dryRun) {
  process.stderr.write(`[dry-run] ${targetQuestions.length} 問のプロンプトを出力します。\n`);
  for (const q of targetQuestions) {
    const prompt = buildRewritePrompt(q);
    process.stdout.write(`=== [dry-run] ${q.id} ===\n`);
    process.stdout.write(prompt);
    process.stdout.write('\n\n');
  }
  process.exit(0);
}

// 各問の frozen フィールドを作成（三重ガード用）
const frozenByChapter = {};
for (const ch of CHAPTERS) {
  frozenByChapter[ch] = new Map();
  for (const q of chapterData[ch]) {
    frozenByChapter[ch].set(q.id, freezeImmutableFields(q));
  }
}

// --write 時: バックアップ作成
if (writeFlag) {
  createBackup();
}

// 単問処理ループ
const resultsByChapter = {};
for (const ch of CHAPTERS) {
  resultsByChapter[ch] = new Map(); // id -> rewritten data
}
const failedIds = [];
const originalsByQid = {};
const total = targetQuestions.length;

for (let i = 0; i < targetQuestions.length; i++) {
  const q = targetQuestions[i];

  // 2問目以降は 1 秒スリープ（1 秒ペーシング）
  if (i > 0) {
    await sleep(1000);
  }

  // 元データを保存（比較表用）
  originalsByQid[q.id] = q;

  const result = await processQuestion(q, i + 1, total);

  if (result === null) {
    // dry-run の場合はスキップ（ここには来ない）
    continue;
  }

  if (result.error) {
    process.stderr.write(`[rejected] ${q.id}: ${result.error}\n`);
    failedIds.push(q.id);
    appendRejected({ id: q.id, reason: result.error });
  } else {
    // ガード 2: 書き込み直前 assert
    assertImmutableFields(q, frozenByChapter[q._chapter].get(q.id));
    resultsByChapter[q._chapter].set(q.id, result);
  }
}

// --write 時: 各章のデータを書き戻す
if (writeFlag) {
  const processedChapters = new Set(targetQuestions.map(q => q._chapter));

  for (const ch of processedChapters) {
    const originalQuestions = chapterData[ch];
    const chResults = resultsByChapter[ch];

    if (chResults.size === 0) continue;

    // 書き戻しデータ構築
    const updatedQuestions = originalQuestions.map(q => {
      const rewritten = chResults.get(q.id);
      if (rewritten) {
        // ガード 2: 書き込み直前 assert（元データに対して）
        assertImmutableFields(q, frozenByChapter[ch].get(q.id));

        // 不変フィールドは元データから取り、書き換え対象フィールドは rewritten から取る
        return {
          ...q,
          question: rewritten.question,
          choices: rewritten.choices,
          correctIndex: rewritten.correctIndex,
          explanation: rewritten.explanation,
          cognitiveLevel: rewritten.cognitiveLevel,
          learningObjective: rewritten.learningObjective,
          misconceptionTarget: rewritten.misconceptionTarget,
          optionRationales: rewritten.optionRationales,
          qualityFlags: [
            ...((q.qualityFlags || []).filter(f => f !== 'rewritten_in_0032b_pilot')),
            ...rewritten.qualityFlags,
          ],
        };
      }
      return q;
    });

    // ファイル書き戻し
    const p = join(projectRoot, 'src/data/questions', `${ch}.json`);
    writeFileSync(p, JSON.stringify(updatedQuestions, null, 2) + '\n', 'utf-8');
    process.stderr.write(`${ch}.json を更新しました（${chResults.size} 問リライト）\n`);

    // ガード 3: 書き込み後の再検証
    const diffs = verifyWrittenFile(ch, frozenByChapter[ch]);
    if (diffs > 0) {
      process.stderr.write(`[ガード3] ${ch}.json で不変フィールドの差異を検出。バックアップから復元します。\n`);
      const backupSrc = join(backupDir, `${ch}.json`);
      copyFileSync(backupSrc, p);
      process.stderr.write(`[ガード3] ${ch}.json をバックアップから復元しました。\n`);
      process.exit(1);
    }
  }

  // 比較表生成
  const rewrittenResultsForDiff = [];
  for (const q of targetQuestions) {
    const rewritten = resultsByChapter[q._chapter].get(q.id);
    if (rewritten) {
      rewrittenResultsForDiff.push({ original: q, rewritten });
    }
  }

  if (rewrittenResultsForDiff.length > 0) {
    const diffMd = generateDiffMarkdown(targetQuestions, rewrittenResultsForDiff);
    const diffDir = diffPath.substring(0, diffPath.lastIndexOf('/'));
    mkdirSync(diffDir, { recursive: true });
    writeFileSync(diffPath, diffMd, 'utf-8');
    process.stderr.write(`比較表を生成しました: .harness/runs/0032b-pilot-diff.md\n`);
  }
} else {
  // --write なし: stdout にプレビュー出力
  const results = [];
  for (const ch of CHAPTERS) {
    for (const [id, rewritten] of resultsByChapter[ch]) {
      results.push(rewritten);
    }
  }
  const output = { results, failed: failedIds };
  process.stdout.write(JSON.stringify(output, null, 2));
  process.stdout.write('\n');
}

process.stderr.write(`完了: 成功 ${total - failedIds.length} 問 / 失敗 ${failedIds.length} 問\n`);
if (failedIds.length > 0) {
  process.stderr.write(`失敗問題: ${failedIds.join(', ')}\n`);
  process.stderr.write(`rejected ダンプ: .harness/runs/0032b-pilot-rejected.json\n`);
}

process.exit(0);
