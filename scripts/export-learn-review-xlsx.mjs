import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const repoRoot = join(projectRoot, '..');
const dataDir = join(projectRoot, 'src/data/learn');
const outDir = join(repoRoot, '.harness/exports');
mkdirSync(outDir, { recursive: true });

const chapters = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8'];

function loadChapter(filePath, chId) {
  let src = readFileSync(filePath, 'utf8');
  src = src.replace(/^import\s+type\s+.*$/gm, '');
  src = src.replace(/:\s*LearnChapter\b/g, '');
  src = src.replace(/:\s*CategoryId(\[\])?\b/g, '');
  src = src.replace(/^export\s+const\s+/gm, 'const ');
  const varName = 'learnCh' + chId.replace('ch', '');
  src += `\nreturn ${varName};`;
  return new Function(src)();
}

const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
const outPath = join(outDir, `learn-sections-review-${today}.xlsx`);

const ORIG_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } };
const REVIEW_HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
const REVIEW_CELL_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBE6' } };

const columns = [
  { key: 'id', header: '[元]id', width: 12, kind: 'orig' },
  { key: 'chapter', header: '[元]章', width: 8, kind: 'orig' },
  { key: 'chapterTitle', header: '[元]章タイトル', width: 24, kind: 'orig' },
  { key: 'chapterDifficulty', header: '[元]章難易度', width: 14, kind: 'orig' },
  { key: 'overviewBeginner', header: '[元]章overview初級', width: 50, kind: 'orig' },
  { key: 'overviewIntermediate', header: '[元]章overview中級', width: 50, kind: 'orig' },
  { key: 'overviewAdvanced', header: '[元]章overview上級', width: 50, kind: 'orig' },
  { key: 'sectionIndex', header: '[元]section番号', width: 10, kind: 'orig' },
  { key: 'heading', header: '[元]heading', width: 40, kind: 'orig' },
  { key: 'beginnerBody', header: '[元]section初級body', width: 60, kind: 'orig' },
  { key: 'intermediateBody', header: '[元]section中級body', width: 60, kind: 'orig' },
  { key: 'advancedBody', header: '[元]section上級body', width: 60, kind: 'orig' },
  { key: 'termIds', header: '[元]termIds', width: 30, kind: 'orig' },
  { key: 'review_tier', header: '[精査]3段難易度の妥当性', width: 30, kind: 'review' },
  { key: 'review_overview', header: '[精査]章overviewとの整合性', width: 30, kind: 'review' },
  { key: 'review_terms', header: '[精査]termIds整合性', width: 30, kind: 'review' },
  { key: 'review_accuracy', header: '[精査]内容の正確性', width: 30, kind: 'review' },
  { key: 'review_fixes', header: '[精査]修正提案', width: 40, kind: 'review' },
  { key: 'review_comment', header: '[精査]総合コメント', width: 30, kind: 'review' },
];

const workbook = new ExcelJS.Workbook();
const ws = workbook.addWorksheet('LearnSections');
ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width }));

const headerRow = ws.getRow(1);
headerRow.font = { bold: true };
headerRow.alignment = { vertical: 'middle', wrapText: true };
columns.forEach((c, i) => {
  const cell = headerRow.getCell(i + 1);
  cell.fill = c.kind === 'review' ? REVIEW_HEADER_FILL : ORIG_FILL;
});

let rowCount = 0;
for (const chId of chapters) {
  const chap = loadChapter(join(dataDir, `${chId}.ts`), chId);
  chap.sections.forEach((sec, idx) => {
    rowCount += 1;
    const sectionIndex = idx + 1;
    ws.addRow({
      id: `${chId}-s${sectionIndex}`,
      chapter: chId,
      chapterTitle: chap.title,
      chapterDifficulty: chap.difficulty ?? '',
      overviewBeginner: chap.beginnerOverview ?? '',
      overviewIntermediate: chap.intermediateOverview ?? '',
      overviewAdvanced: chap.overview ?? '',
      sectionIndex,
      heading: sec.heading,
      beginnerBody: sec.beginnerBody ?? '',
      intermediateBody: sec.intermediateBody ?? '',
      advancedBody: sec.body ?? '',
      termIds: (sec.termIds ?? []).join('; '),
    });
  });
}

const lastRow = rowCount + 1;
for (let r = 2; r <= lastRow; r += 1) {
  const row = ws.getRow(r);
  row.alignment = { vertical: 'top', wrapText: true };
  columns.forEach((c, i) => {
    if (c.kind === 'review') row.getCell(i + 1).fill = REVIEW_CELL_FILL;
  });
}

ws.views = [{ state: 'frozen', ySplit: 1 }];
const lastColLetter = ws.getColumn(columns.length).letter;
ws.autoFilter = `A1:${lastColLetter}1`;

await workbook.xlsx.writeFile(outPath);
console.log(`wrote ${rowCount} rows, ${columns.length} cols -> ${outPath}`);
