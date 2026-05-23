import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const dataDir = join(projectRoot, 'src/data/questions');

const chapters = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8'];

const EXPECTED_HEADERS = ['id', '章', 'field', 'GPT判定', 'before (現状)', 'after (GPT提案)', 'GPT総合コメント', '[判定]採否', '[判定]最終文(編集)', '[判定]メモ'];
const VERDICT_ACCEPT = new Set(['採用', '一部採用']);
const VERDICT_REJECT = new Set(['不要', '却下', 'NG']);
const FIELD_RE = /^(choice[0-3]|rationale[0-3]|explanation|correctIndex変更)$/;

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

const args = parseArgs(process.argv.slice(2));
if (!args.xlsx) fail('--xlsx <path> is required (default is dry-run, add --apply to write)');
const xlsxPath = resolvePath(args.xlsx);
if (!existsSync(xlsxPath)) fail(`xlsx not found: ${xlsxPath}`);

const wb = XLSX.readFile(xlsxPath);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
if (rows.length < 2) fail('xlsx has no data rows');

const header = rows[0].map((v) => String(v));
if (header.length !== EXPECTED_HEADERS.length || EXPECTED_HEADERS.some((h, i) => h !== header[i])) {
  fail(`header mismatch.\n  expected: ${EXPECTED_HEADERS.join(' | ')}\n  got:      ${header.join(' | ')}`);
}
const idx = Object.fromEntries(header.map((h, i) => [h, i]));

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

const verdictCounts = {};
const fieldCounts = {};
const chapterCounts = {};
const unexpectedVerdicts = [];
const unexpectedFields = [];
const idNotFound = [];
const skippedRejected = [];
const correctIndexChanges = [];
const updates = [];

for (let r = 1; r < rows.length; r += 1) {
  const row = rows[r];
  const id = String(row[idx['id']] ?? '').trim();
  const field = String(row[idx['field']] ?? '').trim();
  const verdict = String(row[idx['[判定]採否']] ?? '').trim();
  const finalText = String(row[idx['[判定]最終文(編集)']] ?? '');
  const afterText = String(row[idx['after (GPT提案)']] ?? '');
  const memo = String(row[idx['[判定]メモ']] ?? '').trim();

  verdictCounts[verdict || '(empty)'] = (verdictCounts[verdict || '(empty)'] ?? 0) + 1;

  if (!id) continue;
  if (!FIELD_RE.test(field)) {
    unexpectedFields.push({ id, field });
    continue;
  }
  if (!questionById.has(id)) {
    idNotFound.push(id);
    continue;
  }
  if (VERDICT_REJECT.has(verdict)) {
    skippedRejected.push({ id, field });
    continue;
  }
  if (!VERDICT_ACCEPT.has(verdict)) {
    unexpectedVerdicts.push({ id, field, verdict });
    continue;
  }

  const newText = (finalText.trim() ? finalText : afterText).trim();
  if (!newText) {
    unexpectedVerdicts.push({ id, field, verdict: `${verdict}(no-text)` });
    continue;
  }

  if (field === 'correctIndex変更') {
    correctIndexChanges.push({ id, newText, memo });
    continue;
  }

  fieldCounts[field] = (fieldCounts[field] ?? 0) + 1;
  chapterCounts[chapterById.get(id)] = (chapterCounts[chapterById.get(id)] ?? 0) + 1;
  updates.push({ id, chapter: chapterById.get(id), field, newText, verdict });
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

const samplePreview = updates.slice(0, 3);

console.log(`xlsx: ${xlsxPath} (${rows.length - 1} rows)`);
console.log(`questions: ${questionById.size} total across ${chapters.length} chapters`);
console.log('');
console.log('verdict distribution:');
for (const [k, v] of Object.entries(verdictCounts).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v}`);
console.log('');
console.log(`updates to apply: ${updates.length}`);
console.log('  by field:');
for (const k of ['choice0', 'choice1', 'choice2', 'choice3', 'rationale0', 'rationale1', 'rationale2', 'rationale3', 'explanation']) {
  if (fieldCounts[k]) console.log(`    ${k}: ${fieldCounts[k]}`);
}
console.log('  by chapter:');
for (const ch of chapters) if (chapterCounts[ch]) console.log(`    ${ch}: ${chapterCounts[ch]}`);
console.log('');

if (skippedRejected.length) console.log(`skipped (rejected verdict): ${skippedRejected.length}`);
if (idNotFound.length) console.log(`!! id not found in questions: ${idNotFound.length} (${idNotFound.slice(0, 5).join(', ')}${idNotFound.length > 5 ? ', ...' : ''})`);
if (unexpectedFields.length) console.log(`!! unexpected field values: ${unexpectedFields.length}`);
if (unexpectedVerdicts.length) console.log(`!! unexpected verdict / missing text: ${unexpectedVerdicts.length}`);
if (correctIndexChanges.length) {
  console.error(`!! correctIndex変更 採用: ${correctIndexChanges.length} 件`);
  for (const c of correctIndexChanges) console.error(`  - ${c.id}: ${c.newText} memo=${c.memo}`);
  console.error('  → このスクリプトでは correctIndex は変更しません (人手で別反映)');
}
console.log('');

console.log('--- sample diff (first 3 updates) ---');
for (const u of samplePreview) {
  const q = questionById.get(u.id);
  let before = '';
  if (u.field === 'explanation') before = q.explanation;
  else {
    let m = u.field.match(/^choice([0-3])$/);
    if (m) before = q.choices[Number(m[1])].text;
    else {
      m = u.field.match(/^rationale([0-3])$/);
      if (m) before = (q.optionRationales ?? [])[Number(m[1])] ?? '';
    }
  }
  console.log(`[${u.id}] ${u.field} (${u.verdict})`);
  console.log(`  before: ${before.slice(0, 100)}${before.length > 100 ? '...' : ''}`);
  console.log(`  after : ${u.newText.slice(0, 100)}${u.newText.length > 100 ? '...' : ''}`);
}
console.log('');

if (!args.apply) {
  console.log('### DRY RUN (no chapter json was written). Re-run with --apply to write.');
  process.exit(0);
}

const stamp = jstStamp();
const touchedChapters = new Set(updates.map((u) => u.chapter));
const backupPaths = [];

for (const u of updates) {
  applyUpdate(questionById.get(u.id), u.field, u.newText);
}

for (const ch of touchedChapters) {
  const src = join(dataDir, `${ch}.json`);
  const backup = join(dataDir, `${ch}.backup-${stamp}.json`);
  copyFileSync(src, backup);
  backupPaths.push(backup);
  writeFileSync(src, JSON.stringify(questionsByChapter.get(ch), null, 2) + '\n', 'utf8');
}

console.log('### APPLIED');
console.log(`  updated chapters: ${[...touchedChapters].sort().join(', ')}`);
console.log(`  backups:`);
for (const p of backupPaths) console.log(`    ${p}`);
