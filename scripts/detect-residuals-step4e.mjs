/**
 * detect-residuals-step4e.mjs
 * Step4e 残存 AI 生成不自然表現を検出し、tmp/step4e-candidates.json に出力するスクリプト
 *
 * 対象:
 *  - 完全消去 5 表現 (after=0 必須)
 *  - 大幅削減 2 表現 (30% 以下 or 絶対 5 件以下)
 *  - 重点 38 ID (force priority)
 *
 * Usage: node scripts/detect-residuals-step4e.mjs [inputCsvPath] [outputJsonPath]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 対象カラム
const TARGET_COLUMNS = ['choice0', 'choice1', 'choice2', 'choice3', '正答テキスト', 'explanation', 'optionRationales'];

// 完全消去対象 5 表現
const EXTERMINATE_PATTERNS = [
  'を実現するとする方式',
  'に近い記述',
  'にあたるを',
  '概念・アプローチ',
  'にあたるものである',
];

// 大幅削減対象 2 表現
// 「文末のとされる」は別途文脈チェック
const REDUCE_PATTERNS = [
  'であるとされる',
  'とされる',
];

// 重点 38 ID
const PRIORITY_IDS = [
  'ch1-009', 'ch1-012', 'ch1-015', 'ch1-017', 'ch1-018', 'ch1-028', 'ch1-037',
  'ch2-002', 'ch2-022',
  'ch3-002', 'ch3-022', 'ch3-027', 'ch3-030', 'ch3-045',
  'ch4-017', 'ch4-022', 'ch4-031', 'ch4-033',
  'ch5-010', 'ch5-017',
  'ch6-002', 'ch6-005', 'ch6-013', 'ch6-029', 'ch6-031', 'ch6-035',
  'ch7-003', 'ch7-015', 'ch7-017', 'ch7-024', 'ch7-027',
  'ch8-009', 'ch8-014', 'ch8-015', 'ch8-016', 'ch8-017', 'ch8-018', 'ch8-029',
];

/**
 * RFC 4180 準拠の CSV を堅牢にパースする
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
 * 「文末のとされる」を検出（句読点・|| 区切り・セル末尾の直前で「とされる」「とされる。」が現れるもの）
 * `であるとされる` を含む箇所は除外（reduce 側で個別カウント）
 */
function findTrailingTosareru(value) {
  const matches = [];
  // セル/節境界（。 || 末尾）の直前の「とされる」
  // ただし「であるとされる」はそれ自体カウント対象なので別表現として扱うため除外
  const re = /([^あ-ん]?)とされる(。?)(\s*\|\||$|。|」|]|）|\)|\s*\r?\n)/g;
  let m;
  while ((m = re.exec(value)) !== null) {
    // 直前 4 文字に「である」が含まれる場合、それは別パターン
    const startPos = m.index;
    const before = value.slice(Math.max(0, startPos - 3), startPos + (m[1] ? 1 : 0));
    if (before.endsWith('である')) continue;
    matches.push({ pos: startPos, snippet: value.slice(Math.max(0, startPos - 10), Math.min(value.length, startPos + 15)) });
  }
  return matches;
}

/**
 * 検出
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

      // 大幅削減対象 (であるとされる)
      if (cellValue.includes('であるとされる')) {
        candidates.push({
          id, chapter, column: col,
          type: 'reduce',
          pattern: 'であるとされる',
          value: cellValue,
          priority: isPriority,
        });
      }

      // 大幅削減対象 (文末のとされる)
      const trailMatches = findTrailingTosareru(cellValue);
      if (trailMatches.length > 0) {
        candidates.push({
          id, chapter, column: col,
          type: 'reduce',
          pattern: '文末のとされる',
          value: cellValue,
          snippets: trailMatches.map(m => m.snippet),
          priority: isPriority,
        });
      }
    }

    // 重点 38 ID は対象 7 カラム全てに force candidate を追加（後で手動修正用）
    if (isPriority) {
      for (const col of TARGET_COLUMNS) {
        if (!headers.includes(col)) continue;
        const alreadyAdded = candidates.some(c => c.id === id && c.column === col);
        if (!alreadyAdded) {
          candidates.push({
            id, chapter, column: col,
            type: 'priority_force',
            pattern: '(priority check)',
            value: row[col] || '',
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
  // 大幅削減
  const dearuTosareru = (text.match(/であるとされる/g) || []).length;
  // 文末のとされる: 「。」「||」「,」「行末」の直前の「とされる」、ただし「であるとされる」を除外
  // ここはセル単位ではなく全文ざっくりカウント（修正前後の比較用）
  // 「である」の直後に「とされる」が来るパターンを除外して数える
  let trailingCount = 0;
  // 全「とされる」出現
  const allTosareru = text.match(/とされる/g) || [];
  // 「であるとされる」を引いた残りで、句読点系の前にあるものを文末扱いにする
  // 厳密には parseCsv した上で各セルを精査するべきだが、生テキスト側での目安として
  // 「とされる(。|」|」|\r?\n|"|,|$|\s*\|\|)」のうち「であるとされる」でないもの
  const re = /とされる(。|」|]|\)|"|\r?\n|\s*\|\||,)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const start = m.index;
    const before = text.slice(Math.max(0, start - 3), start);
    if (before === 'である') continue;
    trailingCount++;
  }
  return {
    exterminate,
    reduce: {
      'であるとされる': dearuTosareru,
      '文末のとされる': trailingCount,
      '(参考)とされる総出現': allTosareru.length,
    },
  };
}

// メイン処理
const inputPath = process.argv[2] ||
  path.join(__dirname, '../../.harness/exports/questions-2026-05-02-step4d.csv');
const outputPath = process.argv[3] ||
  path.join(__dirname, '../tmp/step4e-candidates.json');

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

console.log('\n=== 完全消去対象 (5 表現) ===');
for (const [p, c] of Object.entries(counts.exterminate)) {
  console.log(`  "${p}": ${c}`);
}
console.log('\n=== 大幅削減対象 (2 表現) ===');
for (const [p, c] of Object.entries(counts.reduce)) {
  console.log(`  "${p}": ${c}`);
}
console.log(`\nCandidates found: ${candidates.length}`);
console.log(`Output: ${outputPath}`);
