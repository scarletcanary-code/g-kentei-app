#!/usr/bin/env node
/**
 * felo-generate-intermediate-detail.mjs
 * Felo API を使って用語集の「中級解説」（intermediateDetail）を生成するスクリプト
 *
 * 使用方法:
 *   node --env-file=.env scripts/felo-generate-intermediate-detail.mjs --all [--write] [--dry-run]
 *   node --env-file=.env scripts/felo-generate-intermediate-detail.mjs --id <termId> [--write] [--dry-run]
 *
 * 環境変数:
 *   FELO_API_KEY: Felo API キー（.env ファイルに設定）--dry-run 時は不要
 *
 * --write オプション追加時は terms.json を直接上書きする（バックアップも自動作成）
 */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// コマンドライン引数のパース
const args = process.argv.slice(2);
const allFlag = args.includes('--all');
const dryRun = args.includes('--dry-run');
const writeFlag = args.includes('--write');
const idArgIdx = args.indexOf('--id');
const termId = (idArgIdx !== -1 && idArgIdx + 1 < args.length) ? args[idArgIdx + 1] : null;

// --all / --id のどちらも指定されていない場合
if (!allFlag && termId === null) {
  process.stderr.write('エラー: --all または --id <termId> のいずれかが必要です。\n');
  process.stderr.write('使用方法: node scripts/felo-generate-intermediate-detail.mjs --all\n');
  process.stderr.write('         node scripts/felo-generate-intermediate-detail.mjs --id <termId>\n');
  process.exit(1);
}

// FELO_API_KEY バリデーション（dry-run 以外）
const apiKey = process.env.FELO_API_KEY;
if (!dryRun) {
  if (!apiKey || apiKey.trim() === '') {
    process.stderr.write('エラー: FELO_API_KEY が設定されていません。.env ファイルに FELO_API_KEY=<your-key> を設定してください。\n');
    process.exit(1);
  }
}

// terms.json を読み込む
const termsPath = join(projectRoot, 'src/data/glossary/terms.json');
const termsRaw = readFileSync(termsPath, 'utf-8');
const terms = JSON.parse(termsRaw);

// 処理対象の用語を決定
let targetTerms;
if (allFlag) {
  targetTerms = terms;
} else {
  const found = terms.find((t) => t.id === termId);
  if (!found) {
    process.stderr.write(`エラー: id "${termId}" の用語が terms.json に見つかりません。\n`);
    process.exit(1);
  }
  targetTerms = [found];
}

const FELO_API_URL = 'https://openapi.felo.ai/v2/chat';
const BATCH_SIZE = 5;

// バッチ総数（--all 時）
const totalBatches = Math.ceil(targetTerms.length / BATCH_SIZE);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// citations 抽出ロジック
function extractCitations(data) {
  if (data && data.data && data.data.resources && Array.isArray(data.data.resources)) {
    return data.data.resources
      .map((s) => s.link || s.url || s.source)
      .filter(Boolean);
  } else if (data && data.data && data.data.sources) {
    return data.data.sources
      .map((s) => s.url || s.link || s.source)
      .filter(Boolean);
  } else if (data && data.sources) {
    return data.sources
      .map((s) => s.url || s.link || s.source)
      .filter(Boolean);
  } else if (data && data.citations) {
    return data.citations.filter((c) => typeof c === 'string');
  } else if (data && data.data && data.data.citations) {
    return data.data.citations.filter((c) => typeof c === 'string');
  }
  return [];
}

function extractAnswer(data) {
  if (data && data.data && data.data.answer) return data.data.answer;
  if (data && data.answer) return data.answer;
  if (data && data.result) return data.result;
  if (data && data.text) return data.text;
  if (data && data.content) return data.content;
  return JSON.stringify(data);
}

// バッチプロンプト構築
function buildBatchPrompt(batch) {
  const itemsJson = JSON.stringify(
    batch.map((t) => ({
      id: t.id,
      term: t.term,
      termEn: t.termEn,
      advanced: t.detail,
      beginner: t.beginnerDetail || '',
    })),
    null,
    2
  );

  return `あなたは G検定対策コンテンツの編集者です。

【対象読者】「中級」レベル
- 機械学習や AI に多少触れたことがある社会人・学生
- 専門用語は前提知識として使ってよい（厳密な定義の繰り返しは不要）
- 初級（AIリテラシーがない人）と上級（G検定合格レベルの試験対策）の中間
- フィラー文（「重要なスキルとなるでしょう」「ますます重要になっています」「ビジネスや日常生活で活用」「必要なスキル」等の中身のない総括）禁止
- 各項目で異なる表現・構成にする（テンプレ化を避ける）

以下の ${batch.length} 件について、それぞれの「中級解説」を JSON 配列で出力してください。

${itemsJson}

出力フォーマット（このフォーマット以外で出力しないこと）:
\`\`\`json
[
  {"id": "...", "intermediate": "<中級解説本文>"},
  ...
]
\`\`\``;
}

