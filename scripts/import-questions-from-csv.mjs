/**
 * import-questions-from-csv.mjs
 *
 * 人手レビュー後の改訂 CSV を ch*.json に書き戻すスクリプト。
 *
 * Usage:
 *   node scripts/import-questions-from-csv.mjs [CSV_PATH] [--dry-run]
 *
 * CSV_PATH 省略時デフォルト: ../.harness/imports/questions-2026-04-30_exam_quality_revised.csv
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const repoRoot = join(projectRoot, '..');
const dataDir = join(projectRoot, 'src/data/questions');

// CLI 引数解析
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const csvArg = args.find((a) => !a.startsWith('--'));
const csvPath = csvArg
  ? csvArg
  : join(repoRoot, '.harness/imports/questions-2026-04-30_exam_quality_revised.csv');

const EXPECTED_HEADERS = [
  'id', '章', 'question',
  'choice0', 'choice1', 'choice2', 'choice3',
  'correctIndex', '正答テキスト',
  'explanation',
  'difficulty', 'tags',
  'source_ref',
  'learningObjective', 'cognitiveLevel', 'misconceptionTarget',
  'optionRationales',
];

const COGNITIVE_LEVELS = new Set(['recall', 'understand', 'apply', 'compare']);

// ─── RFC 4180 CSV パーサ ────────────────────────────────────────────────────

/**
 * RFC 4180 に準拠した CSV パース。
 * - ダブルクォートで囲まれたフィールド内の CRLF・カンマ・"" を正しく処理する。
 * @param {string} text BOM 除去済みの CSV 文字列
 * @returns {string[][]} 行ごとの列配列
 */
function parseCsv(text) {
  const rows = [];
  let pos = 0;
  const len = text.length;

  while (pos < len) {
    const row = [];
    // 行末（\r\n または \n）に当たるまで列を読む
    while (true) {
      if (pos >= len) {
        // ファイル末尾
        row.push('');
        break;
      }
      if (text[pos] === '"') {
        // クォートフィールド
        pos++; // 開きクォートをスキップ
        let field = '';
        while (true) {
          if (pos >= len) {
            throw new Error(`Unterminated quoted field at position ${pos}`);
          }
          if (text[pos] === '"') {
            if (pos + 1 < len && text[pos + 1] === '"') {
              // エスケープされたクォート ""
              field += '"';
              pos += 2;
            } else {
              // 閉じクォート
              pos++;
              break;
            }
          } else {
            field += text[pos];
            pos++;
          }
        }
        row.push(field);
        // 次はカンマか行末のはず
        if (pos < len && text[pos] === ',') {
          pos++;
        } else {
          // 行末 or ファイル末尾
          break;
        }
      } else {
        // 非クォートフィールド
        let field = '';
        while (pos < len && text[pos] !== ',' && text[pos] !== '\r' && text[pos] !== '\n') {
          field += text[pos];
          pos++;
        }
        row.push(field);
        if (pos < len && text[pos] === ',') {
          pos++;
        } else {
          break;
        }
      }
    }
    rows.push(row);
    // CRLF または LF をスキップ
    if (pos < len && text[pos] === '\r') pos++;
    if (pos < len && text[pos] === '\n') pos++;
  }
  return rows;
}

// ─── メイン ─────────────────────────────────────────────────────────────────

console.log(`[import] CSV: ${csvPath}`);
console.log(`[import] dry-run: ${dryRun}`);

// CSV 読み込み + BOM 除去
const rawBuf = readFileSync(csvPath);
let rawText = rawBuf.toString('utf8');
if (rawText.startsWith('﻿')) {
  rawText = rawText.slice(1);
  console.log('[import] BOM detected and removed.');
}

// パース
const allRows = parseCsv(rawText);

// 末尾の空行を除去
while (allRows.length > 0 && allRows[allRows.length - 1].every((c) => c === '')) {
  allRows.pop();
}

// バリデーション 1: ヘッダ列チェック
const headerRow = allRows[0];
if (headerRow.length !== EXPECTED_HEADERS.length) {
  console.error(
    `[ERROR] Header column count mismatch: expected ${EXPECTED_HEADERS.length}, got ${headerRow.length}`
  );
  process.exit(1);
}
for (let i = 0; i < EXPECTED_HEADERS.length; i++) {
  if (headerRow[i] !== EXPECTED_HEADERS[i]) {
    console.error(
      `[ERROR] Header column[${i}] expected "${EXPECTED_HEADERS[i]}", got "${headerRow[i]}"`
    );
    process.exit(1);
  }
}
console.log('[import] Header validation: OK');

