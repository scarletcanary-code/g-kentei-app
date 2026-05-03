/**
 * _apply-step2b-fixes.mjs
 * Step2b: 文欠け補完 + optionRationales ねじれ修正を適用して修正版 CSV を出力する。
 *
 * 使い方:
 *   node scripts/_apply-step2b-fixes.mjs
 *
 * 入力:
 *   ../.harness/exports/questions-2026-05-02-step2.csv
 *
 * 出力:
 *   ../.harness/exports/questions-2026-05-02-step2b.csv
 *   ../.harness/runs/0065/audit-step2b-fixes.md
 *   ../.harness/runs/0065/audit-step2b-review-needed.csv
 *   ../.harness/runs/0065/audit-step2b-validation.md
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const repoRoot = join(projectRoot, '..');

const csvIn = join(repoRoot, '.harness/exports/questions-2026-05-02-step2.csv');
const csvOut = join(repoRoot, '.harness/exports/questions-2026-05-02-step2b.csv');
const runsDir = join(repoRoot, '.harness/runs/0065');
const fixesLog = join(runsDir, 'audit-step2b-fixes.md');
const reviewNeededCsv = join(runsDir, 'audit-step2b-review-needed.csv');
const validationLog = join(runsDir, 'audit-step2b-validation.md');

mkdirSync(runsDir, { recursive: true });

// ---- CSV parser (BOM-aware, RFC 4180 準拠) ----
function splitLines(text) {
  const lines = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuote && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuote = !inQuote;
        cur += ch;
      }
    } else if ((ch === '\r' || ch === '\n') && !inQuote) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      lines.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.length > 0) lines.push(cur);
  return lines;
}

function splitRow(line) {
  const fields = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === ',' && !inQuote) {
      fields.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

function parseCsv(text) {
  const raw = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
  const lines = splitLines(raw).filter(l => l.trim() !== '');
  return lines.map(splitRow);
}

// ---- CSV serializer (BOM 付き、RFC 4180) ----
function escapeField(val) {
  if (val.includes('"') || val.includes(',') || val.includes('\n') || val.includes('\r')) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}

function serializeCsv(rows) {
  return '﻿' + rows.map(r => r.map(escapeField).join(',')).join('\r\n') + '\r\n';
}

// ---- Load CSV ----
const rawText = readFileSync(csvIn, 'utf8');
const allRows = parseCsv(rawText);
const headers = allRows[0];
const dataRows = allRows.slice(1).filter(r => r.some(c => c.trim() !== ''));

const colIdx = {};
for (let i = 0; i < headers.length; i++) {
  colIdx[headers[i]] = i;
}

const SEPARATOR = ' || ';

// ---- 修正定義 ----
// 各エントリ: { id, column, before, after }
const FIXES = [];

// ---- 文欠け補完 ----
// ch1-035: choice3 + 正答テキスト
const CH1_035_CHOICE3_AFTER = 'チューリングテストに合格できる機械でも真の意味理解（意識）を持つとは限らないという批判を『中国語の部屋』として提示した';
FIXES.push(
  { id: 'ch1-035', column: 'choice3', after: CH1_035_CHOICE3_AFTER },
  { id: 'ch1-035', column: '正答テキスト', after: CH1_035_CHOICE3_AFTER },
);

// ch4-033: choice3 + 正答テキスト
const CH4_033_CHOICE3_AFTER = '予測した確率分布と正解の分布のずれを対数を用いて定量化した誤差関数で、正解クラスの予測確率が低いほど大きな誤差となる';
FIXES.push(
  { id: 'ch4-033', column: 'choice3', after: CH4_033_CHOICE3_AFTER },
  { id: 'ch4-033', column: '正答テキスト', after: CH4_033_CHOICE3_AFTER },
);

// ch6-003: choice1 + 正答テキスト
const CH6_003_CHOICE1_AFTER = 'Transformerのデコーダ部分を応用し、直前のトークン列から次のトークンを予測することで言語を自己回帰的に生成するモデル';
FIXES.push(
  { id: 'ch6-003', column: 'choice1', after: CH6_003_CHOICE1_AFTER },
  { id: 'ch6-003', column: '正答テキスト', after: CH6_003_CHOICE1_AFTER },
);

// ch6-008: choice1 + 正答テキスト
const CH6_008_CHOICE1_AFTER = 'データに段階的にノイズを加えていく前向き過程の逆を学習し（逆拡散過程）、ノイズから元のデータを復元することで高品質なデータを生成するモデル';
FIXES.push(
  { id: 'ch6-008', column: 'choice1', after: CH6_008_CHOICE1_AFTER },
  { id: 'ch6-008', column: '正答テキスト', after: CH6_008_CHOICE1_AFTER },
);

// ---- optionRationales 修正定義 ----
// 修正対象: id → 各 choiceN の新 rationale（null = 変更なし）
const RATIONALE_FIXES = {
  'ch2-010': {
    0: '誤り。マービン・ミンスキーはAI研究の先駆者の一人だが、『Artificial Intelligence』という語を提唱した人物ではない。',
    1: '正解。ジョン・マッカーシーがダートマス会議で『Artificial Intelligence』という語を提唱した。',
    2: null,
    3: null,
  },
  'ch1-035': {
    0: '誤り。チューリングテスト単体の説明であり、『中国語の部屋』がチューリングテストへの批判として位置づけられる点を説明していない。',
    1: null,
    2: null,
    3: null,
  },
  'ch5-002': {
    0: '誤り。計算量削減もプーリング層の効果の一つだが、この問題では位置ずれへの頑健性を含めた主な役割を問うているため、choice1 がより適切。',
    1: null,
    2: null,
    3: null,
  },
};

// ---- Apply fixes ----
// column → value map per id (text fixes)
const textFixMap = {};
for (const fix of FIXES) {
  if (!textFixMap[fix.id]) textFixMap[fix.id] = {};
  textFixMap[fix.id][fix.column] = fix.after;
}

// Track actual changes
const appliedFixes = [];

const newRows = [headers];
for (const row of dataRows) {
  const newRow = [...row];
  const id = row[colIdx['id']] || '';

  // Text fixes
  if (textFixMap[id]) {
    for (const [col, after] of Object.entries(textFixMap[id])) {
      const ci = colIdx[col];
      if (ci !== undefined) {
        const before = row[ci];
        if (before !== after) {
          newRow[ci] = after;
          appliedFixes.push({ id, column: col, before, after });
        }
      }
    }
  }

  // optionRationales fixes
  if (RATIONALE_FIXES[id]) {
    const ci = colIdx['optionRationales'];
    const orBefore = row[ci] || '';
    const blocks = orBefore.split(SEPARATOR);
    let changed = false;
    const overrides = RATIONALE_FIXES[id];
    for (let i = 0; i < 4; i++) {
      if (overrides[i] !== null && overrides[i] !== undefined) {
        if (blocks[i] !== overrides[i]) {
          blocks[i] = overrides[i];
          changed = true;
        }
      }
    }
    if (changed) {
      const orAfter = blocks.join(SEPARATOR);
      newRow[ci] = orAfter;
      appliedFixes.push({ id, column: 'optionRationales', before: orBefore, after: orAfter });
    }
  }

  newRows.push(newRow);
}

// ---- Write output CSV ----
writeFileSync(csvOut, serializeCsv(newRows), 'utf8');
console.log(`Written: ${csvOut}`);

// ---- Validation ----
const TRUNCATION_PATTERNS = [
  { pattern: /中国語の部屋$/, label: '「中国語の部屋」末尾' },
  { pattern: /大きな誤$/, label: '「大きな誤」末尾' },
  { pattern: /生成す$/, label: '「生成す」末尾' },
];

let seikaiMismatch = 0;
let blockCountViolation = 0;
let correctLabelViolation = 0;
let wrongLabelViolation = 0;
let truncationViolation = 0;
const truncationDetails = [];

for (const row of newRows.slice(1)) {
  const id = row[colIdx['id']] || '';
  const correctIndex = parseInt(row[colIdx['correctIndex']] || '0');
  const seikai = row[colIdx['正答テキスト']] || '';
  const correctChoice = row[colIdx['choice' + correctIndex]] || '';
  const or = row[colIdx['optionRationales']] || '';
  const blocks = or.split(SEPARATOR);

  if (seikai !== correctChoice) {
    seikaiMismatch++;
    console.error(`[ERROR] seikai_mismatch: ${id} correctIndex=${correctIndex}`);
    console.error(`  choice${correctIndex}: ${correctChoice.slice(0, 80)}`);
    console.error(`  正答テキスト: ${seikai.slice(0, 80)}`);
  }

  if (blocks.length !== 4) {
    blockCountViolation++;
    console.error(`[ERROR] block_count: ${id} blocks=${blocks.length}`);
  }

  if (blocks.length >= correctIndex + 1 && !blocks[correctIndex].startsWith('正解。')) {
    correctLabelViolation++;
    console.error(`[ERROR] correct_label_missing: ${id} correctIndex=${correctIndex} actual="${blocks[correctIndex].slice(0, 60)}"`);
  }

  if (blocks.length === 4) {
    for (let i = 0; i < 4; i++) {
      if (i !== correctIndex && !blocks[i].startsWith('誤り。')) {
        wrongLabelViolation++;
        console.error(`[ERROR] wrong_label_missing: ${id} position=${i} actual="${blocks[i].slice(0, 60)}"`);
      }
    }
  }

  const textCells = [
    { col: 'choice0', val: row[colIdx['choice0']] || '' },
    { col: 'choice1', val: row[colIdx['choice1']] || '' },
    { col: 'choice2', val: row[colIdx['choice2']] || '' },
    { col: 'choice3', val: row[colIdx['choice3']] || '' },
    { col: '正答テキスト', val: seikai },
  ];
  for (const { col, val } of textCells) {
    for (const { pattern, label } of TRUNCATION_PATTERNS) {
      if (pattern.test(val)) {
        truncationViolation++;
        truncationDetails.push({ id, col, label });
        console.error(`[ERROR] truncation: ${id} ${col} ${label}`);
      }
    }
  }
}

// ---- Write fixes log ----
const chapterFixes = {};
const columnFixes = {};
for (const f of appliedFixes) {
  const ch = f.id.split('-')[0];
  chapterFixes[ch] = (chapterFixes[ch] || 0) + 1;
  columnFixes[f.column] = (columnFixes[f.column] || 0) + 1;
}

const fixesLines = [
  '# audit-step2b-fixes.md',
  '',
  '## 修正件数',
  '',
  `合計: ${appliedFixes.length} 件`,
  '',
  '## 章別',
  '',
  ...Object.entries(chapterFixes).sort().map(([ch, n]) => `- ${ch}: ${n} 件`),
  '',
  '## カラム別',
  '',
  ...Object.entries(columnFixes).sort().map(([col, n]) => `- ${col}: ${n} 件`),
  '',
  '## 修正詳細',
  '',
];

for (const f of appliedFixes) {
  fixesLines.push(`### ${f.id} / ${f.column}`);
  fixesLines.push('');
  fixesLines.push('**before:**');
  fixesLines.push('```');
  fixesLines.push(f.before);
  fixesLines.push('```');
  fixesLines.push('');
  fixesLines.push('**after:**');
  fixesLines.push('```');
  fixesLines.push(f.after);
  fixesLines.push('```');
  fixesLines.push('');
}

writeFileSync(fixesLog, fixesLines.join('\n'), 'utf8');
console.log(`Written: ${fixesLog}`);

// ---- Write review-needed.csv ----
const reviewNeededLines = [
  'id,column,reason,suggested_action',
  'ch5-002,optionRationales,複数正解リスク（choice0 と choice1 がともに正しい可能性）,Step3 で問題文・選択肢の本格修正を行う',
];
writeFileSync(reviewNeededCsv, reviewNeededLines.join('\n') + '\n', 'utf8');
console.log(`Written: ${reviewNeededCsv}`);

// ---- Write validation log ----
const dataCount = newRows.length - 1;
const validationLines = [
  '# audit-step2b-validation.md',
  '',
  `検証日時: 2026-05-02`,
  `入力: questions-2026-05-02-step2.csv`,
  `出力: questions-2026-05-02-step2b.csv`,
  `データ行数: ${dataCount}`,
  '',
  '## 完了条件チェック',
  '',
  `1. correctIndex 指定 choice と 正答テキスト の不一致: ${seikaiMismatch} 件 → ${seikaiMismatch === 0 ? 'PASS' : 'FAIL'}`,
  `2. optionRationales 4 件でない: ${blockCountViolation} 件 → ${blockCountViolation === 0 ? 'PASS' : 'FAIL'}`,
  `3. 正答 rationale が「正解。」で始まらない: ${correctLabelViolation} 件 → ${correctLabelViolation === 0 ? 'PASS' : 'FAIL'}`,
  `4. 誤答 rationale が「誤り。」で始まらない: ${wrongLabelViolation} 件 → ${wrongLabelViolation === 0 ? 'PASS' : 'FAIL'}`,
  `5. 「中国語の部屋」「大きな誤」「生成す」末尾セル: ${truncationViolation} 件 → ${truncationViolation === 0 ? 'PASS' : 'FAIL'}`,
  '',
  truncationViolation > 0 ? '### 末尾パターン詳細\n' + truncationDetails.map(d => `- ${d.id} ${d.col} ${d.label}`).join('\n') : '',
  '',
  `## 総合: ${(seikaiMismatch + blockCountViolation + correctLabelViolation + wrongLabelViolation + truncationViolation) === 0 ? 'PASS' : 'FAIL'}`,
];

writeFileSync(validationLog, validationLines.filter(l => l !== null).join('\n'), 'utf8');
console.log(`Written: ${validationLog}`);

// ---- Summary ----
console.log('\n===== Summary =====');
console.log(`Applied fixes: ${appliedFixes.length}`);
for (const f of appliedFixes) {
  console.log(`  [${f.id}] ${f.column}`);
}
console.log('\n===== Validation =====');
console.log(`1. seikai_mismatch:      ${seikaiMismatch} violations ${seikaiMismatch === 0 ? 'PASS' : 'FAIL'}`);
console.log(`2. block_count:          ${blockCountViolation} violations ${blockCountViolation === 0 ? 'PASS' : 'FAIL'}`);
console.log(`3. correct_label:        ${correctLabelViolation} violations ${correctLabelViolation === 0 ? 'PASS' : 'FAIL'}`);
console.log(`4. wrong_label:          ${wrongLabelViolation} violations ${wrongLabelViolation === 0 ? 'PASS' : 'FAIL'}`);
console.log(`5. truncation_pattern:   ${truncationViolation} violations ${truncationViolation === 0 ? 'PASS' : 'FAIL'}`);
const allPass = (seikaiMismatch + blockCountViolation + correctLabelViolation + wrongLabelViolation + truncationViolation) === 0;
console.log(`\nOverall: ${allPass ? 'PASS' : 'FAIL'}`);