// 単問プロンプト構築（フォールバック用）
function buildSinglePrompt(term) {
  let prompt = `あなたは G検定対策コンテンツの編集者です。

【対象読者】「中級」レベル
- 機械学習や AI に多少触れたことがある社会人・学生
- 専門用語は前提知識として使ってよい（厳密な定義の繰り返しは不要）
- 初級（AIリテラシーがない人）と上級（G検定合格レベルの試験対策）の中間
- フィラー文（「重要なスキルとなるでしょう」「ますます重要になっています」「ビジネスや日常生活で活用」「必要なスキル」等の中身のない総括）禁止

以下の用語「${term.term}（${term.termEn}）」の「中級解説」を書いてください。

【上級解説】\n${term.detail}\n`;
  if (term.beginnerDetail) {
    prompt += `\n【初級解説】\n${term.beginnerDetail}\n`;
  }
  prompt += `\n出力フォーマット（このフォーマット以外で出力しないこと）:
\`\`\`json
[
  {"id": "${term.id}", "intermediate": "<中級解説本文>"}
]
\`\`\``;
  return prompt;
}

// Felo API 呼び出し
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

// JSON ブロック抽出 + パース
function parseJsonBlock(text) {
  const match = text.match(/```json\s*([\s\S]*?)```/);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim());
  } catch (_) {
    return null;
  }
}

// バッチ処理（リトライ付き）
// 返却: Map<id, { intermediate: string, citations: string[] }>
async function processBatch(batch, batchIndex, totalBatches) {
  const batchTermNames = batch.map((t) => t.term).join(', ');
  process.stderr.write(`[batch ${batchIndex}/${totalBatches}] terms=${batchTermNames}\n`);

  const expectedIds = new Set(batch.map((t) => t.id));

  for (let attempt = 1; attempt <= 2; attempt++) {
    let data;
    try {
      data = await feloChat(buildBatchPrompt(batch));
    } catch (e) {
      process.stderr.write(`[batch ${batchIndex}/${totalBatches}] attempt ${attempt} API error: ${e.message}\n`);
      if (attempt < 2) {
        await sleep(1000);
        continue;
      }
      return null; // バッチ失敗 → フォールバックへ
    }

    const answerText = extractAnswer(data).trim();
    const parsed = parseJsonBlock(answerText);
    if (!parsed || !Array.isArray(parsed)) {
      process.stderr.write(`[batch ${batchIndex}/${totalBatches}] attempt ${attempt} JSON parse failed\n`);
      if (attempt < 2) {
        await sleep(1000);
        continue;
      }
      return null;
    }

    // id 欠落チェック
    const returnedIds = new Set(parsed.map((x) => x && x.id).filter(Boolean));
    const missing = [...expectedIds].filter((id) => !returnedIds.has(id));
    if (missing.length > 0) {
      process.stderr.write(`[batch ${batchIndex}/${totalBatches}] attempt ${attempt} missing ids: ${missing.join(', ')}\n`);
      if (attempt < 2) {
        await sleep(1000);
        continue;
      }
      return null;
    }

    // 成功
    const citations = extractCitations(data);
    const resultMap = new Map();
    for (const item of parsed) {
      if (item && item.id && item.intermediate) {
        resultMap.set(item.id, {
          intermediate: item.intermediate,
          citations,
        });
      }
    }
    return resultMap;
  }

  return null;
}

// 単問フォールバック処理
// 返却: { intermediate: string, citations: string[] } | null
async function processSingleFallback(term, fallbackIndex, fallbackTotal) {
  process.stderr.write(`[fallback ${fallbackIndex}/${fallbackTotal}] term=${term.term}\n`);

  let data;
  try {
    data = await feloChat(buildSinglePrompt(term));
  } catch (e) {
    process.stderr.write(`[fallback ${fallbackIndex}/${fallbackTotal}] API error: ${e.message}\n`);
    return null;
  }

  const answerText = extractAnswer(data).trim();
  const parsed = parseJsonBlock(answerText);
  if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
    process.stderr.write(`[fallback ${fallbackIndex}/${fallbackTotal}] JSON parse failed\n`);
    return null;
  }

  const item = parsed.find((x) => x && x.id === term.id);
  if (!item || !item.intermediate) {
    // 最初の要素の intermediate を使う
    const first = parsed[0];
    if (first && first.intermediate) {
      return {
        intermediate: first.intermediate,
        citations: extractCitations(data),
      };
    }
    process.stderr.write(`[fallback ${fallbackIndex}/${fallbackTotal}] no intermediate field\n`);
    return null;
  }

  return {
    intermediate: item.intermediate,
    citations: extractCitations(data),
  };
}

