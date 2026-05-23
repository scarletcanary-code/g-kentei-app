import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const repoRoot = join(projectRoot, '..');
const exportsDir = join(repoRoot, '.harness/exports');

const EXPECTED_ROWS = 292;
const SHEET_NAME = 'Questions';

const EXPECTED_HEADER = [
  'id',
  '誤答の自然さ・紛らわしさ',
  '選択肢の長さ・形式整合',
  'optionRationales精度',
  'explanation精度',
  '修正提案',
  '総合コメント',
];

const TSV_TO_XLSX_HEADER = {
  '誤答の自然さ・紛らわしさ': '[精査]誤答の自然さ・紛らわしさ',
  '選択肢の長さ・形式整合': '[精査]選択肢の長さ・形式整合',
  'optionRationales精度': '[精査]optionRationales精度',
  'explanation精度': '[精査]explanation精度',
  '修正提案': '[精査]修正提案',
  '総合コメント': '[精査]総合コメント',
};

const LABEL_VOCAB = {
  '誤答の自然さ・紛らわしさ': ['OK', 'ダメ誤答', '易しすぎ', '紛らわしすぎ', '正答バレ', '重複'],
  '選択肢の長さ・形式整合': ['OK', '長さバラつき', '形式不揃い', '正答だけ長い', '正答だけ短い'],
  'optionRationales精度': ['OK', '事実誤り', '根拠薄', '欠落'],
  'explanation精度': ['OK', '事実誤り', '冗長', '不足', '論点ずれ'],
};

const ID_RE = /^ch\d+-\d+$/;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--tsv') out.tsv = argv[++i];
    else if (a === '--base') out.base = argv[++i];
    else if (a === '--out') out.out = argv[++i];
  }
  return out;
}

function resolvePath(p) {
  if (!p) return p;
  return isAbsolute(p) ? p : resolve(process.cwd(), p);
}

