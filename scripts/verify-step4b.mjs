/**
 * verify-step4b.mjs
 * Step4b の検証スクリプト
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const STEP4_CSV = path.join(__dirname, '../../.harness/exports/questions-2026-05-02-step4.csv');
const STEP4B_CSV = path.join(__dirname, '../../.harness/exports/questions-2026-05-02-step4b.csv');

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
      else if (i + 1 < text.length && text[i + 1] === '"') { current += '"'; i++; }
      else { inQuote = false; }
    } else if (c === ',' && !inQuote) {
      row.push(current); current = '';
    } else if (c === '\n' && !inQuote) {
      row.push(current); current = '';
      rows.push(row); row = [];
    } else if (c === '\r') {
      // skip
    } else {
      current += c;
    }
  }
  if (current || row.length > 0) { row.push(current); rows.push(row); }

  const headers = rows[0].map(h => h.replace(/\r/g, ''));
  const dataRows = rows.slice(1).filter(r => r.some(v => v.trim() !== ''));
  const records = dataRows.map(r => {
    const rec = {};
    headers.forEach((h, i) => { rec[h] = (r[i] || '').replace(/\r/g, ''); });
    return rec;
  });
  return { headers, rows: records };
}

const step4Text = fs.readFileSync(STEP4_CSV, 'utf8');
const step4bText = fs.readFileSync(STEP4B_CSV, 'utf8');

const step4Raw = step4Text.replace(/^﻿/, '');
const step4bRaw = step4bText.replace(/^﻿/, '');

const { headers: h4, rows: r4 } = parseCsv(step4Text);
const { headers: h4b, rows: r4b } = parseCsv(step4bText);

let pass = true;
const results = [];

// --- 完全消去対象 ---
const exterminate = [
  'とされるとする説明',
  'であるとされるである',
  'であるとされるという',
  'であるとされる・仕組み',
];

let extTotal = 0;
for (const e of exterminate) {
  const re = new RegExp(e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  const m = step4bRaw.match(re);
  const c = m ? m.length : 0;
  extTotal += c;
}
const extPass = extTotal === 0;
results.push({ name: '完全消去4表現 合計 = 0', pass: extPass, actual: extTotal });
if (!extPass) pass = false;

// --- 大幅削減対象 ---
function countReduce(text) {
  const p1 = (text.match(/という("|,|\n)/g) || []).length;
  const p2 = (text.match(/とする説明("|,|\n)/g) || []).length;
  const p3 = (text.match(/・仕組み("|,|\n)/g) || []).length;
  return { という: p1, とする説明: p2, 仕組み: p3, total: p1 + p2 + p3 };
}

const beforeCount = countReduce(step4Raw);
const afterCount = countReduce(step4bRaw);

console.log('=== 大幅削減対象 before ===');
console.log(JSON.stringify(beforeCount, null, 2));
console.log('=== 大幅削減対象 after ===');
console.log(JSON.stringify(afterCount, null, 2));

const reduceRatio = beforeCount.total > 0 ? afterCount.total / beforeCount.total : 0;
const reducePass = afterCount.total <= 10 || reduceRatio <= 0.3;
results.push({
  name: '大幅削減: 30%以下または10件以下',
  pass: reducePass,
  actual: `before=${beforeCount.total} after=${afterCount.total} ratio=${(reduceRatio * 100).toFixed(1)}%`,
});
if (!reducePass) pass = false;

// --- CSV 行数確認 ---
const lineCount4b = step4bText.split('\n').filter(l => l.trim()).length;
const rowPass = r4b.length === 292;
results.push({ name: '292データ行', pass: rowPass, actual: r4b.length });
if (!rowPass) pass = false;

// --- correctIndex / 正答テキスト 一致 ---
let mismatch = 0;
for (const row of r4b) {
  const ci = parseInt(row['correctIndex'], 10);
  if (isNaN(ci) || ci < 0 || ci > 3) { mismatch++; continue; }
  const choiceVal = row[`choice${ci}`];
  const answerVal = row['正答テキスト'];
  if (choiceVal !== answerVal) {
    console.log(`MISMATCH: ${row['id']} correctIndex=${ci} choice${ci}="${choiceVal}" vs 正答テキスト="${answerVal}"`);
    mismatch++;
  }
}
const answerPass = mismatch === 0;
results.push({ name: 'correctIndex指定choice = 正答テキスト 全一致', pass: answerPass, actual: `mismatch=${mismatch}` });
if (!answerPass) pass = false;

// --- optionRationales 4件 ---
let rationalesErr = 0;
for (const row of r4b) {
  const val = row['optionRationales'] || '';
  const blocks = val.split(' || ');
  if (blocks.length !== 4) {
    console.log(`RATIONALES_COUNT: ${row['id']} blocks=${blocks.length}`);
    rationalesErr++;
  }
}
const rationalesPass = rationalesErr === 0;
results.push({ name: 'optionRationales 4件', pass: rationalesPass, actual: `errors=${rationalesErr}` });
if (!rationalesPass) pass = false;

// --- 正答 rationale 「正解。」始まり ---
let correctStartErr = 0;
for (const row of r4b) {
  const ci = parseInt(row['correctIndex'], 10);
  if (isNaN(ci)) continue;
  const val = row['optionRationales'] || '';
  const blocks = val.split(' || ');
  if (blocks.length === 4) {
    const correctBlock = blocks[ci].trim();
    if (!correctBlock.startsWith('正解。')) {
      console.log(`CORRECT_START: ${row['id']} ci=${ci} "${correctBlock.substring(0, 50)}"`);
      correctStartErr++;
    }
  }
}
const correctStartPass = correctStartErr === 0;
results.push({ name: '正答rationale「正解。」始まり', pass: correctStartPass, actual: `errors=${correctStartErr}` });
if (!correctStartPass) pass = false;

// --- 誤答 rationale 「誤り。」始まり ---
let wrongStartErr = 0;
for (const row of r4b) {
  const ci = parseInt(row['correctIndex'], 10);
  if (isNaN(ci)) continue;
  const val = row['optionRationales'] || '';
  const blocks = val.split(' || ');
  if (blocks.length === 4) {
    for (let bi = 0; bi < 4; bi++) {
      if (bi === ci) continue;
      const block = blocks[bi].trim();
      if (!block.startsWith('誤り。')) {
        console.log(`WRONG_START: ${row['id']} bi=${bi} "${block.substring(0, 50)}"`);
        wrongStartErr++;
      }
    }
  }
}
const wrongStartPass = wrongStartErr === 0;
results.push({ name: '誤答rationale「誤り。」始まり', pass: wrongStartPass, actual: `errors=${wrongStartErr}` });
if (!wrongStartPass) pass = false;

// --- 重点 6 ID の差分確認 ---
const priorityIds = ['ch1-002', 'ch1-021', 'ch5-011', 'ch5-015', 'ch5-018', 'ch8-024'];
const targetCols = ['choice0', 'choice1', 'choice2', 'choice3', '正答テキスト', 'explanation', 'optionRationales'];
const idMap4 = Object.fromEntries(r4.map(r => [r['id'], r]));
const idMap4b = Object.fromEntries(r4b.map(r => [r['id'], r]));
let priorityDiffFound = 0;
for (const id of priorityIds) {
  const row4 = idMap4[id];
  const row4b = idMap4b[id];
  if (!row4 || !row4b) continue;
  for (const col of targetCols) {
    if (row4[col] !== row4b[col]) {
      priorityDiffFound++;
      break;
    }
  }
}
const priorityPass = priorityDiffFound === priorityIds.length;
results.push({
  name: '重点6ID に差分あり',
  pass: priorityPass,
  actual: `${priorityDiffFound}/${priorityIds.length}`,
});
if (!priorityPass) pass = false;

// --- 結果サマリー ---
console.log('\n=== 検証結果 ===');
for (const r of results) {
  console.log(`[${r.pass ? 'PASS' : 'FAIL'}] ${r.name}: ${r.actual}`);
}
console.log('\n全体:', pass ? 'PASS' : 'FAIL');

process.exit(pass ? 0 : 1);
