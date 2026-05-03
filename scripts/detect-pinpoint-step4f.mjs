/**
 * detect-pinpoint-step4f.mjs
 * Step4f ピンポイント修正対象 8 ID + 5 種禁止文字列の出現セルを検出し、
 * tmp/step4f-candidates.json に出力する。
 *
 * 対象 8 ID:
 *   ch5-033 / ch8-012 / ch2-013 / ch6-008 / ch2-028 / ch3-023 / ch7-013 / ch8-028
 *
 * 禁止文字列 (修正版 CSV で 0 件必須):
 *   - 末尾「CNNモ」 (後続文字なし)             [ch5-033]
 *   - 末尾「取得に原」 (後続文字なし)           [ch8-012]
 *   - 「選択肢と説明する内容」                  [ch2-013, ch6-008]
 *   - 「促進したを示す見方」                    [ch2-028]
 *   - 「として整理した説明」                    [ch3-023, ch7-013, ch8-028]
 *
 * Usage: node scripts/detect-pinpoint-step4f.mjs [inputCsvPath] [outputJsonPath]
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
  'ch5-033', 'ch8-012', 'ch2-013', 'ch6-008',
  'ch2-028', 'ch3-023', 'ch7-013', 'ch8-028',
];

// 禁止文字列定義
const BANNED_PATTERNS = [
  { name: 'CNNモ末尾', regex: /CNNモ$/, ids: ['ch5-033'] },
  { name: '取得に原末尾', regex: /取得に原$/, ids: ['ch8-012'] },
  { name: '選択肢と説明する内容', regex: /選択肢と説明する内容/g, ids: ['ch2-013', 'ch6-008'] },
  { name: '促進したを示す見方', regex: /促進したを示す見方/g, ids: ['ch2-028'] },
  { name: 'として整理した説明', regex: /として整理した説明/g, ids: ['ch3-023', 'ch7-013', 'ch8-028'] },
];

/**
 * RFC 4180 準拠 CSV を堅牢にパース
 */
function parseCsv(csvText) {
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
      // skip CR
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

function detect(rows, headers) {
  const candidates = [];

  for (const row of rows) {
    const id = row['id'] || '';
    const chapter = row['章'] || '';

    // 対象 8 ID は全カラム強制リストアップ
    const isTarget = TARGET_IDS.includes(id);

    for (const col of TARGET_COLUMNS) {
      if (!headers.includes(col)) continue;
      const cellValue = row[col] || '';

      // 禁止文字列マッチ
      for (const bp of BANNED_PATTERNS) {
        if (bp.regex.source.endsWith('$')) {
          // 末尾系: optionRationales は ' || ' 区切りで各ブロック末尾も確認
          if (col === 'optionRationales') {
            const blocks = cellValue.split(' || ');
            blocks.forEach((b, bi) => {
              const re = new RegExp(bp.regex.source);
              if (re.test(b)) {
                candidates.push({
                  id, chapter, column: col,
                  type: 'banned',
                  pattern: bp.name,
                  location: `block[${bi}]`,
                  value: b,
                  fullCell: cellValue,
                });
              }
            });
          } else {
            const re = new RegExp(bp.regex.source);
            if (re.test(cellValue)) {
              candidates.push({
                id, chapter, column: col,
                type: 'banned',
                pattern: bp.name,
                value: cellValue,
              });
            }
          }
        } else {
          // 全文検索系
          const re = new RegExp(bp.regex.source, 'g');
          if (re.test(cellValue)) {
            candidates.push({
              id, chapter, column: col,
              type: 'banned',
              pattern: bp.name,
              value: cellValue,
            });
          }
        }
      }

      if (isTarget) {
        const already = candidates.some(c => c.id === id && c.column === col && c.type === 'target_force');
        if (!already) {
          candidates.push({
            id, chapter, column: col,
            type: 'target_force',
            pattern: '(target id full dump)',
            value: cellValue,
          });
        }
      }
    }
  }

  return candidates;
}

function countOccurrences(rows) {
  const counts = {
    'CNNモ末尾': 0,
    '取得に原末尾': 0,
    '選択肢と説明する内容': 0,
    '促進したを示す見方': 0,
    'として整理した説明': 0,
  };

  for (const row of rows) {
    for (const col of TARGET_COLUMNS) {
      const v = row[col] || '';
      // CNNモ末尾: セル全体 or optionRationales の各ブロック末尾
      if (col === 'optionRationales') {
        const blocks = v.split(' || ');
        for (const b of blocks) {
          if (/CNNモ$/.test(b)) counts['CNNモ末尾']++;
          if (/取得に原$/.test(b)) counts['取得に原末尾']++;
        }
      } else {
        if (/CNNモ$/.test(v)) counts['CNNモ末尾']++;
        if (/取得に原$/.test(v)) counts['取得に原末尾']++;
      }
      const m1 = v.match(/選択肢と説明する内容/g);
      if (m1) counts['選択肢と説明する内容'] += m1.length;
      const m2 = v.match(/促進したを示す見方/g);
      if (m2) counts['促進したを示す見方'] += m2.length;
      const m3 = v.match(/として整理した説明/g);
      if (m3) counts['として整理した説明'] += m3.length;
    }
  }
  return counts;
}

const inputPath = process.argv[2] ||
  path.join(__dirname, '../../.harness/exports/questions-2026-05-02-step4e.csv');
const outputPath = process.argv[3] ||
  path.join(__dirname, '../tmp/step4f-candidates.json');

if (!fs.existsSync(inputPath)) {
  console.error(`ERROR: Input file not found: ${inputPath}`);
  process.exit(1);
}

const csvText = fs.readFileSync(inputPath, 'utf8');
const { headers, rows } = parseCsv(csvText);

console.log(`Parsed: ${rows.length} rows, ${headers.length} columns`);

const candidates = detect(rows, headers);
const counts = countOccurrences(rows);

const output = {
  inputFile: inputPath,
  parsedRows: rows.length,
  counts,
  candidates,
  candidateCount: candidates.length,
  targetIds: TARGET_IDS,
};

const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');

console.log('\n=== 禁止文字列 出現数 ===');
for (const [k, v] of Object.entries(counts)) {
  console.log(`  ${k}: ${v}`);
}
console.log(`\nCandidates: ${candidates.length}`);
console.log(`Output: ${outputPath}`);
