/**
 * detect-rationale-alignment-step2.mjs
 * Step2: optionRationales の正誤ラベル整合性を検出し tmp/step2-candidates.json に出力する。
 *
 * 使い方:
 *   node scripts/detect-rationale-alignment-step2.mjs
 *
 * 入力:
 *   ../.harness/exports/questions-2026-05-02-step1b.csv
 *
 * 出力:
 *   tmp/step2-candidates.json  - 検出結果の配列
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const repoRoot = join(projectRoot, '..');
const csvPath = join(repoRoot, '.harness/exports/questions-2026-05-02-step1b.csv');
const outPath = join(projectRoot, 'tmp/step2-candidates.json');

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

// ---- 既知の要確認 14 ID ----
const KNOWN_IDS = new Set([
  'ch1-004', 'ch1-012', 'ch1-022', 'ch1-035', 'ch2-010', 'ch2-028',
  'ch3-036', 'ch4-022', 'ch4-032', 'ch4-033', 'ch5-002', 'ch5-028',
  'ch6-035', 'ch8-028',
]);

// ---- misconceptionTarget 補完対象 4 ID ----
const SUPPLEMENT_IDS = new Set(['ch1-019', 'ch1-023', 'ch1-030', 'ch2-010']);

// ---- optionRationales の区切り文字 ----
const SEPARATOR = ' || ';

// ---- Detection ----
const candidates = [];

for (const row of dataRows) {
  const id = row[colIdx['id']] || '';
  if (!id) continue;

  const correctIndex = parseInt(row[colIdx['correctIndex']] || '0');
  const seikai = row[colIdx['正答テキスト']] || '';
  const correctChoice = row[colIdx['choice' + correctIndex]] || '';
  const or = row[colIdx['optionRationales']] || '';
  const mt = row[colIdx['misconceptionTarget']] || '';
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
      actual: blocks[correctIndex].slice(0, 100),
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
          actual: blocks[i].slice(0, 100),
        });
      }
    }
  }

  // (5) misconceptionTarget が空欄
  if (!mt || mt.trim() === '') {
    candidates.push({
      type: 'misconceptionTarget_empty',
      id,
    });
  }
}

// ---- 既知 14 ID + 補完 4 ID を必ず候補に含める（漏れがあれば追加） ----
const detectedIds = new Set(candidates.map(c => c.id));
for (const id of [...KNOWN_IDS, ...SUPPLEMENT_IDS]) {
  if (!detectedIds.has(id)) {
    candidates.push({
      type: 'known_id_manual_check',
      id,
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
