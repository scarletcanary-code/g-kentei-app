/**
 * _apply-step1-fixes.mjs
 * 途中切れ補完を CSV に適用して questions-2026-05-02-step1.csv を出力する。
 * 内部作業用スクリプト。
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const repoRoot = join(projectRoot, '..');
const inPath = join(repoRoot, '.harness/exports/questions-2026-04-30.csv');
const outPath = join(repoRoot, '.harness/exports/questions-2026-05-02-step1.csv');

function splitRow(line) {
  const fields = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) { fields.push(cur); cur = ''; }
    else cur += ch;
  }
  fields.push(cur);
  return fields;
}

function splitLines(text) {
  const lines = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuote && text[i + 1] === '"') { cur += '"'; i++; }
      else { inQuote = !inQuote; cur += ch; }
    } else if ((ch === '\r' || ch === '\n') && !inQuote) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      lines.push(cur); cur = '';
    } else cur += ch;
  }
  if (cur.length > 0) lines.push(cur);
  return lines;
}

function escCsvField(v) {
  if (v === undefined || v === null) return '';
  const s = String(v);
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

// ---- Patch definitions ----
// { id, column, fixed }
const PATCHES = [
  {
    id: 'ch4-018',
    column: 'choice0',
    original: 'XOR問題のデータは1本の直線では正例と負例を分けられない（線形分離不可能）ため、線形分類器である単純パーセプトロンでは',
    fixed: 'XOR問題のデータは1本の直線では正例と負例を分けられない（線形分離不可能）ため、線形分類器である単純パーセプトロンでは解くことができない。',
    reason: '文末が「では」で途中切れ。explanationの内容から補完。',
  },
  {
    id: 'ch4-024',
    column: 'choice2',
    original: 'ReLU関数は入力が0以下のとき出力が0になるため実質的に半分のニューロンしか活性化されず、それを考慮して分散を2倍にしているか',
    fixed: 'ReLU関数は入力が0以下のとき出力が0になるため実質的に半分のニューロンしか活性化されず、それを考慮して分散を2倍にしている。',
    reason: '文末「いるか」は疑問形として不完全。explanationに「分散を2倍にし」とあり説明文として終止。',
  },
  {
    id: 'ch5-017',
    column: 'choice0',
    original: '入力データの周囲に値（0など）を埋めることで、畳み込み後の特徴マップサイズが縮小しすぎるのを',
    fixed: '入力データの周囲に値（0など）を埋めることで、畳み込み後の特徴マップサイズが縮小しすぎるのを防ぐ手法。',
    reason: '文末「のを」で途中切れ。explanationに「縮小しすぎる問題を防ぎ」とあり補完。',
  },
  {
    id: 'ch7-008',
    column: 'choice2',
    original: '時間経過に伴うデータ分布の変化（モデルドリフト）への継続的な対処と、システムの監視・再学習が',
    fixed: '時間経過に伴うデータ分布の変化（モデルドリフト）への継続的な対処と、システムの監視・再学習が必要になること。',
    reason: '文末「再学習が」で途中切れ。explanationに「再学習が不可欠」とあり補完。',
  },
  {
    id: 'ch7-020',
    column: 'choice2',
    original: 'データの前処理・特徴量エンジニアリング・アルゴリズム選択・ハイパーパラメータ調整といった機械学習の構築プロセスを',
    fixed: 'データの前処理・特徴量エンジニアリング・アルゴリズム選択・ハイパーパラメータ調整といった機械学習の構築プロセスを自動化する技術。',
    reason: '文末「プロセスを」で途中切れ。explanationに「構築プロセスを自動化する技術」とあり補完。',
  },
];

// ch7-012 optionRationales: fix first block "だから" → "だから。"
const CH7012_ORIGINAL_BLOCK = '正解。学習済みモデルの管理を行うための仕組みだから';
const CH7012_FIXED_BLOCK = '正解。学習済みモデルの管理を行うための仕組みだから。';

// ---- Load and process CSV ----
const rawText = readFileSync(inPath, 'utf8');
const hasBom = rawText.startsWith('﻿');
const textNoBom = hasBom ? rawText.slice(1) : rawText;

const rawLines = splitLines(textNoBom);
const headerLine = rawLines[0];
const dataLines = rawLines.slice(1).filter(l => l.trim() !== '');

const headers = splitRow(headerLine);
const colIdx = {};
headers.forEach((h, i) => { colIdx[h] = i; });

const patchMap = {};
for (const p of PATCHES) {
  if (!patchMap[p.id]) patchMap[p.id] = [];
  patchMap[p.id].push(p);
}

const fixes = [];
const outputLines = [headerLine];

for (const line of dataLines) {
  const row = splitRow(line);
  const id = row[colIdx['id']] || '';
  let modified = false;

  // Apply cell-level patches
  if (patchMap[id]) {
    for (const patch of patchMap[id]) {
      const ci = colIdx[patch.column];
      if (ci !== undefined && row[ci] === patch.original) {
        row[ci] = patch.fixed;
        fixes.push({ id, column: patch.column, before: patch.original, after: patch.fixed, reason: patch.reason });
        modified = true;
      }
    }
  }

  // ch7-012 optionRationales fix
  if (id === 'ch7-012') {
    const ci = colIdx['optionRationales'];
    if (ci !== undefined) {
      const val = row[ci];
      // Replace only the first block
      const blocks = val.split(' || ');
      if (blocks[0] === CH7012_ORIGINAL_BLOCK) {
        blocks[0] = CH7012_FIXED_BLOCK;
        const newVal = blocks.join(' || ');
        fixes.push({
          id,
          column: 'optionRationales',
          before: val,
          after: newVal,
          reason: 'optionRationales 最初のブロック「だから」末尾に句点追加。',
        });
        row[ci] = newVal;
        modified = true;
      }
    }
  }

  outputLines.push(row.map(escCsvField).join(','));
}

// ---- Write output ----
const BOM = '﻿';
const CRLF = '\r\n';
const output = (hasBom ? BOM : '') + outputLines.join(CRLF) + CRLF;
writeFileSync(outPath, output, 'utf8');

console.log(`Applied ${fixes.length} fixes.`);
console.log(`Output: ${outPath}`);
for (const f of fixes) {
  console.log(`  [${f.id}] ${f.column}: "${f.before.slice(0, 40)}..." → "${f.after.slice(0, 40)}..."`);
}
