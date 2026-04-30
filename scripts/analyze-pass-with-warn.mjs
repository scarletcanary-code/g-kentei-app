#!/usr/bin/env node
/**
 * analyze-pass-with-warn.mjs
 * .harness/runs/0033-full/audit-llm-results.json を読み込み、
 * overall=PASS かつ個別 11 項目に WARN または FAIL を含む問題を抽出・集計・優先度分類する。
 *
 * 使用方法:
 *   node scripts/analyze-pass-with-warn.mjs [audit-results-path]
 *
 * 出力先: ../.harness/runs/0038/
 *   - results.json
 *   - summary.md
 *   - candidates.csv
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// ============================================================
// コマンドライン引数
// ============================================================
const args = process.argv.slice(2);
const inputPath = args[0]
  ? resolve(args[0])
  : join(projectRoot, '../.harness/runs/0033-full/audit-llm-results.json');

const outputDir = join(projectRoot, '../.harness/runs/0038');

// ============================================================
// 定数
// ============================================================
const EXCLUDED_IDS = ['ch2-030', 'ch7-030', 'ch8-018'];

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

const PRIORITY_HIGH_ITEMS = ['fact_accuracy', 'one_best_answer', 'syllabus_alignment'];

const PRIORITY_ORDER = ['要人間確認', '要リライト', '軽微修正', '修正不要'];

// ============================================================
// 入力ファイル読み込み
// ============================================================
let rawData;
try {
  const content = readFileSync(inputPath, 'utf-8');
  rawData = JSON.parse(content);
} catch (err) {
  process.stderr.write(`エラー: 入力ファイルの読み込みまたは JSON パースに失敗しました。\n`);
  process.stderr.write(`パス: ${inputPath}\n`);
  process.stderr.write(`詳細: ${err.message}\n`);
  process.exit(1);
}

// ============================================================
// 出力ディレクトリ作成
// ============================================================
try {
  mkdirSync(outputDir, { recursive: true });
} catch (err) {
  process.stderr.write(`エラー: 出力ディレクトリの作成に失敗しました。\n`);
  process.stderr.write(`パス: ${outputDir}\n`);
  process.stderr.write(`詳細: ${err.message}\n`);
  process.exit(1);
}

// ============================================================
// 処理
// ============================================================

// 1. overall=PASS のエントリのみ抽出
const passEntries = rawData.filter((e) => e.overall === 'PASS');

// 2. 除外 ID リストに一致するエントリを分離
const excludedEntries = passEntries
  .filter((e) => EXCLUDED_IDS.includes(e.questionId))
  .map((e) => ({ ...e, excluded: true }));

const targetEntries = passEntries.filter((e) => !EXCLUDED_IDS.includes(e.questionId));

// 3. 各エントリの WARN/FAIL 項目を抽出し、warnFailItems 配列を付与
function extractWarnFailItems(entry) {
  const warnFailItems = [];
  for (const item of REVIEW_ITEMS) {
    const reviewItem = entry.review && entry.review[item];
    if (reviewItem && (reviewItem.status === 'WARN' || reviewItem.status === 'FAIL')) {
      warnFailItems.push({
        item,
        status: reviewItem.status,
        reason: reviewItem.reason || '',
      });
    }
  }
  return warnFailItems;
}

// 4. 優先度分類
function classifyPriority(warnFailItems) {
  if (warnFailItems.length === 0) return '修正不要';

  // 要人間確認: fact_accuracy / one_best_answer / syllabus_alignment のいずれかが WARN or FAIL
  const hasHighRiskItem = warnFailItems.some((wf) => PRIORITY_HIGH_ITEMS.includes(wf.item));
  if (hasHighRiskItem) return '要人間確認';

  // 要リライト: FAIL を 1 件以上含む、または WARN を 3 件以上含む
  const failCount = warnFailItems.filter((wf) => wf.status === 'FAIL').length;
  const warnCount = warnFailItems.filter((wf) => wf.status === 'WARN').length;
  if (failCount >= 1 || warnCount >= 3) return '要リライト';

  // 軽微修正: WARN を 1〜2 件含み FAIL なし
  if (warnCount >= 1 && failCount === 0) return '軽微修正';

  return '修正不要';
}

// 5. WARN/FAIL を含む問題のみを処理対象とする
const processedEntries = targetEntries
  .map((entry) => {
    const warnFailItems = extractWarnFailItems(entry);
    const priority = classifyPriority(warnFailItems);
    const chapter = entry.questionId ? entry.questionId.replace(/-\d+$/, '') : '';
    return {
      questionId: entry.questionId,
      chapter,
      overall: entry.overall,
      warnFailItems,
      priority,
      recommendedAction: entry.recommendedAction || '',
      excluded: false,
    };
  })
  .filter((e) => e.warnFailItems.length >= 1);

// ============================================================
// 集計
// ============================================================

// 項目別 WARN/FAIL 件数
const itemStats = {};
for (const item of REVIEW_ITEMS) {
  itemStats[item] = { warn: 0, fail: 0 };
}
for (const entry of processedEntries) {
  for (const wf of entry.warnFailItems) {
    if (itemStats[wf.item]) {
      if (wf.status === 'WARN') itemStats[wf.item].warn++;
      else if (wf.status === 'FAIL') itemStats[wf.item].fail++;
    }
  }
}

// 章別分布
const chapterStats = {};
for (let i = 1; i <= 8; i++) {
  chapterStats[`ch${i}`] = 0;
}
for (const entry of processedEntries) {
  if (chapterStats[entry.chapter] !== undefined) {
    chapterStats[entry.chapter]++;
  } else {
    chapterStats[entry.chapter] = 1;
  }
}

// 優先度別件数
const priorityStats = {
  '要人間確認': 0,
  '要リライト': 0,
  '軽微修正': 0,
  '修正不要': 0,
};
for (const entry of processedEntries) {
  if (priorityStats[entry.priority] !== undefined) {
    priorityStats[entry.priority]++;
  }
}

// 優先度別代表 5 件
const priorityRepresentatives = {};
for (const priority of ['要人間確認', '要リライト', '軽微修正']) {
  priorityRepresentatives[priority] = processedEntries
    .filter((e) => e.priority === priority)
    .slice(0, 5)
    .map((e) => ({
      questionId: e.questionId,
      warnFailItemNames: e.warnFailItems.map((wf) => wf.item),
      reasonExcerpt: e.warnFailItems[0]
        ? e.warnFailItems[0].reason.substring(0, 50)
        : '',
    }));
}

// ============================================================
// results.json 出力
// ============================================================
const resultsJson = processedEntries;
const resultsPath = join(outputDir, 'results.json');
try {
  writeFileSync(resultsPath, JSON.stringify(resultsJson, null, 2), 'utf-8');
} catch (err) {
  process.stderr.write(`エラー: results.json の書き込みに失敗しました。\n`);
  process.stderr.write(`詳細: ${err.message}\n`);
  process.exit(1);
}

// ============================================================
// summary.md 出力
// ============================================================
const today = new Date().toISOString().slice(0, 10);

let summaryMd = '';
summaryMd += `# PASS内 WARN/FAIL 問題 棚卸しレポート\n\n`;
summaryMd += `- 実行日: ${today}\n`;
summaryMd += `- 入力ファイル: ${inputPath}\n`;
summaryMd += `- 全体件数: ${rawData.length} エントリ\n\n`;

summaryMd += `## 全体概要\n\n`;
summaryMd += `| 区分 | 件数 |\n`;
summaryMd += `|---|---|\n`;
summaryMd += `| overall PASS | ${passEntries.length} |\n`;
summaryMd += `| overall FAIL | ${rawData.filter((e) => e.overall === 'FAIL').length} |\n`;
summaryMd += `| PASS 内 WARN/FAIL 含む問題（除外前） | ${targetEntries.filter((e) => extractWarnFailItems(e).length >= 1).length} |\n`;
summaryMd += `| 除外（0034 修正済み） | ${excludedEntries.length} |\n`;
summaryMd += `| 修正候補（results.json 収録数） | ${processedEntries.length} |\n\n`;

summaryMd += `## 項目別集計\n\n`;
summaryMd += `| 項目 | WARN 件数 | FAIL 件数 | 合計 |\n`;
summaryMd += `|---|---|---|---|\n`;
for (const item of REVIEW_ITEMS) {
  const s = itemStats[item];
  summaryMd += `| ${item} | ${s.warn} | ${s.fail} | ${s.warn + s.fail} |\n`;
}
summaryMd += '\n';

summaryMd += `## 章別分布\n\n`;
summaryMd += `| 章 | WARN/FAIL 含む問題数 |\n`;
summaryMd += `|---|---|\n`;
for (let i = 1; i <= 8; i++) {
  summaryMd += `| ch${i} | ${chapterStats[`ch${i}`] || 0} |\n`;
}
summaryMd += '\n';

summaryMd += `## 優先度別件数\n\n`;
summaryMd += `| 優先度 | 件数 |\n`;
summaryMd += `|---|---|\n`;
for (const priority of PRIORITY_ORDER) {
  summaryMd += `| ${priority} | ${priorityStats[priority] || 0} |\n`;
}
summaryMd += '\n';

summaryMd += `## 優先度別 代表問題（各最大 5 件）\n\n`;
for (const priority of ['要人間確認', '要リライト', '軽微修正']) {
  summaryMd += `### ${priority}\n\n`;
  const reps = priorityRepresentatives[priority];
  if (!reps || reps.length === 0) {
    summaryMd += `（該当なし）\n\n`;
  } else {
    summaryMd += `| questionId | WARN/FAIL 項目 | reason 冒頭 50 字 |\n`;
    summaryMd += `|---|---|---|\n`;
    for (const rep of reps) {
      summaryMd += `| ${rep.questionId} | ${rep.warnFailItemNames.join(', ')} | ${rep.reasonExcerpt} |\n`;
    }
    summaryMd += '\n';
  }
}

const summaryPath = join(outputDir, 'summary.md');
try {
  writeFileSync(summaryPath, summaryMd, 'utf-8');
} catch (err) {
  process.stderr.write(`エラー: summary.md の書き込みに失敗しました。\n`);
  process.stderr.write(`詳細: ${err.message}\n`);
  process.exit(1);
}

// ============================================================
// candidates.csv 出力
// ============================================================

// 優先度の順序定義（降順）
const prioritySortOrder = {
  '要人間確認': 0,
  '要リライト': 1,
  '軽微修正': 2,
  '修正不要': 3,
};

const sortedEntries = [...processedEntries].sort((a, b) => {
  const pa = prioritySortOrder[a.priority] ?? 99;
  const pb = prioritySortOrder[b.priority] ?? 99;
  if (pa !== pb) return pa - pb;
  return a.questionId.localeCompare(b.questionId);
});

const csvHeader = 'questionId,chapter,overall,warnFailItems,warnFailCount,priority,recommendedAction,summaryExcerpt';

const csvRows = sortedEntries.map((entry) => {
  const warnFailItemsStr = entry.warnFailItems
    .map((wf) => `${wf.item}(${wf.status})`)
    .join(';');
  const summaryExcerpt = entry.warnFailItems[0]
    ? entry.warnFailItems[0].reason
        .substring(0, 60)
        .replace(/,/g, '、')
    : '';
  return [
    entry.questionId,
    entry.chapter,
    entry.overall,
    warnFailItemsStr,
    entry.warnFailItems.length,
    entry.priority,
    entry.recommendedAction,
    `"${summaryExcerpt}"`,
  ].join(',');
});

const csvContent = [csvHeader, ...csvRows].join('\n') + '\n';

const csvPath = join(outputDir, 'candidates.csv');
try {
  writeFileSync(csvPath, csvContent, 'utf-8');
} catch (err) {
  process.stderr.write(`エラー: candidates.csv の書き込みに失敗しました。\n`);
  process.stderr.write(`詳細: ${err.message}\n`);
  process.exit(1);
}

// ============================================================
// 完了メッセージ
// ============================================================
console.log(`analyze-pass-with-warn: 完了`);
console.log(`  入力: ${inputPath}`);
console.log(`  出力ディレクトリ: ${outputDir}`);
console.log(`  overall PASS: ${passEntries.length} 件`);
console.log(`  PASS 内 WARN/FAIL 含む問題（修正候補）: ${processedEntries.length} 件`);
console.log(`  除外（0034 修正済み）: ${excludedEntries.length} 件`);
console.log(`  優先度別:`);
for (const priority of PRIORITY_ORDER) {
  console.log(`    ${priority}: ${priorityStats[priority] || 0} 件`);
}
console.log(`  出力ファイル:`);
console.log(`    results.json: ${resultsPath}`);
console.log(`    summary.md:   ${summaryPath}`);
console.log(`    candidates.csv: ${csvPath}`);