function findLatestBase() {
  if (!existsSync(exportsDir)) return null;
  const files = readdirSync(exportsDir)
    .filter((f) => /^questions-review-.*\.xlsx$/.test(f))
    .map((f) => ({ f, mtime: statSync(join(exportsDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return files[0] ? join(exportsDir, files[0].f) : null;
}

function jstToday() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
}

function stripBom(s) {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function unescapeNewlines(s) {
  return s.replaceAll('\\n', '\n');
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));

if (!args.tsv) fail('--tsv <path> is required');
const tsvPath = resolvePath(args.tsv);
if (!existsSync(tsvPath)) fail(`tsv not found: ${tsvPath}`);

const basePath = args.base ? resolvePath(args.base) : findLatestBase();
if (!basePath || !existsSync(basePath)) fail(`base xlsx not found: ${basePath ?? '(no questions-review-*.xlsx in .harness/exports)'}`);

const outPath = args.out
  ? resolvePath(args.out)
  : join(exportsDir, `questions-applied-${jstToday()}.xlsx`);

const tsvRaw = stripBom(readFileSync(tsvPath, 'utf8'));
const lines = tsvRaw.split(/\r?\n/).filter((l) => l.length > 0);
if (lines.length === 0) fail('tsv is empty');

const header = lines[0].split('\t');
if (header.length !== EXPECTED_HEADER.length || header.some((h, i) => h !== EXPECTED_HEADER[i])) {
  fail(`tsv header mismatch.\n  expected: ${EXPECTED_HEADER.join(' | ')}\n  got:      ${header.join(' | ')}`);
}

const tsvRows = new Map();
const duplicateIds = [];
const malformedIds = [];
for (let i = 1; i < lines.length; i += 1) {
  const cols = lines[i].split('\t');
  while (cols.length < EXPECTED_HEADER.length) cols.push('');
  const id = cols[0];
  if (!ID_RE.test(id)) malformedIds.push(id);
  if (tsvRows.has(id)) duplicateIds.push(id);
  const rec = {};
  for (let j = 1; j < EXPECTED_HEADER.length; j += 1) {
    rec[EXPECTED_HEADER[j]] = unescapeNewlines(cols[j] ?? '');
  }
  tsvRows.set(id, rec);
}

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(basePath);
const ws = workbook.getWorksheet(SHEET_NAME);
if (!ws) fail(`sheet "${SHEET_NAME}" not found in ${basePath}`);

const headerRowCells = ws.getRow(1).values;
const headerToCol = new Map();
for (let c = 1; c < headerRowCells.length; c += 1) {
  const v = headerRowCells[c];
  if (typeof v === 'string') headerToCol.set(v, c);
}

const xlsxColForReview = {};
for (const [tsvKey, xlsxKey] of Object.entries(TSV_TO_XLSX_HEADER)) {
  const col = headerToCol.get(xlsxKey);
  if (!col) fail(`xlsx missing review column: ${xlsxKey}`);
  xlsxColForReview[tsvKey] = col;
}
const idCol = headerToCol.get('[元]id');
if (!idCol) fail('xlsx missing [元]id column');

const xlsxIds = new Set();
const xlsxRowByIdRow = new Map();
const lastRow = ws.rowCount;
const dataRows = lastRow - 1;
if (dataRows !== EXPECTED_ROWS) {
  console.error(`warning: base xlsx has ${dataRows} data rows, expected ${EXPECTED_ROWS}`);
}
for (let r = 2; r <= lastRow; r += 1) {
  const id = String(ws.getRow(r).getCell(idCol).value ?? '');
  if (id) {
    xlsxIds.add(id);
    xlsxRowByIdRow.set(id, r);
  }
}

const labelCounts = Object.fromEntries(Object.keys(LABEL_VOCAB).map((k) => [k, {}]));
const unexpectedLabelCounts = Object.fromEntries(Object.keys(LABEL_VOCAB).map((k) => [k, 0]));
const correctIndexChangeIds = [];

function classify(field, value) {
  const vocab = LABEL_VOCAB[field];
  if (!vocab) return null;
  if (!value || value.trim() === '') return null;
  const matched = vocab.find((label) => value.startsWith(label));
  return matched ?? null;
}

let updated = 0;
const tsvOnlyIds = [];
const xlsxOnlyIds = [];

for (const [id, rec] of tsvRows) {
  if (!xlsxIds.has(id)) {
    tsvOnlyIds.push(id);
    continue;
  }
  const r = xlsxRowByIdRow.get(id);
  const row = ws.getRow(r);
  for (const [tsvKey, value] of Object.entries(rec)) {
    const col = xlsxColForReview[tsvKey];
    row.getCell(col).value = value === '' ? null : value;
    if (LABEL_VOCAB[tsvKey] && value.trim() !== '') {
      const matched = classify(tsvKey, value);
      if (matched) {
        labelCounts[tsvKey][matched] = (labelCounts[tsvKey][matched] ?? 0) + 1;
      } else {
        unexpectedLabelCounts[tsvKey] += 1;
      }
    }
    if (tsvKey === '修正提案' && value.includes('correctIndex変更')) {
      correctIndexChangeIds.push(id);
    }
  }
  row.commit();
  updated += 1;
}

for (const id of xlsxIds) {
  if (!tsvRows.has(id)) xlsxOnlyIds.push(id);
}

await workbook.xlsx.writeFile(outPath);

console.log(`read base: ${basePath} (${dataRows} rows)`);
console.log(`read tsv:  ${tsvPath} (${tsvRows.size} rows)`);
console.log('');

for (const field of Object.keys(LABEL_VOCAB)) {
  console.log(`label distribution (${field}):`);
  const counts = labelCounts[field];
  const vocab = LABEL_VOCAB[field];
  for (const label of vocab) {
    if (counts[label]) console.log(`  ${label}: ${counts[label]}`);
  }
  if (unexpectedLabelCounts[field] > 0) {
    console.log(`  unexpected: ${unexpectedLabelCounts[field]}`);
  }
  console.log('');
}

if (correctIndexChangeIds.length > 0) {
  console.error(`!! correctIndex変更提案: ${correctIndexChangeIds.length} 件`);
  for (const id of correctIndexChangeIds) console.error(`  - ${id}`);
  console.error('  → 人手レビュー必須。`apply` では値を変更しない (精査列にメモが入るだけ)');
  console.error('');
} else {
  console.log('correctIndex変更提案: 0 件');
  console.log('');
}

console.log('warnings:');
console.log(`  tsv-only ids: ${tsvOnlyIds.length}${tsvOnlyIds.length ? ` (${tsvOnlyIds.slice(0, 10).join(', ')}${tsvOnlyIds.length > 10 ? ', ...' : ''})` : ''}`);
console.log(`  xlsx-only ids: ${xlsxOnlyIds.length}${xlsxOnlyIds.length ? ` (${xlsxOnlyIds.slice(0, 10).join(', ')}${xlsxOnlyIds.length > 10 ? ', ...' : ''})` : ''}`);
console.log(`  duplicate ids: ${duplicateIds.length}${duplicateIds.length ? ` (${duplicateIds.slice(0, 10).join(', ')}${duplicateIds.length > 10 ? ', ...' : ''})` : ''}`);
console.log(`  malformed ids: ${malformedIds.length}${malformedIds.length ? ` (${malformedIds.slice(0, 10).join(', ')}${malformedIds.length > 10 ? ', ...' : ''})` : ''}`);
for (const field of Object.keys(LABEL_VOCAB)) {
  if (unexpectedLabelCounts[field] > 0) {
    console.log(`  unexpected labels (${field}): ${unexpectedLabelCounts[field]} rows`);
  }
}
console.log('');
console.log(`wrote: ${outPath} (${dataRows} rows, updated: ${updated}, skipped: ${dataRows - updated})`);