// rejected ダンプ
const rejectedPath = join(projectRoot, '../.harness/runs/0029-rejected.json');
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

// dry-run: プロンプトを stdout に出力して終了
if (dryRun) {
  if (allFlag) {
    // バッチモードのプロンプト出力
    for (let i = 0; i < targetTerms.length; i += BATCH_SIZE) {
      const batch = targetTerms.slice(i, i + BATCH_SIZE);
      const batchIndex = Math.floor(i / BATCH_SIZE) + 1;
      process.stdout.write(`=== [batch ${batchIndex}/${totalBatches}] terms=${batch.map((t) => t.term).join(', ')} ===\n`);
      process.stdout.write(buildBatchPrompt(batch));
      process.stdout.write('\n\n');
    }
  } else {
    // 単問プロンプト出力
    const term = targetTerms[0];
    process.stdout.write(`=== term=${term.term} ===\n`);
    process.stdout.write(buildSinglePrompt(term));
    process.stdout.write('\n\n');
  }
  process.exit(0);
}

// バックアップ作成（--write 時のみ）
if (writeFlag) {
  const backupDir = join(projectRoot, '../.harness/runs/0029-backup');
  mkdirSync(backupDir, { recursive: true });
  const backupPath = join(backupDir, 'terms.json.bak');
  copyFileSync(termsPath, backupPath);
  process.stderr.write(`バックアップを作成しました: .harness/runs/0029-backup/terms.json.bak\n`);
}

// 全用語を処理
const resultMap = new Map(); // id -> { intermediate, citations }
const failedTerms = []; // フォールバックでも失敗した語

if (allFlag) {
  // バッチ処理
  for (let i = 0; i < targetTerms.length; i += BATCH_SIZE) {
    const batch = targetTerms.slice(i, i + BATCH_SIZE);
    const batchIndex = Math.floor(i / BATCH_SIZE) + 1;

    if (i > 0) {
      await sleep(1000);
    }

    const batchResult = await processBatch(batch, batchIndex, totalBatches);

    if (batchResult !== null) {
      // バッチ成功
      for (const [id, value] of batchResult) {
        resultMap.set(id, value);
      }
    } else {
      // フォールバック: バッチ内の各語を単問処理
      process.stderr.write(`[batch ${batchIndex}/${totalBatches}] falling back to single mode\n`);
      const fallbackTotal = batch.length;
      for (let j = 0; j < batch.length; j++) {
        const term = batch[j];
        if (j > 0) {
          await sleep(1000);
        }
        const singleResult = await processSingleFallback(term, j + 1, fallbackTotal);
        if (singleResult !== null) {
          resultMap.set(term.id, singleResult);
        } else {
          process.stderr.write(`[fallback] rejected: ${term.id}\n`);
          failedTerms.push(term.id);
          appendRejected({ id: term.id, term: term.term, reason: 'single fallback failed' });
        }
      }
    }
  }
} else {
  // 単語モード: --id の場合は単問として処理
  const term = targetTerms[0];
  const singleResult = await processSingleFallback(term, 1, 1);
  if (singleResult !== null) {
    resultMap.set(term.id, singleResult);
  } else {
    process.stderr.write(`[error] ${term.id} の処理に失敗しました。\n`);
    failedTerms.push(term.id);
    appendRejected({ id: term.id, term: term.term, reason: 'single mode failed' });
  }
}

// --write オプション: terms.json を更新
if (writeFlag) {
  const updatedTerms = terms.map((t) => {
    const r = resultMap.get(t.id);
    if (r) {
      const updated = { ...t, intermediateDetail: r.intermediate };
      // source_ref_supplements: 1件目の URL のみ格納（上書き）
      if (r.citations && r.citations.length > 0) {
        updated.source_ref_supplements = [r.citations[0]];
      } else {
        updated.source_ref_supplements = [];
      }
      return updated;
    }
    return t;
  });
  writeFileSync(termsPath, JSON.stringify(updatedTerms, null, 2), 'utf-8');
  process.stderr.write(`terms.json を更新しました（${resultMap.size} 件、失敗: ${failedTerms.length} 件）\n`);
}

// JSON 出力
const results = [];
for (const [id, r] of resultMap) {
  const term = terms.find((t) => t.id === id);
  results.push({
    id,
    term: term ? term.term : id,
    intermediateDetail: r.intermediate,
    charCount: r.intermediate.length,
    citations: r.citations,
  });
}

const output = { results, failed: failedTerms };
process.stdout.write(JSON.stringify(output, null, 2));
process.stdout.write('\n');
process.exit(0);
