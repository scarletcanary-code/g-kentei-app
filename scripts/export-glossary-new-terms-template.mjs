import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const repoRoot = join(projectRoot, '..');
const outDir = join(repoRoot, '.harness/exports');
mkdirSync(outDir, { recursive: true });

const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
const outPath = join(outDir, `glossary-new-terms-template-${today}.xlsx`);

const FILL_FIXED = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } };
const FILL_INPUT_HEADER = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
const FILL_INPUT_CELL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBE6' } };

const columns = [
  { key: 'id', header: 'id', width: 28, kind: 'fixed' },
  { key: 'term', header: 'term', width: 24, kind: 'fixed' },
  { key: 'termEn', header: 'termEn', width: 28, kind: 'fixed' },
  { key: 'categoryId', header: 'categoryId', width: 12, kind: 'fixed' },
  { key: 'importance', header: 'importance', width: 12, kind: 'fixed' },
  { key: 'definition', header: 'definition (30-50字)', width: 50, kind: 'input' },
  { key: 'beginnerDetail', header: 'beginnerDetail (60-100字, 必ず60字以上)', width: 50, kind: 'input' },
  { key: 'intermediateDetail', header: 'intermediateDetail (100-200字)', width: 50, kind: 'input' },
  { key: 'detail', header: 'detail (200-600字)', width: 60, kind: 'input' },
  { key: 'relatedTermIds', header: 'relatedTermIds (; 区切り, terms.json 既存のみ)', width: 40, kind: 'input' },
  { key: 'source_ref_supplements', header: 'source_ref_supplements (; 区切り, 任意)', width: 40, kind: 'input' },
];

const rows = [
  { id: 'accuracy', term: '正解率', termEn: 'Accuracy', categoryId: 'ch3', importance: 1 },
  { id: 'seq2seq', term: 'seq2seq', termEn: 'Sequence-to-Sequence', categoryId: 'ch5', importance: 2 },
  { id: 'encoder_decoder', term: 'エンコーダ・デコーダ', termEn: 'Encoder-Decoder', categoryId: 'ch5', importance: 1 },
  { id: 'foundation_model', term: '基盤モデル', termEn: 'Foundation Model', categoryId: 'ch2', importance: 2 },
  { id: 'image_recognition', term: '画像認識', termEn: 'Image Recognition', categoryId: 'ch6', importance: 1 },
  { id: 'masked_language_model', term: 'マスク言語モデル', termEn: 'Masked Language Model', categoryId: 'ch6', importance: 2 },
  { id: 'missing_value', term: '欠損値', termEn: 'Missing Value', categoryId: 'ch3', importance: 2 },
  { id: 'normalization', term: '正規化', termEn: 'Normalization', categoryId: 'ch4', importance: 2 },
  { id: 'positional_encoding', term: '位置エンコーディング', termEn: 'Positional Encoding', categoryId: 'ch5', importance: 2 },
  { id: 'preprocessing', term: '前処理', termEn: 'Preprocessing', categoryId: 'ch3', importance: 1 },
  { id: 'standardization', term: '標準化', termEn: 'Standardization', categoryId: 'ch4', importance: 2 },
];

const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet('NewTerms');
ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width }));

const headerRow = ws.getRow(1);
headerRow.font = { bold: true };
headerRow.alignment = { vertical: 'middle', wrapText: true };
columns.forEach((c, i) => {
  const cell = headerRow.getCell(i + 1);
  cell.fill = c.kind === 'input' ? FILL_INPUT_HEADER : FILL_FIXED;
});

for (const r of rows) ws.addRow(r);

const lastRow = ws.rowCount;
for (let r = 2; r <= lastRow; r += 1) {
  const row = ws.getRow(r);
  row.alignment = { vertical: 'top', wrapText: true };
  columns.forEach((c, i) => {
    if (c.kind === 'input') row.getCell(i + 1).fill = FILL_INPUT_CELL;
  });
}

ws.views = [{ state: 'frozen', ySplit: 1 }];
ws.autoFilter = `A1:${ws.getColumn(columns.length).letter}1`;

await wb.xlsx.writeFile(outPath);
console.log(`wrote ${rows.length} rows, ${columns.length} cols -> ${outPath}`);
