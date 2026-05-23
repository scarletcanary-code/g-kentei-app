import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const repoRoot = join(projectRoot, '..');
const dataDir = join(projectRoot, 'src/data/questions');
const outDir = join(repoRoot, '.harness/exports');
mkdirSync(outDir, { recursive: true });

const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
const outPath = join(outDir, `questions-review-${today}.xlsx`);

const EXPECTED = 292;
const chapters = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8'];

const ORIG_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } };
const REVIEW_HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
const REVIEW_CELL_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBE6' } };

const columns = [
  { key: 'id', header: '[元]id', width: 14, kind: 'orig' },
  { key: 'chapter', header: '[元]章', width: 8, kind: 'orig' },
  { key: 'categoryId', header: '[元]categoryId', width: 12, kind: 'orig' },
  { key: 'difficulty', header: '[元]difficulty', width: 12, kind: 'orig' },
  { key: 'cognitiveLevel', header: '[元]cognitiveLevel', width: 14, kind: 'orig' },
  { key: 'question', header: '[元]question', width: 60, kind: 'orig' },
  { key: 'choice0', header: '[元]choice0', width: 40, kind: 'orig' },
  { key: 'choice1', header: '[元]choice1', width: 40, kind: 'orig' },
  { key: 'choice2', header: '[元]choice2', width: 40, kind: 'orig' },
  { key: 'choice3', header: '[元]choice3', width: 40, kind: 'orig' },
  { key: 'correctIndex', header: '[元]correctIndex', width: 10, kind: 'orig' },
  { key: 'correctText', header: '[元]正答テキスト', width: 40, kind: 'orig' },
  { key: 'explanation', header: '[元]explanation', width: 60, kind: 'orig' },
  { key: 'rationale0', header: '[元]rationale0', width: 40, kind: 'orig' },
  { key: 'rationale1', header: '[元]rationale1', width: 40, kind: 'orig' },
  { key: 'rationale2', header: '[元]rationale2', width: 40, kind: 'orig' },
  { key: 'rationale3', header: '[元]rationale3', width: 40, kind: 'orig' },
  { key: 'learningObjective', header: '[元]learningObjective', width: 40, kind: 'orig' },
  { key: 'syllabusTopic', header: '[元]syllabusTopic', width: 30, kind: 'orig' },
  { key: 'misconceptionTarget', header: '[元]misconceptionTarget', width: 40, kind: 'orig' },
  { key: 'source_ref', header: '[元]source_ref', width: 30, kind: 'orig' },
  { key: 'tags', header: '[元]tags', width: 30, kind: 'orig' },
  { key: 'relatedTermIds', header: '[元]relatedTermIds', width: 30, kind: 'orig' },
  { key: 'review_distractor', header: '[精査]誤答の自然さ・紛らわしさ', width: 30, kind: 'review' },
  { key: 'review_balance', header: '[精査]選択肢の長さ・形式整合', width: 30, kind: 'review' },
  { key: 'review_rationale', header: '[精査]optionRationales精度', width: 30, kind: 'review' },
  { key: 'review_explanation', header: '[精査]explanation精度', width: 30, kind: 'review' },
  { key: 'review_fixes', header: '[精査]修正提案', width: 40, kind: 'review' },
  { key: 'review_comment', header: '[精査]総合コメント', width: 40, kind: 'review' },
];

const workbook = new ExcelJS.Workbook();
const ws = workbook.addWorksheet('Questions');
ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width }));

const headerRow = ws.getRow(1);
headerRow.font = { bold: true };
headerRow.alignment = { vertical: 'middle', wrapText: true };
columns.forEach((c, i) => {
  const cell = headerRow.getCell(i + 1);
  cell.fill = c.kind === 'review' ? REVIEW_HEADER_FILL : ORIG_FILL;
});

let rowCount = 0;
for (const ch of chapters) {
  const qs = JSON.parse(readFileSync(join(dataDir, `${ch}.json`), 'utf8'));
  for (const q of qs) {
    rowCount += 1;
    const choices = (q.choices ?? []).map((c) => c.text ?? '');
    const rationales = q.optionRationales ?? [];
    ws.addRow({
      id: q.id,
      chapter: ch,
      categoryId: q.categoryId,
      difficulty: q.difficulty,
      cognitiveLevel: q.cognitiveLevel ?? '',
      question: q.question,
      choice0: choices[0] ?? '',
      choice1: choices[1] ?? '',
      choice2: choices[2] ?? '',
      choice3: choices[3] ?? '',
      correctIndex: q.correctIndex,
      correctText: choices[q.correctIndex] ?? '',
      explanation: q.explanation,
      rationale0: rationales[0] ?? '',
      rationale1: rationales[1] ?? '',
      rationale2: rationales[2] ?? '',
      rationale3: rationales[3] ?? '',
      learningObjective: q.learningObjective ?? '',
      syllabusTopic: q.syllabusTopic ?? '',
      misconceptionTarget: q.misconceptionTarget ?? '',
      source_ref: q.source_ref ?? '',
      tags: (q.tags ?? []).join('; '),
      relatedTermIds: (q.relatedTermIds ?? []).join('; '),
    });
  }
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
