/**
 * detect-ai-style-step4.mjs
 * AI生成メタ語尾表現を検出し、tmp/step4-candidates.json に出力するスクリプト
 * Usage: node scripts/detect-ai-style-step4.mjs [inputCsvPath] [outputJsonPath]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 対象カラム
const TARGET_COLUMNS = ['choice0', 'choice1', 'choice2', 'choice3', '正答テキスト', 'explanation', 'optionRationales'];

// 対象 9 表現
const AI_PATTERNS = [
  'と説明する立場',
  'と位置づける見方',
  'と捉える説明',
  'として働く仕組み',
  'とされる技術である',
  'であるとする記述',
  'にあたるである',
  'とする立場',
  'と説明する選択肢',
];

/**
 * RFC 4180 準拠の CSV を堅牢にパースする
 * @param {string} csvText - CSV テキスト（BOM 付き可）
 * @returns {{ headers: string[], rows: Record<string, string>[] }}
 */
function parseCsv(csvText) {
  // BOM 除去
  const text = csvText.startsWith('﻿') ? csvText.slice(1) : csvText;
  const lines = [];
  let current = '';
  let inQuote = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (!inQuote) {
        inQuote = true;
        current += ch;
      } else if (text[i + 1] === '"') {
        current += '""';
        i++;
      } else {
        inQuote = false;
        current += ch;
      }
    } else if ((ch === '\r' || ch === '\n') && !inQuote) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      if (current.trim()) lines.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) lines.push(current);

  /**
   * 1行をフィールドに分割（引用符内のカンマは無視）
   */
  function parseLine(line) {
    const fields = [];
    let field = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (c === ',' && !inQ) {
        fields.push(field);
        field = '';
      } else {
        field += c;
      }
    }
    fields.push(field);
    return fields;
  }

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).filter(l => l.trim() !== '').map(l => {
    const fields = parseLine(l);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = fields[i] !== undefined ? fields[i] : '';
    });
    return row;
  });

  return { headers, rows };
}

/**
 * 対象表現を検出する
 */
function detectPatterns(rows, headers) {
  const candidates = [];

  for (const row of rows) {
    const id = row['id'] || '';
    const chapter = row['章'] || '';

    for (const col of TARGET_COLUMNS) {
      if (!headers.includes(col)) continue;
      const cellValue = row[col] || '';

      for (const pattern of AI_PATTERNS) {
        if (cellValue.includes(pattern)) {
          candidates.push({
            id,
            chapter,
            column: col,
            pattern,
            value: cellValue,
          });
          break; // 同じセルに複数パターンがあっても1件とする（各パターンに対して別途記録）
        }
      }

      // 複数パターンを同一セルで記録する場合の対処
      // → パターンごとにチェックして複数マッチも記録
    }
  }

  return candidates;
}

/**
 * 全パターンを個別に検出（1セル内の複数パターンも記録）
 */
function detectAllPatterns(rows, headers) {
  const candidates = [];

  for (const row of rows) {
    const id = row['id'] || '';
    const chapter = row['章'] || '';

    for (const col of TARGET_COLUMNS) {
      if (!headers.includes(col)) continue;
      const cellValue = row[col] || '';

      for (const pattern of AI_PATTERNS) {
        if (cellValue.includes(pattern)) {
          candidates.push({
            id,
            chapter,
            column: col,
            pattern,
            value: cellValue,
          });
        }
      }
    }
  }

  return candidates;
}

/**
 * パターンの合計出現数をカウント（正規表現マッチ）
 */
function countPatternOccurrences(csvText) {
  const text = csvText.replace(/^﻿/, '');
  let total = 0;
  const counts = {};
  for (const pattern of AI_PATTERNS) {
    const matches = text.match(new RegExp(pattern, 'g'));
    const count = matches ? matches.length : 0;
    counts[pattern] = count;
    total += count;
  }
  return { total, counts };
}

// メイン処理
const inputPath = process.argv[2] || path.join(__dirname, '../.harness/exports/questions-2026-05-02-step3c.csv');
const outputPath = process.argv[3] || path.join(__dirname, '../tmp/step4-candidates.json');

if (!fs.existsSync(inputPath)) {
  console.error(`ERROR: Input file not found: ${inputPath}`);
  process.exit(1);
}

const csvText = fs.readFileSync(inputPath, 'utf8');
const { headers, rows } = parseCsv(csvText);

console.log(`Parsed: ${rows.length} rows, ${headers.length} columns`);

const candidates = detectAllPatterns(rows, headers);
const { total, counts } = countPatternOccurrences(csvText);

const output = {
  inputFile: inputPath,
  totalOccurrences: total,
  patternCounts: counts,
  candidates,
  candidateCount: candidates.length,
};

// 出力ディレクトリ作成
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');

console.log(`\nPattern occurrences (total: ${total}):`);
for (const [pattern, count] of Object.entries(counts)) {
  if (count > 0) console.log(`  "${pattern}": ${count}`);
}
console.log(`\nCandidates found: ${candidates.length}`);
console.log(`Output: ${outputPath}`);
