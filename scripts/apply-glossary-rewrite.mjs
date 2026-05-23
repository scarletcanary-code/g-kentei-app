import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { join, dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const repoRoot = join(projectRoot, '..');
const exportsDir = join(repoRoot, '.harness/exports');
mkdirSync(exportsDir, { recursive: true });

const DEFAULT_SRC = join(projectRoot, 'src/data/glossary/terms.json');

const EXPECTED_HEADER = [
  'id',
  'definition改',
  'beginnerDetail改',
  'intermediateDetail改',
  'detail修正要否',
  '総合コメント',
];

const DETAIL_VOCAB = ['OK', '軽微修正', '要修正'];

function parseArgs(argv) {
  const out = { apply: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--tsv') out.tsv = argv[++i];
    else if (a === '--src') out.src = argv[++i];
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
  const iso = d.toISOString();
  return iso.slice(0, 19).replace(/[-:T]/g, '').replace(/(\d{8})(\d{6})/, '$1-$2');
}

function jstDate() {
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
if (!args.tsv) fail('--tsv <path> is required (use --apply to write, default is dry-run)');

const tsvPath = resolvePath(args.tsv);
if (!existsSync(tsvPath)) fail(`tsv not found: ${tsvPath}`);
const srcPath = args.src ? resolvePath(args.src) : DEFAULT_SRC;
if (!existsSync(srcPath)) fail(`src json not found: ${srcPath}`);

const tsvRaw = stripBom(readFileSync(tsvPath, 'utf8'));
const lines = tsvRaw.split(/\r?\n/).filter((l) => l.length > 0);
const header = lines[0].split('\t');
if (header.length !== EXPECTED_HEADER.length || header.some((h, i) => h !== EXPECTED_HEADER[i])) {
  fail(`tsv header mismatch.\n  expected: ${EXPECTED_HEADER.join(' | ')}\n  got:      ${header.join(' | ')}`);
}

const tsvById = new Map();
const duplicateIds = [];
for (let i = 1; i < lines.length; i += 1) {
  const cols = lines[i].split('\t');
  while (cols.length < EXPECTED_HEADER.length) cols.push('');
  const [id, definition, beginner, intermediate, detailNeed, comment] = cols;
  if (tsvById.has(id)) duplicateIds.push(id);
  tsvById.set(id, {
    definition: unescapeNewlines(definition ?? '').trim(),
    beginnerDetail: unescapeNewlines(beginner ?? '').trim(),
    intermediateDetail: unescapeNewlines(intermediate ?? '').trim(),
    detailNeed: (detailNeed ?? '').trim(),
    comment: unescapeNewlines(comment ?? '').trim(),
  });
}

const terms = JSON.parse(readFileSync(srcPath, 'utf8'));
const termById = new Map(terms.map((t) => [t.id, t]));

const tsvOnly = [];
const jsonOnly = [];
const unexpectedDetail = [];

for (const id of tsvById.keys()) if (!termById.has(id)) tsvOnly.push(id);
for (const id of termById.keys()) if (!tsvById.has(id)) jsonOnly.push(id);
for (const [id, rec] of tsvById) {
  if (rec.detailNeed && !DETAIL_VOCAB.includes(rec.detailNeed)) unexpectedDetail.push({ id, value: rec.detailNeed });
}

let definitionChanged = 0;
let definitionUnchanged = 0;
let beginnerAdded = 0;
let beginnerChanged = 0;
let intermediateAdded = 0;
let intermediateChanged = 0;
const detailNeedSummary = {};
const sampleDiffs = [];

const updatedTerms = terms.map((t) => {
  const rec = tsvById.get(t.id);
  if (!rec) return t;
  const next = { ...t };
  const before = { definition: t.definition, beginnerDetail: t.beginnerDetail ?? '', intermediateDetail: t.intermediateDetail ?? '' };

  if (rec.definition && rec.definition !== t.definition) {
    next.definition = rec.definition;
    definitionChanged += 1;
  } else {
    definitionUnchanged += 1;
  }

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

  detailNeedSummary[rec.detailNeed || '(empty)'] = (detailNeedSummary[rec.detailNeed || '(empty)'] ?? 0) + 1;

  if (sampleDiffs.length < 3) {
    sampleDiffs.push({ id: t.id, before, after: { definition: next.definition, beginnerDetail: next.beginnerDetail ?? '', intermediateDetail: next.intermediateDetail ?? '' } });
  }
  return next;
});

const totalChanges = definitionChanged + beginnerAdded + beginnerChanged + intermediateAdded + intermediateChanged;

console.log(`tsv: ${tsvPath} (${tsvById.size} rows)`);
console.log(`src: ${srcPath} (${terms.length} terms)`);
console.log('');
console.log('id reconciliation:');
console.log(`  tsv-only ids:  ${tsvOnly.length}${tsvOnly.length ? ` (${tsvOnly.slice(0, 5).join(', ')}${tsvOnly.length > 5 ? ', ...' : ''})` : ''}`);
console.log(`  json-only ids: ${jsonOnly.length}${jsonOnly.length ? ` (${jsonOnly.slice(0, 5).join(', ')}${jsonOnly.length > 5 ? ', ...' : ''})` : ''}`);
console.log(`  duplicate ids: ${duplicateIds.length}`);
console.log('');
console.log('field changes (will apply on --apply):');
console.log(`  definition         changed: ${definitionChanged}  unchanged: ${definitionUnchanged}`);
console.log(`  beginnerDetail     newly-added: ${beginnerAdded}  changed: ${beginnerChanged}`);
console.log(`  intermediateDetail newly-added: ${intermediateAdded}  changed: ${intermediateChanged}`);
console.log(`  detail本文                 unchanged (TSV に書き直し本文なし)`);
console.log('');
console.log('detail修正要否 summary (informational only):');
for (const [k, v] of Object.entries(detailNeedSummary).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}: ${v}`);
}
if (unexpectedDetail.length > 0) {
  console.log(`  unexpected vocab: ${unexpectedDetail.length} (${unexpectedDetail.slice(0, 3).map((x) => `${x.id}:"${x.value}"`).join(', ')}...)`);
}
console.log('');
console.log(`total field updates: ${totalChanges}`);
console.log('');

console.log('--- sample diff (first 3 ids) ---');
for (const s of sampleDiffs) {
  console.log(`[${s.id}]`);
  for (const f of ['definition', 'beginnerDetail', 'intermediateDetail']) {
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

const detailReviewCsvPath = join(exportsDir, `glossary-detail-review-needed-${jstDate()}.csv`);
const csvLines = ['id\tterm\tdetailNeed\tcomment'];
for (const t of terms) {
  const rec = tsvById.get(t.id);
  if (!rec) continue;
  if (rec.detailNeed === '要修正' || rec.detailNeed === '軽微修正') {
    const esc = (s) => String(s ?? '').replace(/[\t\r\n]/g, ' ');
    csvLines.push(`${t.id}\t${esc(t.term)}\t${rec.detailNeed}\t${esc(rec.comment)}`);
  }
}
writeFileSync(detailReviewCsvPath, csvLines.join('\n'), 'utf8');
console.log(`detail review tracker: ${detailReviewCsvPath} (${csvLines.length - 1} rows)`);

if (!args.apply) {
  console.log('');
  console.log('### DRY RUN (no files were written to src/data/glossary/terms.json). Re-run with --apply to write.');
  process.exit(0);
}

const backupPath = srcPath.replace(/\.json$/, `.backup-${jstStamp()}.json`);
copyFileSync(srcPath, backupPath);
writeFileSync(srcPath, JSON.stringify(updatedTerms, null, 2) + '\n', 'utf8');
console.log('');
console.log(`### APPLIED`);
console.log(`  backup:  ${backupPath}`);
console.log(`  updated: ${srcPath}`);