// データ行
const dataRows = allRows.slice(1);

// バリデーション 2: データ行数
if (dataRows.length !== 292) {
  console.error(`[ERROR] Expected 292 data rows, got ${dataRows.length}`);
  process.exit(1);
}
console.log(`[import] Data row count: ${dataRows.length} (OK)`);

// CSV を id → row にマップ
const csvMap = new Map();
const idxId = EXPECTED_HEADERS.indexOf('id');
const idxCh = EXPECTED_HEADERS.indexOf('章');
const idxQuestion = EXPECTED_HEADERS.indexOf('question');
const idxChoice0 = EXPECTED_HEADERS.indexOf('choice0');
const idxChoice1 = EXPECTED_HEADERS.indexOf('choice1');
const idxChoice2 = EXPECTED_HEADERS.indexOf('choice2');
const idxChoice3 = EXPECTED_HEADERS.indexOf('choice3');
const idxCorrectIndex = EXPECTED_HEADERS.indexOf('correctIndex');
const idxExplanation = EXPECTED_HEADERS.indexOf('explanation');
const idxDifficulty = EXPECTED_HEADERS.indexOf('difficulty');
const idxTags = EXPECTED_HEADERS.indexOf('tags');
const idxSourceRef = EXPECTED_HEADERS.indexOf('source_ref');
const idxLearningObjective = EXPECTED_HEADERS.indexOf('learningObjective');
const idxCognitiveLevel = EXPECTED_HEADERS.indexOf('cognitiveLevel');
const idxMisconceptionTarget = EXPECTED_HEADERS.indexOf('misconceptionTarget');
const idxOptionRationales = EXPECTED_HEADERS.indexOf('optionRationales');

for (let ri = 0; ri < dataRows.length; ri++) {
  const row = dataRows[ri];
  const id = row[idxId];

  // バリデーション 3: id 重複チェック
  if (csvMap.has(id)) {
    console.error(`[ERROR] Duplicate id in CSV at row ${ri + 2}: "${id}"`);
    process.exit(1);
  }

  // バリデーション 5: correctIndex
  const correctIndex = parseInt(row[idxCorrectIndex], 10);
  if (isNaN(correctIndex) || correctIndex < 0 || correctIndex > 3) {
    console.error(
      `[ERROR] Invalid correctIndex at row ${ri + 2} (id=${id}): "${row[idxCorrectIndex]}"`
    );
    process.exit(1);
  }

  // バリデーション 6: difficulty
  const difficulty = parseInt(row[idxDifficulty], 10);
  if (![1, 2, 3].includes(difficulty)) {
    console.error(
      `[ERROR] Invalid difficulty at row ${ri + 2} (id=${id}): "${row[idxDifficulty]}"`
    );
    process.exit(1);
  }

  // バリデーション 7: optionRationales
  const optionRationalesRaw = row[idxOptionRationales];
  if (optionRationalesRaw !== '') {
    const parts = optionRationalesRaw.split(' || ');
    if (parts.length !== 4) {
      console.error(
        `[ERROR] optionRationales split length != 4 at row ${ri + 2} (id=${id}): got ${parts.length} parts`
      );
      process.exit(1);
    }
  }

  csvMap.set(id, row);
}

console.log('[import] CSV id uniqueness: OK');
console.log('[import] correctIndex / difficulty / optionRationales validation: OK');

// 既存 JSON をすべて読み込み、id → question オブジェクト のマップを構築
const chapters = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8'];
const existingMap = new Map(); // id → question object
const existingOrder = new Map(); // ch → id[]

for (const ch of chapters) {
  const filePath = join(dataDir, ch + '.json');
  const qs = JSON.parse(readFileSync(filePath, 'utf8'));
  existingOrder.set(ch, qs.map((q) => q.id));
  for (const q of qs) {
    existingMap.set(q.id, q);
  }
}

// バリデーション 4: id 集合の完全一致
const existingIds = new Set(existingMap.keys());
const csvIds = new Set(csvMap.keys());

const inExistingNotCsv = [...existingIds].filter((id) => !csvIds.has(id));
const inCsvNotExisting = [...csvIds].filter((id) => !existingIds.has(id));

if (inExistingNotCsv.length > 0) {
  console.error('[ERROR] IDs in existing JSON but not in CSV:', inExistingNotCsv);
  process.exit(1);
}
if (inCsvNotExisting.length > 0) {
  console.error('[ERROR] IDs in CSV but not in existing JSON:', inCsvNotExisting);
  process.exit(1);
}
console.log('[import] ID set match: OK');

