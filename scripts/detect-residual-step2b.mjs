/**
 * detect-residual-step2b.mjs
 * Step2b: 残存する文欠け・optionRationales ねじれを検出する。
 *
 * 使い方:
 *   node scripts/detect-residual-step2b.mjs [csvPath]
 *
 * デフォルト入力:
 *   ../.harness/exports/questions-2026-05-02-step2.csv
 *
 * 出力:
 *   tmp/step2b-candidates.json
 *
 * 検出項目:
 *   1. 重点 4 ID（ch1-035 / ch4-033 / ch6-003 / ch6-008）の choice + 正答テキスト 文欠け
 *   2. 文末禁止パターン（「中国語の部屋」「大きな誤」「生成す」末尾）
 *   3. ch2-010 / ch1-035 / ch5-002 の rationale ねじれ
 *   4. correctIndex 指定 choice と 正答テキスト の不一致（全 292 問）
 *   5. optionRationales のブロック数が 4 でない
 *   6. 正答位置の rationale が「正解。」で始まらない
 *   7. 誤答位置の rationale が「誤り。」で始まらない
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const repoRoot = join(projectRoot, '..');

const csvPath = process.argv[2]
  || join(repoRoot, '.harness/exports/questions-2026-05-02-step2.csv');

const outPath = join(projectRoot, 'tmp/step2b-candidates.json');

mkdirSync(join(projectRoot, 'tmp'), { recursive: true });

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

// ---- Load CSV ----
const rawText = readFileSync(csvPath, 'utf8');
const allRows = parseCsv(rawText);

const headers = allRows[0];
const dataRows = allRows.slice(1).filter(r => r.some(c => c.trim() !== ''));

const colIdx = {};
for (let i = 0; i < headers.length; i++) {
  colIdx[headers[i]] = i;
}

const SEPARATOR = ' || ';

// ---- 文末禁止パターン ----
const TRUNCATION_PATTERNS = [
  { pattern: /中国語の部屋$/, label: '「中国語の部屋」末尾' },
  { pattern: /大きな誤$/, label: '「大きな誤」末尾' },
  { pattern: /生成す$/, label: '「生成す」末尾' },
];

// ---- Detection ----
const candidates = [];

for (const row of dataRows) {
  const id = row[colIdx['id']] || '';
  if (!id) continue;

  const correctIndex = parseInt(row[colIdx['correctIndex']] || '0');
  const seikai = row[colIdx['正答テキスト']] || '';
  const choices = [0, 1, 2, 3].map(i => row[colIdx['choice' + i]] || '');
  const correctChoice = choices[correctIndex];
  const or = row[colIdx['optionRationales']] || '';
  const blocks = or.split(SEPARATOR);

  // (1) correctIndex 指定 choice と 正答テキスト の不一致
  if (seikai !== correctChoice) {
    candidates.push({
      type: 'seikai_mismatch',
      id,
      correctIndex,
      correctChoice: correctChoice.slice(0, 120),
      seikaiValue: seikai.slice(0, 120),
    });
  }

  // (2) optionRationales のブロック数が 4 でない
  if (blocks.length !== 4) {
    candidates.push({
      type: 'block_count',
      id,
      count: blocks.length,
      value: or.slice(0, 200),
    });
  }

  // (3) 正答位置の rationale が「正解。」で始まらない
  if (blocks.length >= correctIndex + 1 && !blocks[correctIndex].startsWith('正解。')) {
    candidates.push({
      type: 'correct_label_missing',
      id,
      correctIndex,
      actual: blocks[correctIndex].slice(0, 120),
    });
  }

  // (4) 誤答位置の rationale が「誤り。」で始まらない
  if (blocks.length === 4) {
    for (let i = 0; i < 4; i++) {
      if (i !== correctIndex && !blocks[i].startsWith('誤り。')) {
        candidates.push({
          type: 'wrong_label_missing',
          id,
          position: i,
          correctIndex,
          actual: blocks[i].slice(0, 120),
        });
      }
    }
  }

  // (5) 文末禁止パターン（choice0〜3 + 正答テキスト）
  const textCells = [
    { col: 'choice0', val: choices[0] },
    { col: 'choice1', val: choices[1] },
    { col: 'choice2', val: choices[2] },
    { col: 'choice3', val: choices[3] },
    { col: '正答テキスト', val: seikai },
  ];
  for (const { col, val } of textCells) {
    for (const { pattern, label } of TRUNCATION_PATTERNS) {
      if (pattern.test(val)) {
        candidates.push({
          type: 'truncation_pattern',
          id,
          column: col,
          label,
          value: val.slice(-50),
        });
      }
    }
  }

  // (6) ch2-010: rationale ねじれ（choice0 = 正解。始まり、choice1 = 誤り。始まり なら逆転）
  if (id === 'ch2-010' && blocks.length === 4) {
    if (blocks[0].startsWith('正解。') || blocks[1].startsWith('誤り。') ||
        !blocks[1].startsWith('正解。') || !blocks[0].startsWith('誤り。')) {
      candidates.push({
        type: 'rationale_twist',
        id,
        note: 'ch2-010 choice0/choice1 rationale content mismatch (Minsky vs McCarthy)',
        block0: blocks[0].slice(0, 100),
        block1: blocks[1].slice(0, 100),
      });
    }
  }

  // (7) ch1-035: choice0 rationale 内容ねじれ確認
  if (id === 'ch1-035' && blocks.length === 4) {
    candidates.push({
      type: 'rationale_review',
      id,
      note: 'ch1-035 choice0 rationale needs content fix',
      block0: blocks[0].slice(0, 150),
    });
  }

  // (8) ch5-002: 複数正解リスク確認
  if (id === 'ch5-002') {
    candidates.push({
      type: 'multiple_correct_risk',
      id,
      note: 'ch5-002 複数正解リスク（Step3 送り）',
      block0: blocks.length > 0 ? blocks[0].slice(0, 150) : '',
    });
  }
}

writeFileSync(outPath, JSON.stringify(candidates, null, 2), 'utf8');

// ---- Summary ----
const byType = {};
for (const c of candidates) {
  byType[c.type] = (byType[c.type] || 0) + 1;
}

console.log(`Detected ${candidates.length} issues.`);
for (const [type, count] of Object.entries(byType)) {
  console.log(`  - ${type}: ${count}`);
}
console.log(`Output: ${outPath}`);
