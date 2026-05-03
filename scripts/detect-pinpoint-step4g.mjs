/**
 * detect-pinpoint-step4g.mjs
 * Step4g ピンポイント修正対象 8 ID + 5 種禁止文字列の出現セルを検出し、
 * tmp/step4g-coverage-check.json および tmp/step4g-out-of-scope.json に出力する。
 *
 * 対象 8 ID:
 *   ch2-007 / ch8-005 / ch1-011 / ch1-035 / ch2-018 / ch3-012 / ch3-020 / ch2-027
 *
 * 禁止文字列 (修正版 CSV で 0 件必須):
 *   - 「露呈したた」                  [ch2-007]
 *   - 末尾「高リスク領」(後続「域」なし) [ch8-005]
 *   - 「として適用される技術」          [ch2-007/ch8-005/ch1-011/ch1-035/ch2-018/ch3-012/ch3-020]
 *   - 「技術として適用される技術」      [ch8-005] (上の特殊ケース)
 *   - 「ことを示す見方」               [ch2-027]
 *
 * Usage: node scripts/detect-pinpoint-step4g.mjs [inputCsvPath] [outputDir]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TARGET_COLUMNS = [
  'choice0', 'choice1', 'choice2', 'choice3',
  '正答テキスト', 'explanation', 'optionRationales',
];

const TARGET_IDS = [
  'ch2-007', 'ch8-005', 'ch1-011', 'ch1-035',
  'ch2-018', 'ch3-012', 'ch3-020', 'ch2-027',
];

// 禁止文字列定義
// kind: 'global' (CSV 全体), 'cellTail' (末尾形式・セル単位)
const BANNED_PATTERNS = [
  { name: '露呈したた', kind: 'global', regex: /露呈したた/g },
  { name: '高リスク領末尾', kind: 'cellTail', regex: /高リスク領$/ },
  { name: 'として適用される技術', kind: 'global', regex: /として適用される技術/g },
  { name: '技術として適用される技術', kind: 'global', regex: /技術として適用される技術/g },
  { name: 'ことを示す見方', kind: 'global', regex: /ことを示す見方/g },
];

/**
 * RFC 4180 準拠 CSV パーサ
 */
function parseCsv(csvText) {
  const text = csvText.startsWith('﻿') ? csvText.slice(1) : csvText;
  const rows = [];
  let inQ = false;
  let cur = '';
  let row = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (!inQ) inQ = true;
      else if (i + 1 < text.length && text[i + 1] === '"') { cur += '"'; i++; }
      else inQ = false;
    } else if (c === ',' && !inQ) {
      row.push(cur);
      cur = '';
    } else if (c === '\n' && !inQ) {
      row.push(cur);
      cur = '';
      rows.push(row);
      row = [];
    } else if (c === '\r' && !inQ) {
      // skip CR
    } else {
      cur += c;
    }
  }
  if (cur || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  const headers = rows[0].map(h => h.replace(/\r/g, ''));
  const dataRows = rows.slice(1).filter(r => r.some(v => v.trim() !== ''));
  const records = dataRows.map(r => {
    const o = {};
    headers.forEach((h, i) => { o[h] = r[i] !== undefined ? r[i].replace(/\r/g, '') : ''; });
    return o;
  });
  return { headers, rows: records };
}

function scanGlobal(rows, headers, regex) {
  const ids = new Set();
  const occurrences = [];
  for (const row of rows) {
    const id = row.id;
    for (const col of TARGET_COLUMNS) {
      if (!headers.includes(col)) continue;
      const v = row[col] || '';
      const m = v.match(regex);
      if (m) {
        ids.add(id);
        occurrences.push({ id, column: col, count: m.length, value: v });
      }
    }
  }
  return { ids: Array.from(ids), occurrences };
}

function scanCellTail(rows, headers, regex) {
  const ids = new Set();
  const occurrences = [];
  // セル単位での「末尾」ヒット。 optionRationales については ' || ' 区切りの各ブロック末尾も判定。
  const tailRe = new RegExp(regex.source);
  for (const row of rows) {
    const id = row.id;
    for (const col of TARGET_COLUMNS) {
      if (!headers.includes(col)) continue;
      const v = row[col] || '';
      if (col === 'optionRationales') {
        const blocks = v.split(' || ');
        blocks.forEach((b, bi) => {
          if (tailRe.test(b)) {
            ids.add(id);
            occurrences.push({ id, column: col, location: `block[${bi}]`, value: b });
          }
        });
      } else {
        if (tailRe.test(v)) {
          ids.add(id);
          occurrences.push({ id, column: col, value: v });
        }
      }
    }
  }
  return { ids: Array.from(ids), occurrences };
}

const inputPath = process.argv[2] ||
  path.join(__dirname, '../../.harness/exports/questions-2026-05-02-step4f.csv');
const outDir = process.argv[3] || path.join(__dirname, '../tmp');

if (!fs.existsSync(inputPath)) {
  console.error(`ERROR: Input file not found: ${inputPath}`);
  process.exit(1);
}
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const csvText = fs.readFileSync(inputPath, 'utf8');
const { headers, rows } = parseCsv(csvText);

console.log(`Parsed: ${rows.length} rows, ${headers.length} columns`);

const targetSet = new Set(TARGET_IDS);
const coverage = [];
const outOfScope = [];

for (const bp of BANNED_PATTERNS) {
  const { ids, occurrences } = bp.kind === 'cellTail'
    ? scanCellTail(rows, headers, bp.regex)
    : scanGlobal(rows, headers, bp.regex);

  const inside = ids.filter(i => targetSet.has(i));
  const outside = ids.filter(i => !targetSet.has(i));

  const totalCount = bp.kind === 'cellTail'
    ? occurrences.length
    : occurrences.reduce((s, o) => s + o.count, 0);

  const entry = {
    禁止文字列: bp.name,
    全件数: totalCount,
    出現する全ID: ids,
    指定8ID内: inside,
    指定8ID外: outside,
  };
  coverage.push(entry);

  if (outside.length > 0) {
    outOfScope.push({
      pattern: bp.name,
      outsideIds: outside,
      occurrences: occurrences.filter(o => !targetSet.has(o.id)),
    });
  }
}

const coveragePath = path.join(outDir, 'step4g-coverage-check.json');
fs.writeFileSync(coveragePath, JSON.stringify(coverage, null, 2), 'utf8');
console.log(`\nWrote coverage: ${coveragePath}`);

const outOfScopePath = path.join(outDir, 'step4g-out-of-scope.json');
fs.writeFileSync(outOfScopePath, JSON.stringify(outOfScope, null, 2), 'utf8');
console.log(`Wrote out-of-scope: ${outOfScopePath}`);

console.log('\n=== Coverage Summary ===');
for (const c of coverage) {
  console.log(`- ${c.禁止文字列}: total=${c.全件数}, inside8=${c.指定8ID内.length}, outside8=${c.指定8ID外.length}`);
  if (c.指定8ID外.length > 0) {
    console.log(`    OUT-OF-SCOPE IDs: ${c.指定8ID外.join(', ')}`);
  }
}

if (outOfScope.length > 0) {
  console.error('\nWARNING: 8 ID 外で禁止文字列が検出されました。Planner に AC 改訂を依頼してください。');
  process.exitCode = 2;
} else {
  console.log('\nAll banned patterns are confined within target 8 IDs.');
}
