#!/usr/bin/env node
// Step8j-2c-{1..6}: B1〜B6 のバッチ単位で terms.json に append する
// usage:
//   node scripts/apply-step8j-2c-batches.mjs --dry-run --all
//   node scripts/apply-step8j-2c-batches.mjs --dry-run --batch B1
//   node scripts/apply-step8j-2c-batches.mjs --batch B1
//   node scripts/apply-step8j-2c-batches.mjs --all

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const repoRoot = resolve(projectRoot, '..');
const TERMS_JSON = resolve(projectRoot, 'src/data/glossary/terms.json');
const DRAFT_JSON = resolve(repoRoot, '.harness/step8j/step8j-2c0-add-terms-draft.json');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const all = args.includes('--all');
const batchIdx = args.indexOf('--batch');
const explicitBatch = batchIdx >= 0 ? args[batchIdx + 1] : null;
if (!all && !explicitBatch) {
  console.error('ERROR: pass --all or --batch <ID>');
  process.exit(2);
}

const ALLOWED_FIELDS = [
  'id','term','termEn','categoryId','definition','detail',
  'beginnerDetail','intermediateDetail','relatedTermIds','importance',
  'source_ref_supplements','aliases',
];
const REQUIRED_FIELDS = ['id','term','termEn','categoryId','definition','detail','relatedTermIds','importance'];

function pickAllowed(d) {
  const out = {};
  for (const f of ALLOWED_FIELDS) {
    if (d[f] !== undefined) out[f] = d[f];
  }
  return out;
}

const draft = JSON.parse(readFileSync(DRAFT_JSON, 'utf8'));
const draftIdSet = new Set(draft.map(d => d.id));

// 全バッチを通したターゲット ID 集合を作っておく（relatedTermIds 解決チェック用）
const allBatchIds = ['B1','B2','B3','B4','B5','B6'];
const orderedBatch = explicitBatch ? [explicitBatch] : allBatchIds;
const orderedBatchSet = new Set(orderedBatch);

let terms = JSON.parse(readFileSync(TERMS_JSON, 'utf8'));
const startCount = terms.length;
const summary = [];
const issues = [];

function existingSets() {
  return {
    idSet: new Set(terms.map(t => t.id)),
    termSet: new Set(terms.map(t => t.term)),
    termEnSet: new Set(terms.map(t => t.termEn)),
    aliasSet: new Set(terms.flatMap(t => t.aliases ?? [])),
  };
}

for (const batchId of orderedBatch) {
  const subset = draft.filter(d => d._meta?.batch_id === batchId);
  if (subset.length === 0) {
    issues.push(`batch ${batchId}: 対象 0 件（draft に見当たらない）`);
    break;
  }

  // 入力検証（バッチ内 + 既存との衝突）
  const ex = existingSets();
  // (a) 必須フィールド
  for (const d of subset) {
    for (const f of REQUIRED_FIELDS) {
      if (d[f] === undefined || d[f] === null || d[f] === '') {
        issues.push(`${batchId} ${d.id}: 必須フィールド欠落 ${f}`);
      }
    }
    if (![1,2,3].includes(d.importance)) issues.push(`${batchId} ${d.id}: importance 不正`);
    if (!/^ch[1-8]$/.test(d.categoryId)) issues.push(`${batchId} ${d.id}: categoryId 不正`);
    // _meta は出力には含まない（ここではチェックのみ）
  }
  // (b) 既存と重複
  for (const d of subset) {
    if (ex.idSet.has(d.id)) issues.push(`${batchId} ${d.id}: 既存 id と重複`);
    if (ex.termSet.has(d.term)) issues.push(`${batchId} ${d.id}: 既存 term と重複 (${d.term})`);
    if (ex.termEnSet.has(d.termEn)) issues.push(`${batchId} ${d.id}: 既存 termEn と重複 (${d.termEn})`);
  }
  // (c) 禁止 ID（data_cleansing / clip）
  for (const d of subset) {
    if (d.id === 'data_cleansing') issues.push(`${batchId} ${d.id}: 追加禁止 (Step8j-2d merge 振替対象)`);
    if (d.id === 'clip') issues.push(`${batchId} ${d.id}: 追加禁止 (clip_model に統合)`);
  }
  // (d) relatedTermIds 解決チェック
  //  許容: 既存 terms 全件 ∪ draft 全 89 件
  const allowed = new Set([...ex.idSet, ...draftIdSet]);
  for (const d of subset) {
    if (!Array.isArray(d.relatedTermIds)) {
      issues.push(`${batchId} ${d.id}: relatedTermIds が配列でない`);
      continue;
    }
    if (d.relatedTermIds.length > 10) issues.push(`${batchId} ${d.id}: relatedTermIds 10件超`);
    for (const r of d.relatedTermIds) {
      if (!allowed.has(r)) issues.push(`${batchId} ${d.id}: 未解決 relatedTermId "${r}"`);
      if (r === d.id) issues.push(`${batchId} ${d.id}: 自己参照`);
    }
  }

  if (issues.length > 0) {
    console.error('=== STOP: validation issues ===');
    for (const x of issues) console.error('  - ' + x);
    process.exit(1);
  }

  // _meta 除外し、許可フィールドのみで append
  const cleaned = subset.map(pickAllowed);

  const before = terms.length;
  if (!dryRun) {
    terms = terms.concat(cleaned);
    // existing terms.json は末尾改行なし運用なので合わせる
    const text = JSON.stringify(terms, null, 2);
    writeFileSync(TERMS_JSON, text, 'utf8');
  }
  const after = dryRun ? before + cleaned.length : terms.length;

  summary.push({
    batch: batchId,
    added: cleaned.length,
    before,
    after,
    ids: cleaned.map(c => c.id),
  });
}

console.log(`=== apply-step8j-2c-batches ${dryRun ? '(DRY RUN)' : ''} ===`);
console.log('start terms count:', startCount);
for (const s of summary) {
  console.log(`  ${s.batch}: ${s.before} -> ${s.after} (+${s.added}) ids=[${s.ids.join(',')}]`);
}
const totalAdded = summary.reduce((a,b) => a + b.added, 0);
console.log('total added:', totalAdded);
console.log('end terms count:', dryRun ? startCount + totalAdded : terms.length);
if (dryRun) console.log('(dry run — no file written)');
