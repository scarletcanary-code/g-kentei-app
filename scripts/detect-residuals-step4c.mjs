/**
 * detect-residuals-step4c.mjs
 * Step4c 残存不自然語尾を検出し、tmp/step4c-candidates.json に出力するスクリプト
 * Usage: node scripts/detect-residuals-step4c.mjs [inputCsvPath] [outputJsonPath]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 対象カラム
const TARGET_COLUMNS = ['choice0', 'choice1', 'choice2', 'choice3', '正答テキスト', 'explanation', 'optionRationales'];

// 完全消去対象 5 表現
const EXTERMINATE_PATTERNS = [
  'とするである',
  'として用いる方法',
  'という技術',
  'という手法・アプローチ',
  'とみなす記述',
];

// 大幅削減対象 3 表現
const REDUCE_PATTERNS = [
  '説明する考え方',
  '手法にあたる',
  '技術にあたる',
];

// 必須 7 ID
const PRIORITY_IDS = ['ch3-026', 'ch4-027', 'ch6-018', 'ch7-029', 'ch6-027', 'ch8-027', 'ch8-024'];

/**
 * RFC 4180 準拠の CSV を堅牢にパースする（複数行フィールド対応）
 */
function parseCsv(csvText) {
  // BOM 除去
  const text = csvText.startsWith('﻿') ? csvText.slice(1) : csvText;

  const rows = [];
  let inQuote = false;
  let current = '';
  let row = [];

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (!inQuote) {
        inQuote = true;
      } else if (i + 1 < text.length && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuote = false;
      }
    } else if (c === ',' && !inQuote) {
      row.push(current);
      current = '';
    } else if (c === '\n' && !inQuote) {
      row.push(current);
      current = '';
      rows.push(row);
      row = [];
    } else if (c === '\r' && !inQuote) {
      // CR を無視
    } else {
      current += c;
    }
  }
  if (current || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  const rawHeaders = rows[0];
  const headers = rawHeaders.map(h => h.replace(/\r/g, ''));
  const dataRows = rows.slice(1).filter(r => r.some(v => v.trim() !== ''));

  const records = dataRows.map(r => {
    const record = {};
    headers.forEach((h, i) => {
      record[h] = r[i] !== undefined ? r[i].replace(/\r/g, '') : '';
    });
    return record;
  });

  return { headers, rows: records };
}

/**
 * 完全消去対象 + 大幅削減対象 + ch8-024「責任を負う体」末尾 + 重点 ID を検出
 */
function detect(rows, headers) {
  const candidates = [];

  for (const row of rows) {
    const id = row['id'] || '';
    const chapter = row['章'] || '';
    const isPriority = PRIORITY_IDS.includes(id);

    for (const col of TARGET_COLUMNS) {
      if (!headers.includes(col)) continue;
      const cellValue = row[col] || '';

      // 完全消去対象チェック
      for (const pattern of EXTERMINATE_PATTERNS) {
        if (cellValue.includes(pattern)) {
          candidates.push({
            id, chapter, column: col,
            type: 'exterminate',
            pattern,
            value: cellValue,
            priority: isPriority,
          });
        }
      }

      // 大幅削減対象チェック
      for (const pattern of REDUCE_PATTERNS) {
        if (cellValue.includes(pattern)) {
          candidates.push({
            id, chapter, column: col,
            type: 'reduce',
            pattern,
            value: cellValue,
            priority: isPriority,
          });
        }
      }

      // ch8-024 特別チェック：「責任を負う体」末尾
      if (id === 'ch8-024' && (col === 'choice3' || col === '正答テキスト')) {
        if (cellValue.endsWith('責任を負う体')) {
          candidates.push({
            id, chapter, column: col,
            type: 'ch8024_truncated',
            pattern: '責任を負う体(末尾)',
            value: cellValue,
            priority: true,
          });
        }
      }

      // 重点 ID は必ず含める（上記で検出されなくてもマーク）
      if (isPriority) {
        const alreadyAdded = candidates.some(c => c.id === id && c.column === col);
        if (!alreadyAdded) {
          candidates.push({
            id, chapter, column: col,
            type: 'priority_force',
            pattern: '(priority check)',
            value: cellValue,
            priority: true,
          });
        }
      }
    }
  }

  return candidates;
}

/**
 * 出現数カウント（生テキスト対象）
 */
function countOccurrences(csvText) {
  const text = csvText.replace(/^﻿/, '');
  const exterminate = {};
  for (const p of EXTERMINATE_PATTERNS) {
    const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = text.match(new RegExp(escaped, 'g'));
    exterminate[p] = m ? m.length : 0;
  }
  const reduce = {};
  for (const p of REDUCE_PATTERNS) {
    const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = text.match(new RegExp(escaped, 'g'));
    reduce[p] = m ? m.length : 0;
  }
  return { exterminate, reduce };
}

// メイン処理
const inputPath = process.argv[2] ||
  path.join(__dirname, '../.harness/exports/questions-2026-05-02-step4b.csv');
const outputPath = process.argv[3] ||
  path.join(__dirname, '../tmp/step4c-candidates.json');

if (!fs.existsSync(inputPath)) {
  console.error(`ERROR: Input file not found: ${inputPath}`);
  process.exit(1);
}

const csvText = fs.readFileSync(inputPath, 'utf8');
const { headers, rows } = parseCsv(csvText);

console.log(`Parsed: ${rows.length} rows, ${headers.length} columns`);

const candidates = detect(rows, headers);
const counts = countOccurrences(csvText);

const output = {
  inputFile: inputPath,
  parsedRows: rows.length,
  counts,
  candidates,
  candidateCount: candidates.length,
};

const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');

console.log('\n=== 完全消去対象 ===');
for (const [p, c] of Object.entries(counts.exterminate)) {
  console.log(`  "${p}": ${c}`);
}
console.log('\n=== 大幅削減対象 ===');
for (const [p, c] of Object.entries(counts.reduce)) {
  console.log(`  "${p}": ${c}`);
}
console.log(`\nCandidates found: ${candidates.length}`);
console.log(`Output: ${outputPath}`);
