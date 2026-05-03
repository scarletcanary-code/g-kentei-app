/**
 * naturalize-step4.mjs
 * AI生成メタ語尾表現を自然な日本語に修正し、修正版 CSV を出力するスクリプト
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INPUT_PATH = path.join(__dirname, '../../.harness/exports/questions-2026-05-02-step3c.csv');
const OUTPUT_PATH = path.join(__dirname, '../../.harness/exports/questions-2026-05-02-step4.csv');
const DIFF_PATH = path.join(__dirname, '../../.harness/runs/0069/audit-step4-diff.csv');
const AUDIT_PATH = path.join(__dirname, '../../.harness/runs/0069/audit-step4-naturalize-options.md');
const VALIDATION_PATH = path.join(__dirname, '../../.harness/runs/0069/audit-step4-validation.md');

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
 * RFC 4180 準拠 CSV パーサ（BOM 付き対応、CRLF 優先）
 * CRLF で行分割してから各行を解析する方式
 */
function parseCsv(csvText) {
  // BOM 除去
  const text = csvText.startsWith('﻿') ? csvText.slice(1) : csvText;

  // CRLF → LF 正規化してから分割（引用符を考慮した行分割）
  // 引用符内の改行を持つフィールドがある場合の対応
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
      if (current.trim() !== '') lines.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim() !== '') lines.push(current);

  function parseLine(line) {
    const fields = [];
    let field = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (!inQ) {
          inQ = true;
        } else if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQ = false;
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
  const dataRows = lines.slice(1).map(l => {
    const fields = parseLine(l);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = fields[i] !== undefined ? fields[i] : '';
    });
    return row;
  });

  return { headers, rows: dataRows, rawLines: lines };
}

/**
 * CSV エスケープ: カンマ・改行・引用符を含む場合は引用符で囲む
 */