// CSV から Question オブジェクトを構築（保持フィールドを既存 JSON から引き継ぐ）
function buildQuestion(row, existingQ) {
  const id = row[idxId];
  const categoryId = row[idxCh];
  const question = row[idxQuestion];
  const choices = [
    { text: row[idxChoice0] },
    { text: row[idxChoice1] },
    { text: row[idxChoice2] },
    { text: row[idxChoice3] },
  ];
  const correctIndex = parseInt(row[idxCorrectIndex], 10);
  const explanation = row[idxExplanation];
  const difficulty = parseInt(row[idxDifficulty], 10);
  const tagsRaw = row[idxTags];
  const tags = tagsRaw === '' ? [] : tagsRaw.split('; ').filter((t) => t !== '');

  // 保持フィールド
  const relatedTermIds = existingQ.relatedTermIds ?? [];

  // 省略可能フィールド（CSV 由来）
  const sourceRefRaw = row[idxSourceRef];
  const learningObjectiveRaw = row[idxLearningObjective];
  const cognitiveLevelRaw = row[idxCognitiveLevel];
  const misconceptionTargetRaw = row[idxMisconceptionTarget];
  const optionRationalesRaw = row[idxOptionRationales];

  // フィールド順を仕様通りに並べる
  const q = {
    id,
    categoryId,
    question,
    choices,
    correctIndex,
    explanation,
    relatedTermIds,
    difficulty,
    tags,
  };

  // source_ref（存在する場合）
  if (sourceRefRaw !== '') {
    q.source_ref = sourceRefRaw;
  }

  // source_ref_supplements（保持フィールド）
  if (existingQ.source_ref_supplements !== undefined) {
    q.source_ref_supplements = existingQ.source_ref_supplements;
  }

  // syllabusArea（保持フィールド）
  if (existingQ.syllabusArea !== undefined) {
    q.syllabusArea = existingQ.syllabusArea;
  }

  // syllabusTopic（保持フィールド）
  if (existingQ.syllabusTopic !== undefined) {
    q.syllabusTopic = existingQ.syllabusTopic;
  }

  // learningObjective（存在する場合）
  if (learningObjectiveRaw !== '') {
    q.learningObjective = learningObjectiveRaw;
  }

  // cognitiveLevel（値域チェック）
  if (cognitiveLevelRaw !== '' && COGNITIVE_LEVELS.has(cognitiveLevelRaw)) {
    q.cognitiveLevel = cognitiveLevelRaw;
  }

  // misconceptionTarget（存在する場合）
  if (misconceptionTargetRaw !== '') {
    q.misconceptionTarget = misconceptionTargetRaw;
  }

  // optionRationales（存在する場合）
  if (optionRationalesRaw !== '') {
    const parts = optionRationalesRaw.split(' || ');
    q.optionRationales = parts;
  }

  // qualityFlags（保持フィールド）
  if (existingQ.qualityFlags !== undefined) {
    q.qualityFlags = existingQ.qualityFlags;
  }

  return q;
}

// 各 ch ごとに新 JSON を構築
const chChangeCounts = {};
let totalChanged = 0;

for (const ch of chapters) {
  const orderIds = existingOrder.get(ch);
  const newQuestions = [];
  let changedInCh = 0;

  for (const id of orderIds) {
    const existingQ = existingMap.get(id);
    const csvRow = csvMap.get(id);
    const newQ = buildQuestion(csvRow, existingQ);

    // 差分チェック（dry-run 用）
    const oldJson = JSON.stringify(existingQ);
    const newJson = JSON.stringify(newQ);
    if (oldJson !== newJson) {
      changedInCh++;
      totalChanged++;
    }

    newQuestions.push(newQ);
  }

  chChangeCounts[ch] = changedInCh;

  if (!dryRun) {
    const outPath = join(dataDir, ch + '.json');
    writeFileSync(outPath, JSON.stringify(newQuestions, null, 2) + '\n', 'utf8');
  }
}

// 結果出力
console.log('\n[import] Results:');
for (const ch of chapters) {
  console.log(`  ${ch}: ${chChangeCounts[ch]} question(s) changed`);
}
console.log(`  total changed: ${totalChanged} / 292`);

if (dryRun) {
  console.log('\n[import] DRY-RUN mode: no files written.');
} else {
  console.log('\n[import] All ch*.json files updated.');
}

process.exit(0);
