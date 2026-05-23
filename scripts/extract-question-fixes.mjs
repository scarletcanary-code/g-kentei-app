import { readFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const repoRoot = join(projectRoot, '..');
const exportsDir = join(repoRoot, '.harness/exports');
const dataDir = join(projectRoot, 'src/data/questions');
mkdirSync(exportsDir, { recursive: true });

const chapters = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8'];

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--applied') out.applied = argv[++i];
    else if (a === '--out') out.out = argv[++i];
  }
  return out;
}

function resolvePath(p) {
  if (!p) return p;
  return isAbsolute(p) ? p : resolve(process.cwd(), p);
}

function findLatestApplied() {
  if (!existsSync(exportsDir)) return null;
  const files = readdirSync(exportsDir)
    .filter((f) => /^questions-applied-.*\.xlsx$/.test(f))
    .map((f) => ({ f, mtime: statSync(join(exportsDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return files[0] ? join(exportsDir, files[0].f) : null;
}

function jstToday() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
}

const args = parseArgs(process.argv.slice(2));
const appliedPath = args.applied ? resolvePath(args.applied) : findLatestApplied();
if (!appliedPath || !existsSync(appliedPath)) {
  console.error(`applied xlsx not found: ${appliedPath ?? '(no questions-applied-*.xlsx)'}`);
  process.exit(1);
}
const outPath = args.out ? resolvePath(args.out) : join(exportsDir, `question-fixes-${jstToday()}.xlsx`);

const questionById = new Map();
const chapterById = new Map();
for (const ch of chapters) {
  const qs = JSON.parse(readFileSync(join(dataDir, `${ch}.json`), 'utf8'));
  for (const q of qs) {
    questionById.set(q.id, q);
    chapterById.set(q.id, ch);
  }
}

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(appliedPath);
const ws = wb.getWorksheet('Questions');
if (!ws) {
  console.error('sheet "Questions" not found');
  process.exit(1);
}

const headerCells = ws.getRow(1).values;
const headerToCol = new Map();
for (let c = 1; c < headerCells.length; c += 1) {
  const v = headerCells[c];
  if (typeof v === 'string') headerToCol.set(v, c);
}

const col = {
  id: headerToCol.get('[元]id'),
  fix: headerToCol.get('[精査]修正提案'),
  comment: headerToCol.get('[精査]総合コメント'),
  distractor: headerToCol.get('[精査]誤答の自然さ・紛らわしさ'),
  balance: headerToCol.get('[精査]選択肢の長さ・形式整合'),
  rationale: headerToCol.get('[精査]optionRationales精度'),
  explanation: headerToCol.get('[精査]explanation精度'),
};
for (const [k, v] of Object.entries(col)) {
  if (!v) {
    console.error(`column not found: ${k}`);
    process.exit(1);
  }
}

function getCellText(row, c) {
  const v = row.getCell(c).value;
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && 'richText' in v) {
    return v.richText.map((r) => r.text).join('');
  }
  return String(v);
}

const FIELD_RE = /^(choice[0-3]|rationale[0-3]|explanation|correctIndex変更)(?:改)?:\s*(.*)$/;

function parseFixCell(cellText) {
  if (!cellText) return [];
  const items = [];
  const lines = cellText.split(/\r?\n/);
  let cur = null;
  for (const line of lines) {
    const m = line.match(FIELD_RE);
    if (m) {
      if (cur) items.push(cur);
      cur = { field: m[1], after: m[2] };
    } else if (cur) {
      cur.after += '\n' + line;
    }
  }
  if (cur) items.push(cur);
  return items.map((it) => ({ field: it.field, after: it.after.trim() }));
}

function beforeFor(q, field) {
  if (field === 'explanation') return q.explanation ?? '';
  const m = field.match(/^choice([0-3])$/);
  if (m) return q.choices?.[Number(m[1])]?.text ?? '';
  const m2 = field.match(/^rationale([0-3])$/);
  if (m2) return q.optionRationales?.[Number(m2[1])] ?? '';
  if (field === 'correctIndex変更') return String(q.correctIndex);
  return '';
}

function labelFor(field, ctx) {
  if (field.startsWith('choice')) {
    const parts = [];
    if (ctx.distractor) parts.push(`誤答:${ctx.distractor}`);
    if (ctx.balance) parts.push(`形式:${ctx.balance}`);
    return parts.join(' | ');
  }
  if (field.startsWith('rationale')) return ctx.rationale ?? '';
  if (field === 'explanation') return ctx.explanation ?? '';
  if (field === 'correctIndex変更') return '!! 要人手判定 !!';
  return '';
}

const fixes = [];
const lastRow = ws.rowCount;
for (let r = 2; r <= lastRow; r += 1) {
  const row = ws.getRow(r);
  const id = String(row.getCell(col.id).value ?? '');
  if (!id) continue;
  const fixText = getCellText(row, col.fix);
  if (!fixText.trim()) continue;
  const ctx = {
    distractor: getCellText(row, col.distractor),
    balance: getCellText(row, col.balance),
    rationale: getCellText(row, col.rationale),
    explanation: getCellText(row, col.explanation),
    comment: getCellText(row, col.comment),
  };
  const q = questionById.get(id);
  if (!q) continue;
  const items = parseFixCell(fixText);
  for (const it of items) {
    fixes.push({
      id,
      chapter: chapterById.get(id),
      field: it.field,
      label: labelFor(it.field, ctx),
      before: beforeFor(q, it.field),
      after: it.after,
      comment: ctx.comment,
    });
  }
}

const fieldOrder = ['choice0', 'choice1', 'choice2', 'choice3', 'rationale0', 'rationale1', 'rationale2', 'rationale3', 'explanation', 'correctIndex変更'];
fixes.sort((a, b) => {
  if (a.id !== b.id) return a.id.localeCompare(b.id);
  return fieldOrder.indexOf(a.field) - fieldOrder.indexOf(b.field);
});

const out = new ExcelJS.Workbook();
const sheet = out.addWorksheet('Fixes');

const ORIG_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } };
const REVIEW_HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
const REVIEW_CELL_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBE6' } };
const BEFORE_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };
const AFTER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };

