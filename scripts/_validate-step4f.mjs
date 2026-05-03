/**
 * _validate-step4f.mjs
 * Step4f 完了条件 9 種を機械検証し、audit-step4f-validation.md に記録する。
 *
 * 改訂履歴:
 *  - 初版: 9 種（対象 8 ID）。
 *  - 2026-05-02 改訂: Planner 仕様書 0074 改訂版に準拠し、検査範囲を 9 ID に拡大。
 *    禁止文字列検査は CSV 全体（292 行）に対して実施する。
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_CSV = path.join(__dirname, '../../.harness/exports/questions-2026-05-02-step4f.csv');
const VALIDATION_MD = path.join(__dirname, '../../.harness/runs/0074/audit-step4f-validation.md');

function parseCsv(csvText) {
  const text = csvText.startsWith('﻿') ? csvText.slice(1) : csvText;
  const rows = [];
  let inQ = false, cur = '', row = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (!inQ) inQ = true;
      else if (i + 1 < text.length && text[i + 1] === '"') { cur += '"'; i++; }
      else inQ = false;
    } else if (c === ',' && !inQ) { row.push(cur); cur = ''; }
    else if (c === '\n' && !inQ) { row.push(cur); cur = ''; rows.push(row); row = []; }
    else if (c === '\r' && !inQ) {}
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const headers = rows[0].map(h => h.replace(/\r/g, ''));
  const data = rows.slice(1).filter(r => r.some(v => v.trim() !== '')).map(r => {
    const o = {};
    headers.forEach((h, i) => { o[h] = r[i] !== undefined ? r[i].replace(/\r/g, '') : ''; });
    return o;
  });
  return { headers, rows: data, rawText: csvText };
}

const csvText = fs.readFileSync(OUTPUT_CSV, 'utf8');
const { rows } = parseCsv(csvText);

const TEXT_COLS = ['choice0', 'choice1', 'choice2', 'choice3', '正答テキスト', 'explanation', 'optionRationales'];

const results = [];

// 1. correctIndex 指定 choice と 正答テキスト 不一致 0 件
let mismatchCi = 0;
for (const r of rows) {
  const ci = parseInt(r.correctIndex, 10);
  const choice = r[`choice${ci}`];
  if (choice !== r['正答テキスト']) {
    mismatchCi++;
    console.log(`CI mismatch: ${r.id} ci=${ci}`);
  }
}
results.push({ name: 'correctIndex一致', count: mismatchCi, target: 0 });

// 2. optionRationales split(' || ') 長さ 4
let optBad = 0;
for (const r of rows) {
  const parts = (r.optionRationales || '').split(' || ');
  if (parts.length !== 4) {
    optBad++;
    console.log(`opt bad: ${r.id} length=${parts.length}`);
  }
}
results.push({ name: 'optionRationales-4ブロック', count: optBad, target: 0 });

// 3. 正答 rationale が「正解。」で始まる
let correctBad = 0;
for (const r of rows) {
  const ci = parseInt(r.correctIndex, 10);
  const parts = (r.optionRationales || '').split(' || ');
  if (parts.length === 4) {
    if (!parts[ci].startsWith('正解。')) {
      correctBad++;
      console.log(`correct rat bad: ${r.id} ci=${ci} starts="${parts[ci].slice(0, 10)}"`);
    }
  }
}
results.push({ name: '正答rationale-正解始まり', count: correctBad, target: 0 });

// 4. 誤答 rationale が「誤り。」で始まる
let incorrectBad = 0;
for (const r of rows) {
  const ci = parseInt(r.correctIndex, 10);
  const parts = (r.optionRationales || '').split(' || ');
  if (parts.length === 4) {
    for (let i = 0; i < 4; i++) {
      if (i === ci) continue;
      if (!parts[i].startsWith('誤り。')) {
        incorrectBad++;
        console.log(`incorrect rat bad: ${r.id} idx=${i} starts="${parts[i].slice(0, 10)}"`);
      }
    }
  }
}
results.push({ name: '誤答rationale-誤り始まり', count: incorrectBad, target: 0 });

// 5. CNNモ 末尾セル 0（全体）
let cnnTail = 0;
for (const r of rows) {
  for (const col of ['choice0', 'choice1', 'choice2', 'choice3', '正答テキスト', 'explanation']) {
    if (/CNNモ$/.test(r[col] || '')) cnnTail++;
  }
  const blocks = (r.optionRationales || '').split(' || ');
  for (const b of blocks) {
    if (/CNNモ$/.test(b)) cnnTail++;
  }
}
results.push({ name: 'CNNモ末尾セル', count: cnnTail, target: 0 });

// 6. 取得に原 末尾セル 0（全体）
let oriTail = 0;
for (const r of rows) {
  for (const col of ['choice0', 'choice1', 'choice2', 'choice3', '正答テキスト', 'explanation']) {
    if (/取得に原$/.test(r[col] || '')) oriTail++;
  }
  const blocks = (r.optionRationales || '').split(' || ');
  for (const b of blocks) {
    if (/取得に原$/.test(b)) oriTail++;
  }
}
results.push({ name: '取得に原末尾セル', count: oriTail, target: 0 });

// 7. 「選択肢と説明する内容」 0（CSV 全体）
let p7 = 0;
for (const r of rows) {
  for (const col of TEXT_COLS) {
    const m = (r[col] || '').match(/選択肢と説明する内容/g);
    if (m) p7 += m.length;
  }
}
results.push({ name: '選択肢と説明する内容', count: p7, target: 0 });

// 8. 「促進したを示す見方」 0（CSV 全体）
let p8 = 0;
for (const r of rows) {
  for (const col of TEXT_COLS) {
    const m = (r[col] || '').match(/促進したを示す見方/g);
    if (m) p8 += m.length;
  }
}
results.push({ name: '促進したを示す見方', count: p8, target: 0 });

// 9. 「として整理した説明」 0（CSV 全体）
let p9 = 0;
for (const r of rows) {
  for (const col of TEXT_COLS) {
    const m = (r[col] || '').match(/として整理した説明/g);
    if (m) p9 += m.length;
  }
}
results.push({ name: 'として整理した説明', count: p9, target: 0 });

console.log('\n=== Validation Results ===');
const md = ['# Step4f 完了条件 9 種 検証レポート', '', `- 出力 CSV: ${path.basename(OUTPUT_CSV)}`, `- 検証行数: ${rows.length}`, ''];
md.push('| # | 完了条件 | 実測 | 目標 | 結果 |');
md.push('|---|----------|------|------|------|');
let allPass = true;
results.forEach((r, idx) => {
  const pass = r.count === r.target;
  if (!pass) allPass = false;
  const verdict = pass ? 'PASS' : 'FAIL';
  console.log(`${idx + 1}. ${r.name}: ${r.count} (target ${r.target}) -> ${verdict}`);
  md.push(`| ${idx + 1} | ${r.name} | ${r.count} | ${r.target} | ${verdict} |`);
});
md.push('');
md.push(`## 総合判定: ${allPass ? 'ALL PASS' : 'SOME FAIL'}`);

const dir = path.dirname(VALIDATION_MD);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(VALIDATION_MD, md.join('\n'), 'utf8');
console.log(`\nWrote ${VALIDATION_MD}`);

if (!allPass) {
  console.error('\nSome conditions FAILED.');
  process.exit(1);
}
