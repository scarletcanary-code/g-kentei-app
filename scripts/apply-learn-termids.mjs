import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const repoRoot = join(projectRoot, '..');
const dataDir = join(projectRoot, 'src/data/learn');
const termsPath = join(projectRoot, 'src/data/glossary/terms.json');
const backupsRoot = join(repoRoot, '.harness/backups');

const chapters = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8'];

// 確定済み修正対応表 (judged xlsx + Phase 1 探索結果より)
// add: 追加すべき termId / remove: 削除すべき termId
// 不在 ID は実行時に terms.json と突合して自動 skip
const CORRECTIONS = [
  { id: 'ch1-s1', add: ['artificial_intelligence', 'ai_level_classification'], remove: [] },
  { id: 'ch1-s4', add: ['ai_effect'], remove: [] },
  { id: 'ch2-s1', add: ['ai_winter', 'knowledge_acquisition_bottleneck'], remove: [] },
  { id: 'ch2-s3', add: ['alphago', 'generative_ai', 'foundation_model'], remove: [] },
  { id: 'ch3-s2', add: ['svm'], remove: [] },
  { id: 'ch3-s4', add: ['auc', 'roc_curve', 'accuracy'], remove: [] },
  { id: 'ch4-s4', add: ['skip_connection'], remove: [] },
  { id: 'ch5-s1', add: ['cnn', 'image_recognition'], remove: [] },
  { id: 'ch5-s2', add: ['rnn'], remove: [] },
  { id: 'ch5-s4', add: ['self_attention', 'positional_encoding'], remove: [] },
  { id: 'ch6-s1', add: ['llm', 'masked_language_model'], remove: ['regression'] },
  { id: 'ch6-s4', add: ['seq2seq', 'encoder_decoder'], remove: [] },
  { id: 'ch7-s4', add: ['preprocessing', 'missing_value', 'normalization', 'standardization'], remove: [] },
  { id: 'ch7-s5', add: ['shap'], remove: [] },
];

function parseArgs(argv) {
  const out = { apply: false };
  for (const a of argv) {
    if (a === '--apply') out.apply = true;
    else if (a === '--dry-run') out.apply = false;
  }
  return out;
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

function renderTermIdsLiteral(ids) {
  if (ids.length === 0) return `termIds: []`;
  return `termIds: [${ids.map((s) => `'${s}'`).join(', ')}]`;
}

const args = parseArgs(process.argv.slice(2));

const terms = JSON.parse(readFileSync(termsPath, 'utf8'));
const existingTermIds = new Set(terms.map((t) => t.id));

const correctionByChapter = new Map();
for (const c of CORRECTIONS) {
  const ch = c.id.split('-')[0];
  if (!correctionByChapter.has(ch)) correctionByChapter.set(ch, []);
  correctionByChapter.get(ch).push(c);
}

const fileSrcs = new Map();
let opsApplied = 0;
let opsSkipped = 0;
const skippedNotFound = [];
const sampleChanges = [];
const issues = [];

for (const chId of chapters) {
  const corrections = correctionByChapter.get(chId);
  if (!corrections) continue;
  const filePath = join(dataDir, `${chId}.ts`);
  const chap = loadChapter(filePath, chId);
  let fileSrc = readFileSync(filePath, 'utf8');

  for (const c of corrections) {
    const secIdx = Number(c.id.split('-s')[1]) - 1;
    const sec = chap.sections[secIdx];
    if (!sec) {
      issues.push(`${c.id}: section index out of range`);
      continue;
    }
    const before = sec.termIds ?? [];
    const filtered = c.add.filter((id) => {
      if (!existingTermIds.has(id)) {
        skippedNotFound.push(`${c.id}: ${id} (not in terms.json)`);
        opsSkipped += 1;
        return false;
      }
      if (before.includes(id)) {
        issues.push(`${c.id}: ${id} already present, skipping add`);
        opsSkipped += 1;
        return false;
      }
      opsApplied += 1;
      return true;
    });
    let after = [...before];
    for (const id of c.remove) {
      const idx = after.indexOf(id);
      if (idx < 0) {
        issues.push(`${c.id}: ${id} not in current termIds, skipping remove`);
        opsSkipped += 1;
      } else {
        after.splice(idx, 1);
        opsApplied += 1;
      }
    }
    after = [...after, ...filtered];
    if (after.length === before.length && after.every((v, i) => v === before[i])) continue;

    const oldLiteral = renderTermIdsLiteral(before);
    const newLiteral = renderTermIdsLiteral(after);
    const count = fileSrc.split(oldLiteral).length - 1;
    if (count === 0) {
      issues.push(`${c.id}: termIds literal not found in source (${oldLiteral})`);
      continue;
    }
    if (count > 1) {
      issues.push(`${c.id}: termIds literal appears ${count} times (ambiguous)`);
      continue;
    }
    fileSrc = fileSrc.replace(oldLiteral, newLiteral);
    if (sampleChanges.length < 3) {
      sampleChanges.push({ id: c.id, before, after });
    }
  }

  fileSrcs.set(chId, fileSrc);
}

console.log(`corrections: ${CORRECTIONS.length} sections`);
console.log(`ops applied: ${opsApplied}`);
console.log(`ops skipped: ${opsSkipped}`);
if (skippedNotFound.length) {
  console.log('');
  console.log(`skipped (id not in terms.json, ${skippedNotFound.length}):`);
  for (const m of skippedNotFound) console.log('  - ' + m);
}
if (issues.length) {
  console.log('');
  console.log('issues:');
  for (const m of issues) console.log('  - ' + m);
}

console.log('');
console.log('--- sample changes (first 3) ---');
for (const s of sampleChanges) {
  console.log(`[${s.id}]`);
  console.log(`  before: [${s.before.join(', ')}]`);
  console.log(`  after : [${s.after.join(', ')}]`);
}

if (!args.apply) {
  console.log('');
  console.log('### DRY RUN (no file written). Re-run with --apply to write.');
  process.exit(0);
}

const stamp = jstStamp();
const backupDir = join(backupsRoot, `learn-termids-${stamp}`);
mkdirSync(backupDir, { recursive: true });
const touched = [...fileSrcs.keys()];
for (const chId of touched) {
  const filePath = join(dataDir, `${chId}.ts`);
  copyFileSync(filePath, join(backupDir, `${chId}.ts`));
  writeFileSync(filePath, fileSrcs.get(chId), 'utf8');
}
console.log('');
console.log('### APPLIED');
console.log(`  updated chapters: ${touched.sort().join(', ')}`);
console.log(`  backups in: ${backupDir}`);
