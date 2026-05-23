import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const repoRoot = join(projectRoot, '..');
const dataPath = join(projectRoot, 'src/data/glossary/terms.json');
const outDir = join(repoRoot, '.harness/exports');
mkdirSync(outDir, { recursive: true });

const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
const outPath = join(outDir, `glossary-review-${today}.xlsx`);

const EXPECTED = 253;

const ORIG_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } };
const REVIEW_HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
const REVIEW_CELL_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBE6' } };

const columns = [
  { key: 'id', header: '[元]id', width: 28, kind: 'orig' },
  { key: 'term', header: '[元]term', width: 22, kind: 'orig' },
  { key: 'termEn', header: '[元]termEn', width: 22, kind: 'orig' },
  { key: 'categoryId', header: '[元]categoryId', width: 12, kind: 'orig' },
  { key: 'importance', header: '[元]importance', width: 12, kind: 'orig' },
  { key: 'definition', header: '[元]definition', width: 60, kind: 'orig' },
  { key: 'beginnerDetail', header: '[元]beginnerDetail', width: 60, kind: 'orig' },
  { key: 'intermediateDetail', header: '[元]intermediateDetail', width: 60, kind: 'orig' },
  { key: 'detail', header: '[元]detail', width: 60, kind: 'orig' },
  { key: 'aliases', header: '[元]aliases', width: 30, kind: 'orig' },
  { key: 'relatedTermIds', header: '[元]relatedTermIds', width: 30, kind: 'orig' },
  { key: 'sourceRefSupplements', header: '[元]source_ref_supplements', width: 40, kind: 'orig' },
  { key: 'review_tierValidity', header: '[精査]3段難易度の妥当性', width: 30, kind: 'review' },
  { key: 'review_importance', header: '[精査]importance妥当性(現値/提案値)', width: 30, kind: 'review' },
  { key: 'review_difficulty', header: '[精査]新difficulty提案(初/中/上)', width: 24, kind: 'review' },
  { key: 'review_beginnerSupp', header: '[精査]beginnerDetail充足提案', width: 40, kind: 'review' },
  { key: 'review_intermediateSupp', header: '[精査]intermediateDetail充足提案', width: 40, kind: 'review' },
  { key: 'review_comment', header: '[精査]総合コメント', width: 40, kind: 'review' },
];

const terms = JSON.parse(readFileSync(dataPath, 'utf8'));

const workbook = new ExcelJS.Workbook();
const ws = workbook.addWorksheet('Glossary');
ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width }));

const headerRow = ws.getRow(1);
headerRow.font = { bold: true };
headerRow.alignment = { vertical: 'middle', wrapText: true };
columns.forEach((c, i) => {
  const cell = headerRow.getCell(i + 1);
  cell.fill = c.kind === 'review' ? REVIEW_HEADER_FILL : ORIG_FILL;
});

let rowCount = 0;
for (const t of terms) {
  rowCount += 1;
  ws.addRow({
    id: t.id,
    term: t.term,
    termEn: t.termEn,
    categoryId: t.categoryId,
    importance: t.importance,
    definition: t.definition,
    beginnerDetail: t.beginnerDetail ?? '',
    intermediateDetail: t.intermediateDetail ?? '',
    detail: t.detail,
    aliases: (t.aliases ?? []).join('; '),
    relatedTermIds: (t.relatedTermIds ?? []).join('; '),
    sourceRefSupplements: (t.source_ref_supplements ?? []).join('; '),
  });
}

const lastRow = rowCount + 1;
for (let r = 2; r <= lastRow; r += 1) {
  const row = ws.getRow(r);
  row.alignment = { vertical: 'top', wrapText: true };
  columns.forEach((c, i) => {
    if (c.kind === 'review') {
      row.getCell(i + 1).fill = REVIEW_CELL_FILL;
    }
  });
}

ws.views = [{ state: 'frozen', ySplit: 1 }];
const lastColLetter = ws.getColumn(columns.length).letter;
ws.autoFilter = `A1:${lastColLetter}1`;

await workbook.xlsx.writeFile(outPath);

if (rowCount !== EXPECTED) {
  console.error(`expected ${EXPECTED} rows, got ${rowCount}`);
  process.exit(1);
}
console.log(`wrote ${rowCount} rows, ${columns.length} cols -> ${outPath}`);
