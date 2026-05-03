/**
 * _apply-step4g-fixes.mjs
 * Step4g 最終ピンポイント修正を適用し、questions-2026-05-02-step4g.csv を出力する。
 *
 * 対象 8 ID:
 *   ch2-007 / ch8-005 / ch1-011 / ch1-035 / ch2-018 / ch3-012 / ch3-020 / ch2-027
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INPUT_PATH = path.join(__dirname, '../../.harness/exports/questions-2026-05-02-step4f.csv');
const OUTPUT_PATH = path.join(__dirname, '../../.harness/exports/questions-2026-05-02-step4g.csv');
const DIFF_PATH = path.join(__dirname, '../../.harness/runs/0075/audit-step4g-diff.csv');
const PINPOINT_MD_PATH = path.join(__dirname, '../../.harness/runs/0075/audit-step4g-final-naturalize.md');

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
    else if (c === '\r' && !inQ) { /* skip */ }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

function csvEscape(value) {
  const v = value === null || value === undefined ? '' : String(value);
  if (v.includes(',') || v.includes('"') || v.includes('\n') || v.includes('\r')) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}

function buildCsv(headers, dataRows) {
  const lines = [];
  lines.push(headers.map(csvEscape).join(','));
  for (const r of dataRows) {
    lines.push(headers.map(h => csvEscape(r[h] || '')).join(','));
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}

const csvText = fs.readFileSync(INPUT_PATH, 'utf8');
const rawRows = parseCsv(csvText);
const headers = rawRows[0].map(h => h.replace(/\r/g, ''));
const dataRowsArr = rawRows.slice(1).filter(r => r.some(v => v.trim() !== ''));
const dataRows = dataRowsArr.map(r => {
  const o = {};
  headers.forEach((h, i) => { o[h] = r[i] !== undefined ? r[i].replace(/\r/g, '') : ''; });
  return o;
});

console.log(`Loaded ${dataRows.length} data rows`);

const diffs = [];
const fixes = {};

// ---------- ch2-007 (correctIndex=2) ----------
fixes['ch2-007'] = {
  choice2: {
    before: '人間が持つ「常識」を教えることの難しさや、膨大な知識を手動で入力・管理することの限界が露呈したた',
    after: '人間が持つ「常識」を教えることの難しさや、膨大な知識を手動で入力・管理することの限界が露呈した',
    reason: '末尾の誤字「露呈したた」を「露呈した」に修正',
  },
  正答テキスト: {
    before: '人間が持つ「常識」を教えることの難しさや、膨大な知識を手動で入力・管理することの限界が露呈したた',
    after: '人間が持つ「常識」を教えることの難しさや、膨大な知識を手動で入力・管理することの限界が露呈した',
    reason: 'choice2 修正に伴い正答テキストを完全一致させる',
  },
  choice3: {
    before: '新しい技術が登場し、古い技術が廃れたためであるとして適用される技術',
    after: '新しい技術が登場し、古い技術が廃れたためである',
    reason: '不自然な「として適用される技術」を削除し、自然な誤答選択肢に整える',
  },
};

// ---------- ch8-005 (correctIndex=1) ----------
fixes['ch8-005'] = {
  choice1: {
    before: '医療診断・融資審査・採用選考など、AIの判断が人の生命・権利・機会に影響する高リスク領',
    after: '医療診断・融資審査・採用選考など、AIの判断が人の生命・権利・機会に影響する高リスク領域',
    reason: '末尾の途中切れ「高リスク領」を「高リスク領域」に補完',
  },
  正答テキスト: {
    before: '医療診断・融資審査・採用選考など、AIの判断が人の生命・権利・機会に影響する高リスク領',
    after: '医療診断・融資審査・採用選考など、AIの判断が人の生命・権利・機会に影響する高リスク領域',
    reason: 'choice1 修正に伴い正答テキストを完全一致させる',
  },
  choice3: {
    before: 'AIによる画像認識の精度向上に関する技術として適用される技術',
    after: 'AIによる画像認識の精度向上に関する技術',
    reason: '末尾の重複表現「として適用される技術」を削除し、自然な誤答選択肢に整える',
  },
};

// ---------- ch1-011 (correctIndex=0) ----------
fixes['ch1-011'] = {
  choice3: {
    before: '単一のタスクを高精度で実行するとして適用される技術',
    after: '単一のタスクを高精度で実行するAI',
    reason: '不自然な「として適用される技術」を削除し、特化型AIを示す自然な誤答に整える',
  },
};

// ---------- ch1-035 (correctIndex=3) ----------
fixes['ch1-035'] = {
  choice2: {
    before: 'チューリングテストは人間の思考を模倣する試験であるとして適用される技術',
    after: 'チューリングテストは人間の思考そのものを模倣する試験である',
    reason: '不自然な「として適用される技術」を削除し、自然な誤答選択肢に整える',
  },
};

// ---------- ch2-018 (correctIndex=0) ----------
fixes['ch2-018'] = {
  choice3: {
    before: 'AlphaGoは囲碁以外のゲームにも対応したAIであるとして適用される技術',
    after: 'AlphaGoは囲碁以外のゲームにも広く対応したAIである',
    reason: '不自然な「として適用される技術」を削除し、自然な誤答選択肢に整える',
  },
};

// ---------- ch3-012 (correctIndex=0) ----------
fixes['ch3-012'] = {
  choice3: {
    before: 'MAEは外れ値の影響を強く受けるがMSEは受けないとして適用される技術',
    after: 'MAEは外れ値の影響を強く受けるが、MSEは外れ値の影響を受けない',
    reason: '不自然な「として適用される技術」を削除し、自然な誤答選択肢に整える',
  },
};

// ---------- ch3-020 (correctIndex=0) ----------
fixes['ch3-020'] = {
  choice3: {
    before: '局所的な構造を無視して全体を一つにまとめる手法であるとして適用される技術',
    after: '局所的な構造を無視して、データ全体を一つにまとめる手法である',
    reason: '不自然な「として適用される技術」を削除し、自然な誤答選択肢に整える',
  },
};

// ---------- ch2-027 (correctIndex=3) ----------
fixes['ch2-027'] = {
  choice1: {
    before: 'AIが「データを用いた学習」によって、専門家の知識を補完することが可能になったことを示す見方',
    after: 'AIがデータを用いた学習によって、専門家の知識を補完できるようになったこと',
    reason: '不自然な「ことを示す見方」を削除し、自然な誤答選択肢に整える',
  },
};

// Apply fixes
let mutationCount = 0;
for (const row of dataRows) {
  const id = row.id;
  if (!fixes[id]) continue;
  const idFixes = fixes[id];
  for (const [col, spec] of Object.entries(idFixes)) {
    const before = row[col];
    if (before !== spec.before) {
      console.error(`MISMATCH for ${id}.${col}:`);
      console.error(`  expected: ${spec.before}`);
      console.error(`  actual  : ${before}`);
      process.exit(1);
    }
    row[col] = spec.after;
    diffs.push({ id, column: col, before: spec.before, after: spec.after, reason: spec.reason });
    mutationCount++;
  }
}

console.log(`Applied ${mutationCount} cell modifications`);

// Write output CSV
const out = buildCsv(headers, dataRows);
fs.writeFileSync(OUTPUT_PATH, out, 'utf8');
console.log(`Wrote ${OUTPUT_PATH}`);

// Write diff CSV
const diffLines = ['id,column,before,after'];
for (const d of diffs) {
  diffLines.push([d.id, d.column, d.before, d.after].map(csvEscape).join(','));
}
const diffDir = path.dirname(DIFF_PATH);
if (!fs.existsSync(diffDir)) fs.mkdirSync(diffDir, { recursive: true });
fs.writeFileSync(DIFF_PATH, diffLines.join('\n') + '\n', 'utf8');
console.log(`Wrote ${DIFF_PATH}`);

// Write final naturalize MD
const ids8 = ['ch2-007', 'ch8-005', 'ch1-011', 'ch1-035', 'ch2-018', 'ch3-012', 'ch3-020', 'ch2-027'];
const md = [];
md.push('# Step4g 最終自然化レポート');
md.push('');
md.push(`- 入力: ${path.basename(INPUT_PATH)}`);
md.push(`- 出力: ${path.basename(OUTPUT_PATH)}`);
md.push(`- 修正件数: ${mutationCount}`);
md.push('');
md.push('## 対象 8 ID');
md.push('');
md.push(`8 ID: ${ids8.join(' / ')}`);
md.push('');
md.push('## 修正内容（ID 別）');
md.push('');
for (const id of ids8) {
  md.push(`### ${id}`);
  md.push('');
  const f = fixes[id];
  if (!f) continue;
  for (const [col, spec] of Object.entries(f)) {
    md.push(`#### column: ${col}`);
    md.push('');
    md.push(`- before: ${spec.before}`);
    md.push(`- after: ${spec.after}`);
    md.push(`- 変更理由: ${spec.reason}`);
    md.push('');
  }
}
fs.writeFileSync(PINPOINT_MD_PATH, md.join('\n'), 'utf8');
console.log(`Wrote ${PINPOINT_MD_PATH}`);
