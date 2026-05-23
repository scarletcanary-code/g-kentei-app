import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { join, dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const repoRoot = join(projectRoot, '..');
const termsPath = join(projectRoot, 'src/data/glossary/terms.json');
const backupsRoot = join(repoRoot, '.harness/backups');

const COL_KEYS = {
  id: 'id',
  term: 'term',
  termEn: 'termEn',
  categoryId: 'categoryId',
  importance: 'importance',
  definition: 'definition',
  beginnerDetail: 'beginnerDetail',
  intermediateDetail: 'intermediateDetail',
  detail: 'detail',
  relatedTermIds: 'relatedTermIds',
  source_ref_supplements: 'source_ref_supplements',
};

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

function splitList(s) {
  if (!s) return [];
  return String(s).split(/\s*;\s*/).map((x) => x.trim()).filter(Boolean);
}

const args = parseArgs(process.argv.slice(2));
if (!args.xlsx) fail('--xlsx <path> is required');
const xlsxPath = resolvePath(args.xlsx);
if (!existsSync(xlsxPath)) fail(`xlsx not found: ${xlsxPath}`);

const wb = XLSX.readFile(xlsxPath);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
const header = rows[0].map((v) => String(v));

// ヘッダー名は "definition (30-50字)" のような注釈を含むので、prefix 一致で解決
const idx = {};
for (const [key, prefix] of Object.entries(COL_KEYS)) {
  const i = header.findIndex((h) => h === prefix || h.startsWith(prefix + ' '));
  if (i < 0) fail(`column missing: ${prefix}`);
  idx[key] = i;
}

const existing = JSON.parse(readFileSync(termsPath, 'utf8'));
const existingIds = new Set(existing.map((t) => t.id));

const newEntries = [];
const issues = [];
for (let r = 1; r < rows.length; r += 1) {
  const row = rows[r];
  const id = String(row[idx.id] ?? '').trim();
  if (!id) continue;
  if (existingIds.has(id)) {
    issues.push(`${id}: already exists in terms.json (skipping)`);
    continue;
  }
  const entry = {
    id,
    term: String(row[idx.term] ?? '').trim(),
    termEn: String(row[idx.termEn] ?? '').trim(),
    categoryId: String(row[idx.categoryId] ?? '').trim(),
    definition: String(row[idx.definition] ?? '').trim(),
    detail: String(row[idx.detail] ?? '').trim(),
    relatedTermIds: splitList(row[idx.relatedTermIds]),
    importance: Number(row[idx.importance]),
    beginnerDetail: String(row[idx.beginnerDetail] ?? '').trim(),
    intermediateDetail: String(row[idx.intermediateDetail] ?? '').trim(),
    source_ref_supplements: splitList(row[idx.source_ref_supplements]),
  };
  newEntries.push(entry);
}

// relatedTermIds の検証 (新規 11 用語含む全 id 集合)
const allIdsAfter = new Set([...existingIds, ...newEntries.map((e) => e.id)]);
const invalidRefs = [];
for (const e of newEntries) {
  for (const rid of e.relatedTermIds) {
    if (!allIdsAfter.has(rid)) invalidRefs.push(`${e.id}: relatedTermIds contains unknown id "${rid}"`);
  }
}
// beginnerDetail 60 字未満チェック
const shortBeginner = [];
for (const e of newEntries) {
  if (e.beginnerDetail.length < 60) shortBeginner.push(`${e.id}: beginnerDetail is ${e.beginnerDetail.length} chars (need >= 60)`);
}

console.log(`xlsx: ${xlsxPath}`);
console.log(`existing terms: ${existing.length}`);
console.log(`new entries to add: ${newEntries.length}`);
console.log('');
if (issues.length) {
  console.log('issues:');
  for (const m of issues) console.log('  - ' + m);
  console.log('');
}
if (invalidRefs.length) {
  console.error('!! invalid relatedTermIds references:');
  for (const m of invalidRefs) console.error('  - ' + m);
  console.error('');
}
if (shortBeginner.length) {
  console.error('!! beginnerDetail too short:');
  for (const m of shortBeginner) console.error('  - ' + m);
  console.error('');
}

console.log('--- new entries preview ---');
for (const e of newEntries.slice(0, 3)) {
  console.log(`[${e.id}] ${e.term} (${e.termEn}) cat=${e.categoryId} imp=${e.importance}`);
  console.log(`  definition (${e.definition.length}): ${e.definition.slice(0, 60)}`);
  console.log(`  beginnerDetail (${e.beginnerDetail.length}): ${e.beginnerDetail.slice(0, 60)}`);
  console.log(`  relatedTermIds: [${e.relatedTermIds.join(', ')}]`);
}

if (!args.apply) {
  console.log('');
  console.log('### DRY RUN (no file written). Re-run with --apply to write.');
  process.exit(invalidRefs.length || shortBeginner.length ? 1 : 0);
}

if (invalidRefs.length || shortBeginner.length) {
  console.error('### Aborting --apply due to validation errors above');
  process.exit(1);
}

const stamp = jstStamp();
const backupDir = join(backupsRoot, `glossary-${stamp}`);
mkdirSync(backupDir, { recursive: true });
copyFileSync(termsPath, join(backupDir, 'terms.json'));

const merged = [...existing, ...newEntries];
writeFileSync(termsPath, JSON.stringify(merged, null, 2) + '\n', 'utf8');

console.log('');
console.log('### APPLIED');
console.log(`  backup:  ${join(backupDir, 'terms.json')}`);
console.log(`  updated: ${termsPath} (${existing.length} → ${merged.length} terms)`);
