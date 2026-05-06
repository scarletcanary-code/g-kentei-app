#!/usr/bin/env node
// Step8j-2d: V22 既存孤立参照のうち merge_with_existing と確定した 6 種 7 件を置換する
// usage:
//   node scripts/apply-step8j-2d-merge.mjs --dry-run
//   node scripts/apply-step8j-2d-merge.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const TERMS_JSON = resolve(projectRoot, 'src/data/glossary/terms.json');
const QUESTIONS_DIR = resolve(projectRoot, 'src/data/questions');
const CHAPTERS = ['ch1','ch2','ch3','ch4','ch5','ch6','ch7','ch8'];

const dryRun = process.argv.includes('--dry-run');

// orphan_id -> target_term_id
const MERGE_MAP = {
  'clip': 'clip_model',
  'machine_learning': 'machine_learning_definition',
  'qlora': 'lora',
  'large_language_model': 'llm',
  'optimization': 'optimization_algorithm',
  'data_cleansing': 'data_augmentation_ops',
};

// target_term_id -> aliases に追加する語
const ALIASES_ADD = {
  'machine_learning_definition': ['機械学習', 'Machine Learning'],
  'lora': ['QLoRA', 'Quantized LoRA'],
  // clip_model は既に aliases 設定済み
  // llm / optimization_algorithm / data_augmentation_ops は GPT 提案なし
};

// ---- 1. terms.json: aliases 追加 ----
let terms = JSON.parse(readFileSync(TERMS_JSON, 'utf8'));
const termsIdSet = new Set(terms.map(t => t.id));

// merge 整合性チェック
const issues = [];
for (const [src, tgt] of Object.entries(MERGE_MAP)) {
  if (termsIdSet.has(src)) issues.push(`source id "${src}" がまだ terms.json に存在する（merge 不要のはず）`);
  if (!termsIdSet.has(tgt)) issues.push(`target id "${tgt}" が terms.json に不在（先に追加が必要）`);
}
if (issues.length > 0) {
  console.error('=== STOP: pre-check failed ===');
  for (const x of issues) console.error('  - ' + x);
  process.exit(1);
}

const aliasReport = [];
for (const [tgtId, addList] of Object.entries(ALIASES_ADD)) {
  const term = terms.find(t => t.id === tgtId);
  const before = term.aliases ? [...term.aliases] : [];
  const merged = [...before];
  const added = [];
  for (const a of addList) {
    if (!merged.includes(a)) { merged.push(a); added.push(a); }
  }
  if (added.length > 0) {
    term.aliases = merged;
    aliasReport.push({ id: tgtId, before, after: merged, added });
  }
}

// ---- 2. questions: relatedTermIds 置換 ----
const fileSummaries = [];
let totalReplaced = 0;
for (const ch of CHAPTERS) {
  const file = `${ch}.json`;
  const path = resolve(QUESTIONS_DIR, file);
  const arr = JSON.parse(readFileSync(path, 'utf8'));
  const replacements = [];
  let touched = 0;
  for (const q of arr) {
    if (!Array.isArray(q.relatedTermIds)) continue;
    let changed = false;
    const seen = new Set();
    const next = [];
    for (const r of q.relatedTermIds) {
      const mapped = MERGE_MAP[r] ?? r;
      if (mapped !== r) {
        replacements.push({ qid: q.id, from: r, to: mapped });
        changed = true;
      }
      if (!seen.has(mapped)) { seen.add(mapped); next.push(mapped); }
    }
    if (changed) { q.relatedTermIds = next; touched++; }
  }
  if (replacements.length > 0) {
    fileSummaries.push({ file, replacements: replacements.length, questions_touched: touched });
    totalReplaced += replacements.length;
    if (!dryRun) {
      // questions/ch*.json は末尾改行ありの体裁
      const text = JSON.stringify(arr, null, 2) + '\n';
      writeFileSync(path, text, 'utf8');
    }
    console.log(`  ${file}: ${replacements.length} replacements across ${touched} questions`);
    for (const r of replacements) console.log(`    ${r.qid}: ${r.from} -> ${r.to}`);
  }
}

// ---- 3. terms.json 書き戻し（aliases 変更分）----
if (aliasReport.length > 0 && !dryRun) {
  // terms.json は末尾改行なしの体裁
  const text = JSON.stringify(terms, null, 2);
  writeFileSync(TERMS_JSON, text, 'utf8');
}

// ---- 4. summary ----
console.log(`\n=== apply-step8j-2d-merge ${dryRun ? '(DRY RUN)' : ''} ===`);
console.log('total relatedTermIds replacements:', totalReplaced);
console.log('files touched:', fileSummaries.length);
console.log('aliases additions:');
for (const r of aliasReport) {
  console.log(`  ${r.id}: +[${r.added.join(',')}]  (final aliases: [${r.after.join(',')}])`);
}
if (dryRun) console.log('(dry run — no file written)');
