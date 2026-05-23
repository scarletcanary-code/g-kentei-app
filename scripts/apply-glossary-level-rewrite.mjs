import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { join, dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const repoRoot = join(projectRoot, '..');
const srcPath = join(projectRoot, 'src/data/glossary/terms.json');
const backupsRoot = join(repoRoot, '.harness/backups');

const EXPECTED_HEADER = ['id', 'term', 'beginnerDetail改', 'intermediateDetail改', 'detail改'];
const FIELD_MAP = {
  'beginnerDetail改': 'beginnerDetail',
  'intermediateDetail改': 'intermediateDetail',
  'detail改': 'detail',
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

const args = parseArgs(process.argv.slice(2));
if (!args.xlsx) fail('--xlsx <path> is required (default is dry-run, add --apply to write)');
const xlsxPath = resolvePath(args.xlsx);
if (!existsSync(xlsxPath)) fail(`xlsx not found: ${xlsxPath}`);

const wb = XLSX.readFile(xlsxPath);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
const header = rows[0].map((v) => String(v));
if (header.length < EXPECTED_HEADER.length || EXPECTED_HEADER.some((h, i) => h !== header[i])) {
  fail(`header mismatch.\n  expected: ${EXPECTED_HEADER.join(' | ')}\n  got:      ${header.join(' | ')}`);
}
const idx = Object.fromEntries(EXPECTED_HEADER.map((h, i) => [h, i]));

const xlsxById = new Map();
for (let r = 1; r < rows.length; r += 1) {
  const id = String(rows[r][idx['id']] ?? '').trim();
  if (!id) continue;
  xlsxById.set(id, {
    beginnerDetail: String(rows[r][idx['beginnerDetail改']] ?? '').trim(),
    intermediateDetail: String(rows[r][idx['intermediateDetail改']] ?? '').trim(),
    detail: String(rows[r][idx['detail改']] ?? '').trim(),
  });
}

const terms = JSON.parse(readFileSync(srcPath, 'utf8'));
const termById = new Map(terms.map((t) => [t.id, t]));

const xlsxOnly = [...xlsxById.keys()].filter((id) => !termById.has(id));
const jsonOnly = [...termById.keys()].filter((id) => !xlsxById.has(id));

let beginnerChanged = 0;
let beginnerAdded = 0;
let intermediateChanged = 0;
let intermediateAdded = 0;
let detailChanged = 0;
let detailUnchanged = 0;
const sampleDiffs = [];

const updatedTerms = terms.map((t) => {
  const rec = xlsxById.get(t.id);
  if (!rec) return t;
  const next = { ...t };
  const before = {
    beginnerDetail: t.beginnerDetail ?? '',
    intermediateDetail: t.intermediateDetail ?? '',
    detail: t.detail ?? '',
  };

  if (rec.beginnerDetail) {
    if (!t.beginnerDetail) {
      next.beginnerDetail = rec.beginnerDetail;
      beginnerAdded += 1;
    } else if (rec.beginnerDetail !== t.beginnerDetail) {
      next.beginnerDetail = rec.beginnerDetail;
      beginnerChanged += 1;
    }
  }

  if (rec.intermediateDetail) {
    if (!t.intermediateDetail) {
      next.intermediateDetail = rec.intermediateDetail;
      intermediateAdded += 1;
    } else if (rec.intermediateDetail !== t.intermediateDetail) {
      next.intermediateDetail = rec.intermediateDetail;
      intermediateChanged += 1;
    }
  }

  if (rec.detail) {
    if (rec.detail !== t.detail) {
      next.detail = rec.detail;
      detailChanged += 1;
    } else {
      detailUnchanged += 1;
    }
  }

  if (sampleDiffs.length < 3) {
    sampleDiffs.push({
      id: t.id,
      term: t.term,
      before,
      after: {
        beginnerDetail: next.beginnerDetail ?? '',
        intermediateDetail: next.intermediateDetail ?? '',
        detail: next.detail ?? '',
      },
    });
  }
  return next;
});

const totalChanges = beginnerChanged + beginnerAdded + intermediateChanged + intermediateAdded + detailChanged;

console.log(`xlsx: ${xlsxPath} (${xlsxById.size} rows)`);
console.log(`src:  ${srcPath} (${terms.length} terms)`);
console.log('');
console.log(`id reconciliation:`);
console.log(`  xlsx-only ids: ${xlsxOnly.length}${xlsxOnly.length ? ` (${xlsxOnly.slice(0, 5).join(', ')})` : ''}`);
console.log(`  json-only ids: ${jsonOnly.length}${jsonOnly.length ? ` (${jsonOnly.slice(0, 5).join(', ')})` : ''}`);
console.log('');
console.log('field changes:');
console.log(`  beginnerDetail     newly-added: ${beginnerAdded}  changed: ${beginnerChanged}`);
console.log(`  intermediateDetail newly-added: ${intermediateAdded}  changed: ${intermediateChanged}`);
console.log(`  detail             changed: ${detailChanged}  unchanged: ${detailUnchanged}`);
console.log(`  definition         (not in xlsx, unchanged)`);
console.log('');
console.log(`total field updates: ${totalChanges}`);
console.log('');

console.log('--- sample diff (first 3 terms) ---');
for (const s of sampleDiffs) {
  console.log(`[${s.id}] ${s.term}`);
  for (const f of ['beginnerDetail', 'intermediateDetail', 'detail']) {
    const b = s.before[f] ?? '';
    const a = s.after[f] ?? '';
    if (b !== a) {
      console.log(`  ${f}:`);
      console.log(`    before(${b.length}字): ${b.slice(0, 80)}${b.length > 80 ? '...' : ''}`);
      console.log(`    after (${a.length}字): ${a.slice(0, 80)}${a.length > 80 ? '...' : ''}`);
    }
  }
}
console.log('');

if (!args.apply) {
  console.log('### DRY RUN (no file was written). Re-run with --apply to write.');
  process.exit(0);
}

const stamp = jstStamp();
const backupDir = join(backupsRoot, `glossary-${stamp}`);
mkdirSync(backupDir, { recursive: true });
const backupPath = join(backupDir, 'terms.json');
copyFileSync(srcPath, backupPath);
writeFileSync(srcPath, JSON.stringify(updatedTerms, null, 2) + '\n', 'utf8');

console.log('### APPLIED');
console.log(`  backup:  ${backupPath}`);
console.log(`  updated: ${srcPath}`);
