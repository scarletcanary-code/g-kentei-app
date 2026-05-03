/**
 * _apply-step4d-fixes.mjs
 * Step4d の修正を適用して questions-2026-05-02-step4d.csv を出力する
 * Usage: node scripts/_apply-step4d-fixes.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INPUT = path.join(__dirname, '../../.harness/exports/questions-2026-05-02-step4c.csv');
const OUTPUT = path.join(__dirname, '../../.harness/exports/questions-2026-05-02-step4d.csv');
const DIFF_OUT = path.join(__dirname, '../../.harness/runs/0072/audit-step4d-diff.csv');

// RFC 4180 CSV parser
function parseCsv(csvText) {
  const text = csvText.startsWith('﻿') ? csvText.slice(1) : csvText;
  const rows = [];
  let inQuote = false;
  let current = '';
  let row = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (!inQuote) { inQuote = true; }
      else if (i + 1 < text.length && text[i+1] === '"') { current += '"'; i++; }
      else { inQuote = false; }
    } else if (c === ',' && !inQuote) { row.push(current); current = ''; }
    else if (c === '\n' && !inQuote) { row.push(current); current = ''; rows.push(row); row = []; }
    else if (c === '\r' && !inQuote) { /* skip */ }
    else { current += c; }
  }
  if (current || row.length > 0) { row.push(current); rows.push(row); }
  const headers = rows[0].map(h => h.replace(/\r/g, ''));
  const dataRows = rows.slice(1).filter(r => r.some(v => v.trim() !== ''));
  const records = dataRows.map(r => {
    const record = {};
    headers.forEach((h, i) => { record[h] = r[i] !== undefined ? r[i].replace(/\r/g, '') : ''; });
    return record;
  });
  return { headers, rows: records };
}

// CSV cell escape
function escapeCell(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// Read input
const csvText = fs.readFileSync(INPUT, 'utf8');
const { headers, rows } = parseCsv(csvText);
console.log(`Parsed: ${rows.length} rows, ${headers.length} columns`);

// Diff records
const diffs = [];

function recordDiff(id, col, before, after) {
  if (before !== after) {
    diffs.push({ id, column: col, before, after });
  }
}

// ====================================================================
// MODIFICATION RULES
// ====================================================================

// Rule 1: Specific ID fixes (complete exterminate + required IDs)
const specificFixes = {
  'ch7-020': {
    'choice0': '自動車の運転支援を目的とする機械学習技術',
    'choice1': 'AIモデルの本番環境へのデプロイだけを自動化するCI/CDツール',
    'choice3': '強化学習でロボットの動作だけを自動学習させる技術',
  },
  'ch8-024': {
    'choice1': 'AIの出力は常に正確なので、説明責任は不要である',
  },
  'ch8-027': {
    'choice0': 'AIプロファイリングによるデータ収集を拒否する権利がある',
    'choice2': '個人情報の利用に関する同意を撤回する権利',
  },
  'ch3-045': {
    'choice1': 'あらゆる問題はディープラーニングだけで解決できるとする誤った見方',
  },
  'ch5-003': {
    'choice3': '感情分析・画像分類ともRNN（再帰構造が両タスクに最適とする誤り）',
  },
};

// Apply specific fixes
for (const row of rows) {
  const id = row['id'];
  if (specificFixes[id]) {
    for (const [col, newVal] of Object.entries(specificFixes[id])) {
      const before = row[col];
      if (before !== newVal) {
        recordDiff(id, col, before, newVal);
        row[col] = newVal;
      }
    }
  }
}

// Rule 2: Remove trailing 'という考え方' from choice0-3 (ends-with pattern)
// Only for cells that END with exactly 'という考え方'
const choiceCols = ['choice0', 'choice1', 'choice2', 'choice3'];
for (const row of rows) {
  const id = row['id'];
  for (const col of choiceCols) {
    const val = row[col];
    if (val && val.endsWith('という考え方')) {
      // 'という考え方' = 6 chars (Japanese: と・い・う・考・え・方)
      const newVal = val.slice(0, val.length - 6);
      recordDiff(id, col, val, newVal);
      row[col] = newVal;
    }
  }
}

// Rule 3: Sync 正答テキスト with correctIndex choice after modifications
for (const row of rows) {
  const id = row['id'];
  const ci = parseInt(row['correctIndex']);
  if (!isNaN(ci) && ci >= 0 && ci <= 3) {
    const choiceCol = 'choice' + ci;
    const choiceVal = row[choiceCol];
    const answerVal = row['正答テキスト'];
    if (choiceVal !== answerVal) {
      recordDiff(id, '正答テキスト', answerVal, choiceVal);
      row['正答テキスト'] = choiceVal;
    }
  }
}

// ====================================================================
// OUTPUT CSV
// ====================================================================

// Serialize with BOM + CRLF
let out = '﻿' + headers.map(escapeCell).join(',') + '\r\n';
for (const row of rows) {
  out += headers.map(h => escapeCell(row[h] || '')).join(',') + '\r\n';
}

fs.writeFileSync(OUTPUT, out, 'utf8');
console.log(`Output written: ${OUTPUT}`);
console.log(`Data rows: ${rows.length}`);

// Write diff CSV
let diffOut = 'id,column,before,after\r\n';
for (const d of diffs) {
  diffOut += [d.id, d.column, d.before, d.after].map(escapeCell).join(',') + '\r\n';
}
fs.writeFileSync(DIFF_OUT, diffOut, 'utf8');
console.log(`Diff written: ${DIFF_OUT} (${diffs.length} changes)`);

// Print summary
const changedIds = [...new Set(diffs.map(d => d.id))];
console.log(`\nChanged IDs: ${changedIds.length}`);
for (const id of changedIds) {
  const idDiffs = diffs.filter(d => d.id === id);
  console.log(`  ${id}: ${idDiffs.map(d => d.column).join(', ')}`);
}

// Count expressions after fix
const postText = out.replace(/^﻿/, '');
const allExprs = [
  'とされる考え方である',  // とされる考え方である
  '定義・概念',                                  // 定義・概念
  '処理・理論の枚組み',          // 処理・理論の枠組み
  '学習・推論の仕組み',          // 学習・推論の仕組み
  'という考え方',                            // という考え方
  'という説明',                                   // という説明
  'であることを特徴とする', // であることを特徴とする
  '技術であることを特徴とする', // 技術であることを特徴とする
];
const exprNames = [
  'とされる考え方である', '定義・概念', '処理・理論の枠組み', '学習・推論の仕組み',
  'という考え方', 'という説明', 'であることを特徴とする', '技術であることを特徴とする'
];
console.log('\n=== After fix expression counts ===');
for (let i = 0; i < allExprs.length; i++) {
  const pattern = allExprs[i];
  let count = 0;
  let searchPos = 0;
  while (true) {
    const pos = postText.indexOf(pattern, searchPos);
    if (pos === -1) break;
    count++;
    searchPos = pos + 1;
  }
  console.log(`  "${exprNames[i]}": ${count}`);
}