const columns = [
  { key: 'id', header: 'id', width: 12, kind: 'orig' },
  { key: 'chapter', header: '章', width: 6, kind: 'orig' },
  { key: 'field', header: 'field', width: 14, kind: 'orig' },
  { key: 'label', header: 'GPT判定', width: 36, kind: 'orig' },
  { key: 'before', header: 'before (現状)', width: 60, kind: 'before' },
  { key: 'after', header: 'after (GPT提案)', width: 60, kind: 'after' },
  { key: 'comment', header: 'GPT総合コメント', width: 30, kind: 'orig' },
  { key: 'verdict', header: '[判定]採否', width: 12, kind: 'review' },
  { key: 'final', header: '[判定]最終文(編集)', width: 60, kind: 'review' },
  { key: 'note', header: '[判定]メモ', width: 30, kind: 'review' },
];

sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width }));
const headerRow = sheet.getRow(1);
headerRow.font = { bold: true };
headerRow.alignment = { vertical: 'middle', wrapText: true };
columns.forEach((c, i) => {
  const cell = headerRow.getCell(i + 1);
  if (c.kind === 'review') cell.fill = REVIEW_HEADER_FILL;
  else if (c.kind === 'before') cell.fill = BEFORE_FILL;
  else if (c.kind === 'after') cell.fill = AFTER_FILL;
  else cell.fill = ORIG_FILL;
});

for (const f of fixes) {
  sheet.addRow({
    id: f.id,
    chapter: f.chapter,
    field: f.field,
    label: f.label,
    before: f.before,
    after: f.after,
    comment: f.comment,
  });
}

const last = sheet.rowCount;
for (let r = 2; r <= last; r += 1) {
  const row = sheet.getRow(r);
  row.alignment = { vertical: 'top', wrapText: true };
  columns.forEach((c, i) => {
    if (c.kind === 'review') row.getCell(i + 1).fill = REVIEW_CELL_FILL;
    else if (c.kind === 'before') row.getCell(i + 1).fill = BEFORE_FILL;
    else if (c.kind === 'after') row.getCell(i + 1).fill = AFTER_FILL;
  });
}

sheet.views = [{ state: 'frozen', ySplit: 1 }];
sheet.autoFilter = `A1:${sheet.getColumn(columns.length).letter}1`;

await out.xlsx.writeFile(outPath);

const byField = {};
const byChapter = {};
for (const f of fixes) {
  byField[f.field] = (byField[f.field] ?? 0) + 1;
  byChapter[f.chapter] = (byChapter[f.chapter] ?? 0) + 1;
}

console.log(`read applied: ${appliedPath}`);
console.log(`total fix proposals: ${fixes.length}`);
console.log('');
console.log('by field:');
for (const k of fieldOrder) if (byField[k]) console.log(`  ${k}: ${byField[k]}`);
console.log('');
console.log('by chapter:');
for (const ch of chapters) if (byChapter[ch]) console.log(`  ${ch}: ${byChapter[ch]}`);
console.log('');
console.log(`wrote: ${outPath} (${fixes.length} rows)`);
