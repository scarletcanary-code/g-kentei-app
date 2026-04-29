#!/usr/bin/env node
/**
 * felo-backfill-question-metadata.mjs
 * Felo API を使って既存問題に learningObjective / cognitiveLevel /
 * misconceptionTarget / optionRationales を付与するバックフィルスクリプト
 *
 * 使用方法:
 *   node --env-file=.env scripts/felo-backfill-question-metadata.mjs --all [--write] [--dry-run]
 *   node --env-file=.env scripts/felo-backfill-question-metadata.mjs --chapter ch3 [--write] [--dry-run]
 *   node --env-file=.env scripts/felo-backfill-question-metadata.mjs --qid ch1-001 [--write] [--dry-run]
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
const allFlag = args.includes('--all');
const dryRun = args.includes('--dry-run');
const writeFlag = args.includes('--write');
const fixShortFlag = args.includes('--fix-short'); // 30字未満の learningObjective のみ再処理

const chapterArgIdx = args.indexOf('--chapter');
const chapterArg = (chapterArgIdx !== -1 && chapterArgIdx + 1 < args.length) ? args[chapterArgIdx + 1] : null;

const qidArgIdx = args.indexOf('--qid');
const qidArg = (qidArgIdx !== -1 && qidArgIdx + 1 < args.length) ? args[qidArgIdx + 1] : null;

// --all / --chapter / --qid / --fix-short のいずれも未指定なら exit 1
if (!allFlag && chapterArg === null && qidArg === null && !fixShortFlag) {
  process.stderr.write('エラー: --all / --chapter <chN> / --qid <id> / --fix-short のいずれかが必要です。\n');
  process.stderr.write('使用方法: node scripts/felo-backfill-question-metadata.mjs --all [--write] [--dry-run]\n');
  process.stderr.write('         node scripts/felo-backfill-question-metadata.mjs --chapter ch3 [--write] [--dry-run]\n');
  process.stderr.write('         node scripts/felo-backfill-question-metadata.mjs --qid ch1-001 [--write] [--dry-run]\n');
  process.stderr.write('         node scripts/felo-backfill-question-metadata.mjs --fix-short [--write]\n');
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
const backupDir = join(projectRoot, '../.harness/runs/0032a-backup');
const rejectedPath = join(projectRoot, '../.harness/runs/0032a-rejected.json');

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
// 三重ガード: 読み込み時にテキストフィールドを凍結
// ============================================================
function freezeQuestion(q) {
  return Object.freeze({
    question: q.question,
    choices: Object.freeze(q.choices.map(c => Object.freeze({ text: c.text }))),
    correctIndex: q.correctIndex,
    explanation: q.explanation,
    source_ref: q.source_ref,
    relatedTermIds: q.relatedTermIds,
    tags: q.tags,
    difficulty: q.difficulty,
    categoryId: q.categoryId,
    id: q.id,
  });
}

// ============================================================
// 三重ガード: 書き込み直前の assert
// ============================================================
function assertImmutableFields(original, frozen) {
  const IMMUTABLE = ['id', 'categoryId', 'question', 'choices', 'correctIndex', 'explanation', 'source_ref', 'relatedTermIds', 'tags', 'difficulty'];
  for (const f of IMMUTABLE) {
    const origVal = JSON.stringify(frozen[f]);
    const currVal = JSON.stringify(original[f]);
    if (origVal !== currVal) {
      process.stderr.write(`不変フィールドの改変が検出されました: ${frozen.id} フィールド: ${f}\n`);
      process.exit(1);
    }
  }
}

// ============================================================
// 三重ガード: 書き込み後の再検証
// ============================================================
function verifyWrittenFile(chName, frozenMap) {
  const p = join(projectRoot, 'src/data/questions', `${chName}.json`);
  const written = JSON.parse(readFileSync(p, 'utf-8'));
  const IMMUTABLE = ['id', 'categoryId', 'question', 'choices', 'correctIndex', 'explanation', 'source_ref', 'relatedTermIds', 'tags', 'difficulty'];
  let diffs = 0;
  for (const q of written) {
    const frozen = frozenMap.get(q.id);
    if (!frozen) continue;
    for (const f of IMMUTABLE) {
      if (JSON.stringify(q[f]) !== JSON.stringify(frozen[f])) {
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
function buildPrompt(q) {
  // プロンプトが2000文字制限を超えないよう、まず full 版で試し、超える場合は explanation を省略
  const inputDataFull = {
    id: q.id,
    categoryId: q.categoryId,
    question: q.question,
    choices: q.choices,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
    source_ref: q.source_ref,
    tags: q.tags,
  };
  const inputDataShort = {
    id: q.id,
    categoryId: q.categoryId,
    question: q.question,
    choices: q.choices,
    correctIndex: q.correctIndex,
    source_ref: q.source_ref,
    tags: q.tags,
  };

  const specFull = `仕様:learningObjective=30〜80字(具体的理解目標),cognitiveLevel=recall/understand/apply/compare,misconceptionTarget=20〜80字(null可),optionRationales=choices数の配列(各20〜80字,正解:「正解。〜」誤:「誤り。〜」)
\`\`\`json
{"id":"...","learningObjective":"...","cognitiveLevel":"...","misconceptionTarget":"...","optionRationales":["..."]}
\`\`\``;

  const prefix = `G検定問題に4つのメタデータ付与:\n`;
  const fullPrompt = prefix + JSON.stringify(inputDataFull, null, 2) + '\n' + specFull;
  const shortPrompt = prefix + JSON.stringify(inputDataShort, null, 2) + '\n' + specFull;

  // 最小版データ（choices の text のみ、compact JSON）
  const inputDataMin = {
    id: q.id,
    question: q.question,
    choices: q.choices.map(c => c.text),
    correctIndex: q.correctIndex,
  };
  const minPrompt = prefix + JSON.stringify(inputDataMin) + '\n' + specFull;

  // 超最小版（choices を省略し正解インデックスのみ）
  const inputDataUltraMin = {
    id: q.id,
    question: q.question,
    answer: q.choices[q.correctIndex]?.text ?? '',
    correctIndex: q.correctIndex,
  };
  const ultraMinPrompt = prefix + JSON.stringify(inputDataUltraMin) + '\n' + specFull;

  // Felo API は UTF-8 バイト数 2000 制限。バイト数で 1950 以内に収まる最初のバージョンを返す
  function byteLen(s) { return Buffer.byteLength(s, 'utf8'); }

  if (byteLen(fullPrompt) <= 1950) {
    return fullPrompt;
  }
  if (byteLen(shortPrompt) <= 1950) {
    return shortPrompt;
  }
  if (byteLen(minPrompt) <= 1950) {
    return minPrompt;
  }
  // それでも超える場合は超最小版
  return ultraMinPrompt;
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
  writeFileSync(rejectedPath, JSON.stringify(existing, null, 2), 'utf-8');
}

// ============================================================
// 単問処理（リトライ付き、最大 3 回）
// ============================================================
async function processQuestion(q, qIndex, totalQuestions) {
  const prompt = buildPrompt(q);

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

    // id 一致チェック
    if (parsed.id !== q.id) {
      process.stderr.write(`[${q.id}] attempt ${attempt}/3 id mismatch: got "${parsed.id}"\n`);
      if (attempt < 3) {
        await sleep(2000);
        continue;
      }
      return { error: `id mismatch after 3 attempts: got "${parsed.id}"` };
    }

    // cognitiveLevel 値チェック
    const validLevels = ['recall', 'understand', 'apply', 'compare'];
    if (!validLevels.includes(parsed.cognitiveLevel)) {
      process.stderr.write(`[${q.id}] attempt ${attempt}/3 invalid cognitiveLevel: "${parsed.cognitiveLevel}"\n`);
      if (attempt < 3) {
        await sleep(2000);
        continue;
      }
      return { error: `invalid cognitiveLevel after 3 attempts: "${parsed.cognitiveLevel}"` };
    }

    // optionRationales 長さチェック
    if (!Array.isArray(parsed.optionRationales) || parsed.optionRationales.length !== q.choices.length) {
      process.stderr.write(`[${q.id}] attempt ${attempt}/3 optionRationales length mismatch: expected ${q.choices.length}, got ${Array.isArray(parsed.optionRationales) ? parsed.optionRationales.length : 'non-array'}\n`);
      if (attempt < 3) {
        await sleep(2000);
        continue;
      }
      return { error: `optionRationales length mismatch after 3 attempts` };
    }

    // learningObjective 文字数チェック（30〜200字）
    if (typeof parsed.learningObjective !== 'string' || parsed.learningObjective.length < 30 || parsed.learningObjective.length > 200) {
      const len = typeof parsed.learningObjective === 'string' ? parsed.learningObjective.length : 0;
      process.stderr.write(`[${q.id}] attempt ${attempt}/3 learningObjective length invalid: ${len} chars (need 30-200)\n`);
      if (attempt < 3) {
        await sleep(2000);
        continue;
      }
      return { error: `learningObjective length invalid after 3 attempts: ${len} chars` };
    }

    // 成功
    process.stderr.write(`[${q.id}] (${qIndex}/${totalQuestions}) OK cognitiveLevel=${parsed.cognitiveLevel}\n`);
    return {
      id: parsed.id,
      learningObjective: parsed.learningObjective,
      cognitiveLevel: parsed.cognitiveLevel,
      misconceptionTarget: parsed.misconceptionTarget ?? null,
      optionRationales: parsed.optionRationales,
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
  process.stderr.write(`バックアップを作成しました: .harness/runs/0032a-backup/ (8 ファイル)\n`);
}

// ============================================================
// メイン処理
// ============================================================

// 処理対象の問題を決定
const chapterData = loadAllChapters();

let targetQuestions = [];
if (fixShortFlag) {
  // --fix-short: learningObjective が 30字未満の問題のみを対象にする
  for (const ch of CHAPTERS) {
    for (const q of chapterData[ch]) {
      if (!q.learningObjective || q.learningObjective.length < 30) {
        targetQuestions.push({ ...q, _chapter: ch });
      }
    }
  }
  process.stderr.write(`[fix-short] learningObjective が 30字未満の問題: ${targetQuestions.length} 問\n`);
} else if (allFlag) {
  for (const ch of CHAPTERS) {
    for (const q of chapterData[ch]) {
      targetQuestions.push({ ...q, _chapter: ch });
    }
  }
} else if (chapterArg !== null) {
  if (!CHAPTERS.includes(chapterArg)) {
    process.stderr.write(`エラー: 不正なチャプター名: "${chapterArg}"。ch1〜ch8 のいずれかを指定してください。\n`);
    process.exit(1);
  }
  for (const q of chapterData[chapterArg]) {
    targetQuestions.push({ ...q, _chapter: chapterArg });
  }
} else if (qidArg !== null) {
  let found = null;
  for (const ch of CHAPTERS) {
    const q = chapterData[ch].find(q => q.id === qidArg);
    if (q) {
      found = { ...q, _chapter: ch };
      break;
    }
  }
  if (!found) {
    process.stderr.write(`エラー: id "${qidArg}" の問題が見つかりません。\n`);
    process.exit(1);
  }
  targetQuestions.push(found);
}

// dry-run の場合: プロンプトのみ出力して終了
if (dryRun) {
  process.stderr.write(`[dry-run] ${targetQuestions.length} 問のプロンプトを出力します。\n`);
  for (const q of targetQuestions) {
    const prompt = buildPrompt(q);
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
    frozenByChapter[ch].set(q.id, freezeQuestion(q));
  }
}

// --write 時: バックアップ作成
if (writeFlag) {
  createBackup();
}

// 単問処理ループ
const resultsByChapter = {};
for (const ch of CHAPTERS) {
  resultsByChapter[ch] = new Map(); // id -> metadata
}
const failedIds = [];
const total = targetQuestions.length;

for (let i = 0; i < targetQuestions.length; i++) {
  const q = targetQuestions[i];

  // 2問目以降は 1 秒スリープ
  if (i > 0) {
    await sleep(1000);
  }

  const result = await processQuestion(q, i + 1, total);

  if (result === null) {
    // dry-run の場合はスキップ
    continue;
  }

  if (result.error) {
    process.stderr.write(`[rejected] ${q.id}: ${result.error}\n`);
    failedIds.push(q.id);
    appendRejected({ id: q.id, reason: result.error });
  } else {
    // ガード 2: 書き込み直前 assert（frozen フィールドと現在データの一致確認）
    assertImmutableFields(q, frozenByChapter[q._chapter].get(q.id));
    resultsByChapter[q._chapter].set(q.id, result);
  }
}

// --write 時: 各章のデータを書き戻す
if (writeFlag) {
  // 処理した章を特定
  const processedChapters = new Set(targetQuestions.map(q => q._chapter));

  for (const ch of processedChapters) {
    const originalQuestions = chapterData[ch];
    const chResults = resultsByChapter[ch];

    if (chResults.size === 0) continue;

    // 書き戻しデータ構築（既存フィールドにメタデータを追加）
    const updatedQuestions = originalQuestions.map(q => {
      const meta = chResults.get(q.id);
      if (meta) {
        // ガード 2: 書き込み直前 assert
        assertImmutableFields(q, frozenByChapter[ch].get(q.id));
        return {
          ...q,
          learningObjective: meta.learningObjective,
          cognitiveLevel: meta.cognitiveLevel,
          misconceptionTarget: meta.misconceptionTarget,
          optionRationales: meta.optionRationales,
        };
      }
      return q;
    });

    // ファイル書き戻し
    const p = join(projectRoot, 'src/data/questions', `${ch}.json`);
    writeFileSync(p, JSON.stringify(updatedQuestions, null, 2), 'utf-8');
    process.stderr.write(`${ch}.json を更新しました（${chResults.size} 問にメタデータ付与）\n`);

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
} else {
  // --write なし: stdout にプレビュー出力
  const results = [];
  for (const ch of CHAPTERS) {
    for (const [id, meta] of resultsByChapter[ch]) {
      results.push(meta);
    }
  }
  const output = { results, failed: failedIds };
  process.stdout.write(JSON.stringify(output, null, 2));
  process.stdout.write('\n');
}

process.stderr.write(`完了: 成功 ${total - failedIds.length} 問 / 失敗 ${failedIds.length} 問\n`);
if (failedIds.length > 0) {
  process.stderr.write(`失敗問題: ${failedIds.join(', ')}\n`);
  process.stderr.write(`rejected ダンプ: .harness/runs/0032a-rejected.json\n`);
}

process.exit(0);