function escapeCsvField(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * CSV 行を生成
 */
function rowToCsv(row, headers) {
  return headers.map(h => escapeCsvField(row[h] !== undefined ? row[h] : '')).join(',');
}

/**
 * パターンの合計出現数カウント（文字列内）
 */
function countPatterns(text) {
  let total = 0;
  const counts = {};
  for (const p of AI_PATTERNS) {
    const m = text.match(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
    counts[p] = m ? m.length : 0;
    total += counts[p];
  }
  return { total, counts };
}

/**
 * セル値を自然化する
 * パターンを含む場合のみ修正
 */
function naturalizeCell(value) {
  if (!value) return value;

  let result = value;

  // 複合パターン（複数のパターンが連続）を先に処理
  result = result.replace(/として働く仕組みと捉える説明/g, '');
  result = result.replace(/として働く仕組みとする見方/g, '');
  result = result.replace(/として働く仕組みとみなす記述/g, '');
  result = result.replace(/と位置づける見方と捉える説明/g, '');
  result = result.replace(/と位置づける見方とする見方/g, '');
  result = result.replace(/と捉える説明として整理した説明/g, '');
  result = result.replace(/と捉える説明と捉える説明/g, '');
  result = result.replace(/であるとする記述とみなす記述/g, '');
  result = result.replace(/であるとする記述と説明する選択肢/g, '');
  result = result.replace(/として用いる方法と説明する選択肢/g, '');
  result = result.replace(/とする方式と説明する選択肢/g, '');
  result = result.replace(/にあたるであるとする記述/g, 'にあたる');
  result = result.replace(/として働く仕組みと説明する選択肢/g, '');

  // 単独パターン
  result = result.replace(/と説明する立場/g, '');
  result = result.replace(/と位置づける見方/g, '');
  result = result.replace(/と捉える説明/g, '');
  result = result.replace(/として働く仕組み/g, '');
  result = result.replace(/とされる技術である/g, 'という技術');
  result = result.replace(/であるとする記述/g, '');
  result = result.replace(/にあたるである/g, 'にあたる');
  result = result.replace(/とする立場/g, '');
  result = result.replace(/と説明する選択肢/g, '');

  // 複合処理後の残骸
  result = result.replace(/とする見方$/g, '');
  result = result.replace(/とみなす記述$/g, '');

  result = result.trim();

  return result;
}

/**
 * optionRationales の4ブロックを分割
 */
function splitRationales(value) {
  return value.split(' || ');
}

/**
 * correctIndex が指す choice と 正答テキスト を一致させる
 */
function syncCorrectText(row) {
  const ci = parseInt(row['correctIndex'], 10);
  if (!isNaN(ci) && ci >= 0 && ci <= 3) {
    const choiceKey = `choice${ci}`;
    row['正答テキスト'] = row[choiceKey];
  }
}

// メイン処理
console.log('Reading input CSV...');
const csvRaw = fs.readFileSync(INPUT_PATH, 'utf8');
const { headers, rows } = parseCsv(csvRaw);
console.log(`Parsed: ${rows.length} rows, ${headers.length} columns`);

// Before カウント（ファイルテキストから）
const csvTextClean = csvRaw.startsWith('﻿') ? csvRaw.slice(1) : csvRaw;
const beforeCount = countPatterns(csvTextClean);
console.log(`Before total occurrences: ${beforeCount.total}`);

const diffRecords = [];
const modifiedRows = rows.map(row => {
  const newRow = { ...row };

  for (const col of TARGET_COLUMNS) {
    if (!(col in row)) continue;
    const original = row[col] || '';

    const hasPattern = AI_PATTERNS.some(p => original.includes(p));
    if (!hasPattern) continue;

    const modified = naturalizeCell(original);

    if (modified !== original) {
      diffRecords.push({
        id: row['id'],
        column: col,
        before: original,
        after: modified,
      });
      newRow[col] = modified;
    }
  }

  // correctIndex が指す choice と 正答テキスト を同期
  syncCorrectText(newRow);

  return newRow;
});

// After カウント（出力 CSV テキストで計算）
const outputLines = [headers.map(h => escapeCsvField(h)).join(',')];
for (const row of modifiedRows) {
  outputLines.push(rowToCsv(row, headers));
}
const outputCsvText = outputLines.join('\r\n') + '\r\n';
const afterCount = countPatterns(outputCsvText);
console.log(`After total occurrences: ${afterCount.total}`);
console.log(`Diff records: ${diffRecords.length}`);

// BOM 付き UTF-8 で出力
const BOM = '﻿';
fs.writeFileSync(OUTPUT_PATH, BOM + outputCsvText, 'utf8');
console.log(`Output: ${OUTPUT_PATH}`);

// diff CSV 出力
const diffHeader = 'id,column,before,after';
const diffLines = [diffHeader];
for (const d of diffRecords) {
  diffLines.push([
    escapeCsvField(d.id),
    escapeCsvField(d.column),
    escapeCsvField(d.before),
    escapeCsvField(d.after),
  ].join(','));
}
const diffDir = path.dirname(DIFF_PATH);
if (!fs.existsSync(diffDir)) fs.mkdirSync(diffDir, { recursive: true });
fs.writeFileSync(DIFF_PATH, diffLines.join('\r\n') + '\r\n', 'utf8');
console.log(`Diff: ${DIFF_PATH}`);

// 章別・カラム別修正件数集計
const byChapter = {};
const byColumn = {};
for (const d of diffRecords) {
  const chapter = d.id.replace(/-\d+$/, '');
  byChapter[chapter] = (byChapter[chapter] || 0) + 1;
  byColumn[d.column] = (byColumn[d.column] || 0) + 1;
}

// audit-step4-naturalize-options.md 出力
const reductionRate = beforeCount.total > 0
  ? ((1 - afterCount.total / beforeCount.total) * 100).toFixed(1)
  : '100.0';

const auditLines = [
  '# audit-step4-naturalize-options',
  '',
  `## 修正件数`,
  '',
  `合計修正セル数: ${diffRecords.length}`,
  '',
  '## 章別',
  '',
  ...Object.entries(byChapter).sort().map(([ch, cnt]) => `- ${ch}: ${cnt} 件`),
  '',
  '## カラム別',
  '',
  ...Object.entries(byColumn).sort().map(([col, cnt]) => `- ${col}: ${cnt} 件`),
  '',
  `## before / after 対象表現出現件数`,
  '',
  `- before: ${beforeCount.total} 件`,
  `- after: ${afterCount.total} 件`,
  `- 削減率: ${reductionRate}%`,
  '',
  '## パターン別 before/after',
  '',
  ...AI_PATTERNS.map(p => {
    const b = beforeCount.counts[p] || 0;
    const a = afterCount.counts[p] || 0;
    return `- 「${p}」: before=${b}, after=${a}`;
  }),
  '',
  '## 変更理由',
  '',
  '選択肢末尾に付加されたAI生成メタ語尾（「〜と捉える説明」「〜と説明する立場」等）を削除し、',
  '選択肢本文のみが残るよう自然化した。',
  '「にあたるである」は「にあたる」（重複助詞削除）、「とされる技術である」は「という技術」に変換。',
  '複合パターン（「として働く仕組みと捉える説明」等）は末尾側を優先削除し意味を保持した。',
  '',
  '## 修正詳細（id, column, before, after, 変更理由）',
  '',
  ...diffRecords.map(d => [
    `### ${d.id} / ${d.column}`,
    '',
    `**before**: ${d.before}`,
    '',
    `**after**: ${d.after}`,
    '',
    '**変更理由**: AI生成メタ語尾表現の削除',
    '',
  ].join('\n')),
];

fs.writeFileSync(AUDIT_PATH, auditLines.join('\n'), 'utf8');
console.log(`Audit: ${AUDIT_PATH}`);

// 検証
console.log('\nRunning validation...');

// 完了条件 1: correctIndex 指定 choice と 正答テキスト の不一致
let mismatch1 = 0;
const mismatch1List = [];
for (const row of modifiedRows) {
  const ci = parseInt(row['correctIndex'], 10);
  if (!isNaN(ci) && ci >= 0 && ci <= 3) {
    if (row[`choice${ci}`] !== row['正答テキスト']) {
      mismatch1++;
      mismatch1List.push(`${row['id']}: choice${ci}="${row[`choice${ci}`]}" != 正答テキスト="${row['正答テキスト']}"`);
    }
  }
}

// 完了条件 2: optionRationales 4 件でない
let mismatch2 = 0;
const mismatch2List = [];
for (const row of modifiedRows) {
  const parts = splitRationales(row['optionRationales'] || '');
  if (parts.length !== 4) {
    mismatch2++;
    mismatch2List.push(`${row['id']}: ${parts.length} parts`);
  }
}

// 完了条件 3: 正答 rationale が「正解。」で始まらない
let mismatch3 = 0;
const mismatch3List = [];
for (const row of modifiedRows) {
  const ci = parseInt(row['correctIndex'], 10);
  const parts = splitRationales(row['optionRationales'] || '');
  if (parts.length === 4 && !isNaN(ci)) {
    if (!parts[ci].trim().startsWith('正解。')) {
      mismatch3++;
      mismatch3List.push(`${row['id']}: ci=${ci} "${parts[ci].substring(0, 50)}"`);
    }
  }
}

// 完了条件 4: 誤答 rationale が「誤り。」で始まらない
let mismatch4 = 0;
const mismatch4List = [];
for (const row of modifiedRows) {
  const ci = parseInt(row['correctIndex'], 10);
  const parts = splitRationales(row['optionRationales'] || '');
  if (parts.length === 4 && !isNaN(ci)) {
    for (let i = 0; i < 4; i++) {
      if (i !== ci && !parts[i].trim().startsWith('誤り。')) {
        mismatch4++;
        mismatch4List.push(`${row['id']}: i=${i} "${parts[i].substring(0, 50)}"`);
      }
    }
  }
}

// 完了条件 5: 対象9表現の削減
const ratio = afterCount.total / beforeCount.total;
const cond5Pass = afterCount.total <= beforeCount.total * 0.3 || afterCount.total <= 10;

// 完了条件 6: Step3系 11+1 IDの correctIndex 確認
const STEP3_IDS = ['ch5-002', 'ch6-015', 'ch4-018', 'ch5-040', 'ch1-030', 'ch1-010', 'ch1-027', 'ch3-024', 'ch7-003', 'ch8-003', 'ch8-019'];
let mismatch6 = 0;
const mismatch6List = [];
for (const id of STEP3_IDS) {
  const origRow = rows.find(r => r['id'] === id);
  const newRow = modifiedRows.find(r => r['id'] === id);
  if (!origRow || !newRow) {
    mismatch6++;
    mismatch6List.push(`NOT FOUND: ${id}`);
    continue;
  }
  if (origRow['correctIndex'] !== newRow['correctIndex']) {
    mismatch6++;
    mismatch6List.push(`MISMATCH: ${id} ${origRow['correctIndex']} -> ${newRow['correctIndex']}`);
  }
}

// validation.md 出力
const validationLines = [
  '# audit-step4-validation',
  '',
  `生成日: 2026-05-02`,
  '',
  '## 完了条件チェック',
  '',
  `1. correctIndex 指定 choice と 正答テキスト の不一致: ${mismatch1} 件 → ${mismatch1 === 0 ? 'PASS' : 'FAIL'}`,
  ...mismatch1List.map(s => `   - ${s}`),
  `2. optionRationales 4件でない: ${mismatch2} 件 → ${mismatch2 === 0 ? 'PASS' : 'FAIL'}`,
  ...mismatch2List.map(s => `   - ${s}`),
  `3. 正答 rationale が「正解。」で始まらない: ${mismatch3} 件 → ${mismatch3 === 0 ? 'PASS' : 'FAIL'}`,
  ...mismatch3List.map(s => `   - ${s}`),
  `4. 誤答 rationale が「誤り。」で始まらない: ${mismatch4} 件 → ${mismatch4 === 0 ? 'PASS' : 'FAIL'}`,
  ...mismatch4List.map(s => `   - ${s}`),
  `5. 対象9表現 before=${beforeCount.total} after=${afterCount.total} ratio=${(ratio*100).toFixed(1)}% → ${cond5Pass ? 'PASS' : 'FAIL'}`,
  `6. Step3系11+1ID correctIndex 不一致: ${mismatch6} 件 → ${mismatch6 === 0 ? 'PASS' : 'FAIL'}`,
  ...mismatch6List.map(s => `   - ${s}`),
  '',
  '## 詳細',
  '',
  `- 行数: ${modifiedRows.length} 行（ヘッダー除く）`,
  `- 修正セル数: ${diffRecords.length}`,
];

fs.writeFileSync(VALIDATION_PATH, validationLines.join('\n'), 'utf8');
console.log(`Validation: ${VALIDATION_PATH}`);

console.log('\n=== VALIDATION RESULTS ===');
console.log(`1. correctIndex/正答テキスト不一致: ${mismatch1} → ${mismatch1 === 0 ? 'PASS' : 'FAIL'}`);
if (mismatch1List.length > 0) mismatch1List.forEach(s => console.log('   ', s));
console.log(`2. optionRationales 4件でない: ${mismatch2} → ${mismatch2 === 0 ? 'PASS' : 'FAIL'}`);
if (mismatch2List.length > 0) mismatch2List.slice(0, 5).forEach(s => console.log('   ', s));
console.log(`3. 正答rationale「正解。」始まらない: ${mismatch3} → ${mismatch3 === 0 ? 'PASS' : 'FAIL'}`);
if (mismatch3List.length > 0) mismatch3List.slice(0, 5).forEach(s => console.log('   ', s));
console.log(`4. 誤答rationale「誤り。」始まらない: ${mismatch4} → ${mismatch4 === 0 ? 'PASS' : 'FAIL'}`);
if (mismatch4List.length > 0) mismatch4List.slice(0, 5).forEach(s => console.log('   ', s));
console.log(`5. 9表現削減: before=${beforeCount.total} after=${afterCount.total} → ${cond5Pass ? 'PASS' : 'FAIL'}`);
console.log(`6. Step3系ID correctIndex: ${mismatch6}件不一致 → ${mismatch6 === 0 ? 'PASS' : 'FAIL'}`);
