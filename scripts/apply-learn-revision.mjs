import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { join, dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const repoRoot = join(projectRoot, '..');
const dataDir = join(projectRoot, 'src/data/learn');
const backupsRoot = join(repoRoot, '.harness/backups');

const chapters = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8'];

const HEADER = {
  id: '[元]id',
  beginner: '[元]section初級body',
  intermediate: '[元]section中級body',
  advanced: '[元]section上級body',
};

function parseArgs(argv) {
  const out = { apply: false, sheet: 'RevisedSections' };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--xlsx') out.xlsx = argv[++i];
    else if (a === '--sheet') out.sheet = argv[++i];
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

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));
if (!args.xlsx) fail('--xlsx <path> is required');
const xlsxPath = resolvePath(args.xlsx);
if (!existsSync(xlsxPath)) fail(`xlsx not found: ${xlsxPath}`);

const wb = XLSX.readFile(xlsxPath);
const ws = wb.Sheets[args.sheet];
if (!ws) fail(`sheet not found: ${args.sheet} (available: ${wb.SheetNames.join(', ')})`);
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
const header = rows[0].map((v) => String(v));
const idx = Object.fromEntries(header.map((h, i) => [h, i]));
for (const k of Object.values(HEADER)) if (!(k in idx)) fail(`column missing: ${k}`);

const revById = new Map();
for (let r = 1; r < rows.length; r += 1) {
  const id = String(rows[r][idx[HEADER.id]] ?? '').trim();
  if (!id) continue;
  revById.set(id, {
    beginner: String(rows[r][idx[HEADER.beginner]] ?? ''),
    intermediate: String(rows[r][idx[HEADER.intermediate]] ?? ''),
    advanced: String(rows[r][idx[HEADER.advanced]] ?? ''),
  });
}

const fileSrcs = new Map();
const updates = [];
const issues = [];
const sampleDiffs = [];

for (const chId of chapters) {
  const filePath = join(dataDir, `${chId}.ts`);
  const chap = loadChapter(filePath, chId);
  let fileSrc = readFileSync(filePath, 'utf8');

  chap.sections.forEach((sec, secIdx) => {
    const id = `${chId}-s${secIdx + 1}`;
    const rev = revById.get(id);
    if (!rev) return;
    const fields = [
      { name: 'beginnerBody', before: sec.beginnerBody ?? '', after: rev.beginner.trim() },
      { name: 'intermediateBody', before: sec.intermediateBody ?? '', after: rev.intermediate.trim() },
      { name: 'body', before: sec.body ?? '', after: rev.advanced.trim() },
    ];
    for (const f of fields) {
      if (!f.after) continue;
      if (f.before === f.after) continue;
      if (!f.before) {
        issues.push(`${id}/${f.name}: before is empty, skipping`);
        continue;
      }
      const count = fileSrc.split(f.before).length - 1;
      if (count === 0) {
        issues.push(`${id}/${f.name}: before not found in ${chId}.ts`);
        continue;
      }
      if (count > 1) {
        issues.push(`${id}/${f.name}: before appears ${count} times (ambiguous), skipping`);
        continue;
      }
      fileSrc = fileSrc.replace(f.before, f.after);
      updates.push({ chId, id, name: f.name, beforeLen: f.before.length, afterLen: f.after.length });
      if (sampleDiffs.length < 3 && f.name === 'body') {
        sampleDiffs.push({ id, name: f.name, before: f.before, after: f.after });
      }
    }
  });

  fileSrcs.set(chId, fileSrc);
}

const byField = {};
const byChapter = {};
for (const u of updates) {
  byField[u.name] = (byField[u.name] ?? 0) + 1;
  byChapter[u.chId] = (byChapter[u.chId] ?? 0) + 1;
}

console.log(`xlsx: ${xlsxPath} (sheet: ${args.sheet})`);
console.log(`updates: ${updates.length}`);
console.log('  by field:');
for (const k of ['beginnerBody', 'intermediateBody', 'body']) {
  if (byField[k]) console.log(`    ${k}: ${byField[k]}`);
}
console.log('  by chapter:');
for (const ch of chapters) if (byChapter[ch]) console.log(`    ${ch}: ${byChapter[ch]}`);
if (issues.length) {
  console.log('');
  console.log('issues:');
  for (const m of issues) console.log('  - ' + m);
}

console.log('');
console.log('--- sample diff (first 3 advanced bodies) ---');
for (const s of sampleDiffs) {
  console.log(`[${s.id}] ${s.name}`);
  console.log(`  before(${s.before.length}): ${s.before.slice(0, 100)}${s.before.length > 100 ? '...' : ''}`);
  console.log(`  after (${s.after.length}): ${s.after.slice(0, 100)}${s.after.length > 100 ? '...' : ''}`);
}

if (!args.apply) {
  console.log('');
  console.log('### DRY RUN (no file written). Re-run with --apply to write.');
  process.exit(0);
}

const stamp = jstStamp();
const backupDir = join(backupsRoot, `learn-${stamp}`);
mkdirSync(backupDir, { recursive: true });
const touchedChapters = new Set(updates.map((u) => u.chId));
for (const chId of touchedChapters) {
  const filePath = join(dataDir, `${chId}.ts`);
  copyFileSync(filePath, join(backupDir, `${chId}.ts`));
  writeFileSync(filePath, fileSrcs.get(chId), 'utf8');
}
console.log('');
console.log('### APPLIED');
console.log(`  updated chapters: ${[...touchedChapters].sort().join(', ')}`);
console.log(`  backups in: ${backupDir}`);
