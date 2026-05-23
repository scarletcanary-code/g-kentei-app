import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { join, dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const repoRoot = join(projectRoot, '..');
const dataDir = join(projectRoot, 'src/data/questions');
const backupsRoot = join(repoRoot, '.harness/backups');

const chapters = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8'];
const FIELD_RE = /^(choice[0-3]|rationale[0-3]|explanation|correctIndex変更)(?:改)?:\s*(.*)$/;
const fieldOrder = ['choice0', 'choice1', 'choice2', 'choice3', 'rationale0', 'rationale1', 'rationale2', 'rationale3', 'explanation', 'correctIndex変更'];

function parseArgs(argv) {
  const out = { apply: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--xlsx') out.xlsx = argv[++i];
    else if (a === '--apply') out.apply = true;
    else if (a === '--dry-run') out.apply = false;
  }
  return out;
}

function resolvePath(p) {
  if (!p) return p;
  return isAbsolute(p) ? p : resolve(process.cwd(), p);
}

function jstStamp() {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  return d.toISOString().slice(0, 19).replace(/[-:T]/g, '').replace(/(\d{8})(\d{6})/, '$1-$2');
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function parseFixCell(cellText) {
  if (!cellText) return [];
  const items = [];
  const lines = String(cellText).split(/\r?\n/);
  let cur = null;
  for (const line of lines) {
    const m = line.match(FIELD_RE);
    if (m) {
      if (cur) items.push(cur);
      cur = { field: m[1], text: m[2] };
    } else if (cur) {
      cur.text += '\n' + line;
    }
  }
  if (cur) items.push(cur);
  return items.map((it) => ({ field: it.field, text: it.text.trim() })).filter((it) => it.text);
}

function applyUpdate(q, field, newText) {
  if (field === 'explanation') {
    q.explanation = newText;
    return;
  }
  let m = field.match(/^choice([0-3])$/);
  if (m) {
    const i = Number(m[1]);
    if (!Array.isArray(q.choices) || !q.choices[i]) throw new Error(`${q.id}: choices[${i}] missing`);
    q.choices[i].text = newText;
    return;
  }
  m = field.match(/^rationale([0-3])$/);
  if (m) {
    const i = Number(m[1]);
    if (!Array.isArray(q.optionRationales)) q.optionRationales = ['', '', '', ''];
    q.optionRationales[i] = newText;
    return;
  }
  throw new Error(`${q.id}: unknown field ${field}`);
}

function beforeFor(q, field) {
  if (field === 'explanation') return q.explanation ?? '';
  let m = field.match(/^choice([0-3])$/);
  if (m) return q.choices?.[Number(m[1])]?.text ?? '';
  m = field.match(/^rationale([0-3])$/);
  if (m) return (q.optionRationales ?? [])[Number(m[1])] ?? '';
  return '';
}

const args = parseArgs(process.argv.slice(2));
if (!args.xlsx) fail('--xlsx <path> is required (default is dry-run, add --apply to write)');
const xlsxPath = resolvePath(args.xlsx);
if (!existsSync(xlsxPath)) fail(`xlsx not found: ${xlsxPath}`);

const wb = XLSX.readFile(xlsxPath);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
const header = rows[0].map((v) => String(v));

const idCol = header.indexOf('[元]id');
const fixCol = header.indexOf('[精査]修正提案');
if (idCol < 0 || fixCol < 0) fail(`expected [元]id and [精査]修正提案 columns, header: ${header.join(' | ')}`);

const questionsByChapter = new Map();
for (const ch of chapters) {
  questionsByChapter.set(ch, JSON.parse(readFileSync(join(dataDir, `${ch}.json`), 'utf8')));
}
const questionById = new Map();
const chapterById = new Map();
for (const [ch, qs] of questionsByChapter) {
  for (const q of qs) {
    questionById.set(q.id, q);
    chapterById.set(q.id, ch);
  }
}

const updates = [];
const unknownIds = [];
const correctIndexChanges = [];
for (let r = 1; r < rows.length; r += 1) {
  const id = String(rows[r][idCol] ?? '').trim();
  if (!id) continue;
  const fixText = String(rows[r][fixCol] ?? '').trim();
  if (!fixText) continue;
  if (!questionById.has(id)) {
    unknownIds.push(id);
    continue;
  }
  const items = parseFixCell(fixText);
  for (const it of items) {
    if (it.field === 'correctIndex変更') {
      correctIndexChanges.push({ id, text: it.text });
      continue;
    }
    updates.push({ id, chapter: chapterById.get(id), field: it.field, text: it.text });
  }
}

updates.sort((a, b) => (a.id === b.id ? fieldOrder.indexOf(a.field) - fieldOrder.indexOf(b.field) : a.id.localeCompare(b.id)));

const byField = {};
const byChapter = {};
for (const u of updates) {
  byField[u.field] = (byField[u.field] ?? 0) + 1;
  byChapter[u.chapter] = (byChapter[u.chapter] ?? 0) + 1;
}

console.log(`xlsx: ${xlsxPath} (${rows.length - 1} rows)`);
console.log(`updates to apply: ${updates.length}`);
console.log('  by field:');
for (const k of fieldOrder) if (byField[k]) console.log(`    ${k}: ${byField[k]}`);
console.log('  by chapter:');
for (const ch of chapters) if (byChapter[ch]) console.log(`    ${ch}: ${byChapter[ch]}`);
console.log('');

if (unknownIds.length) console.error(`!! unknown ids: ${unknownIds.length} (${unknownIds.slice(0, 5).join(', ')})`);
if (correctIndexChanges.length) {
  console.error(`!! correctIndex変更 提案: ${correctIndexChanges.length} 件 (反映しません)`);
  for (const c of correctIndexChanges) console.error(`  - ${c.id}: ${c.text}`);
}

console.log('--- sample diff (first 3 updates) ---');
for (const u of updates.slice(0, 3)) {
  const q = questionById.get(u.id);
  const before = beforeFor(q, u.field);
  console.log(`[${u.id}] ${u.field}`);
  console.log(`  before: ${before.slice(0, 100)}${before.length > 100 ? '...' : ''}`);
  console.log(`  after : ${u.text.slice(0, 100)}${u.text.length > 100 ? '...' : ''}`);
}
console.log('');

if (!args.apply) {
  console.log('### DRY RUN (no chapter json was written). Re-run with --apply to write.');
  process.exit(0);
}

const stamp = jstStamp();
const backupDir = join(backupsRoot, `questions-${stamp}`);
mkdirSync(backupDir, { recursive: true });
const touchedChapters = new Set(updates.map((u) => u.chapter));

for (const u of updates) {
  applyUpdate(questionById.get(u.id), u.field, u.text);
}

const backupPaths = [];
for (const ch of touchedChapters) {
  const src = join(dataDir, `${ch}.json`);
  const backup = join(backupDir, `${ch}.json`);
  copyFileSync(src, backup);
  backupPaths.push(backup);
  writeFileSync(src, JSON.stringify(questionsByChapter.get(ch), null, 2) + '\n', 'utf8');
}

console.log('### APPLIED');
console.log(`  updated chapters: ${[...touchedChapters].sort().join(', ')}`);
console.log(`  backups in: ${backupDir}`);
