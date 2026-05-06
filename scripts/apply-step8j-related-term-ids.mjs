#!/usr/bin/env node
// Step8j-1: relatedTermIds に Step8 新語を append する
// 入力: ../.harness/step8j/step8j-related-term-additions.csv（build-additions.mjs が生成）
// 動作: src/data/questions/ch{1..8}.json を mutate（順序保持・末尾改行・2-space indent）
// オプション: --dry-run で diff サマリのみ表示しファイルは書かない

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const repoRoot = resolve(projectRoot, '..');

const CSV = resolve(repoRoot, '.harness/step8j/step8j-related-term-additions.csv');
const QUESTIONS_DIR = resolve(projectRoot, 'src/data/questions');
const CHAPTERS = ['ch1','ch2','ch3','ch4','ch5','ch6','ch7','ch8'];

const dryRun = process.argv.includes('--dry-run');

// CSV パース（addition 列が単一の term_id であるシンプルな形式。クォートにも一応対応）
function parseCsv(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter(Boolean);
  const header = splitCsvLine(lines[0]);
  return lines.slice(1).map(line => {
    const cols = splitCsvLine(line);
    const r = {};
    header.forEach((h, i) => { r[h] = cols[i]; });
    return r;
  });
}
function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i+1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQ = false; }
      else { cur += c; }
    } else {
      if (c === ',') { out.push(cur); cur = ''; }
      else if (c === '"') { inQ = true; }
      else { cur += c; }
    }
  }
  out.push(cur);
  return out;
}

const csvText = readFileSync(CSV, 'utf8');
const rows = parseCsv(csvText);

// file -> question_id -> addition[]
const grouped = {};
for (const r of rows) {
  const f = r.file;
  const q = r.question_id;
  if (!grouped[f]) grouped[f] = {};
  if (!grouped[f][q]) grouped[f][q] = [];
  grouped[f][q].push(r.addition);
}

let totalAdded = 0;
let totalSkipped = 0;
const summary = [];

for (const ch of CHAPTERS) {
  const file = `${ch}.json`;
  const path = resolve(QUESTIONS_DIR, file);
  const before = readFileSync(path, 'utf8');
  const arr = JSON.parse(before);
  const adds = grouped[file] ?? {};
  const fileSummary = { file, questionsTouched: 0, added: 0 };

  for (const q of arr) {
    const qAdds = adds[q.id];
    if (!qAdds || qAdds.length === 0) continue;
    const cur = Array.isArray(q.relatedTermIds) ? [...q.relatedTermIds] : [];
    const seen = new Set(cur);
    let addedThisQ = 0;
    for (const id of qAdds) {
      if (seen.has(id)) { totalSkipped++; continue; }
      cur.push(id);
      seen.add(id);
      addedThisQ++;
    }
    if (addedThisQ > 0) {
      q.relatedTermIds = cur;
      fileSummary.questionsTouched++;
      fileSummary.added += addedThisQ;
      totalAdded += addedThisQ;
    }
  }

  if (fileSummary.added > 0) {
    const after = JSON.stringify(arr, null, 2) + '\n';
    if (!dryRun) {
      writeFileSync(path, after, 'utf8');
    }
    summary.push(fileSummary);
  }
}

console.log(`=== Step8j-1 apply ${dryRun ? '(DRY RUN)' : ''} ===`);
for (const s of summary) {
  console.log(`  ${s.file}: ${s.added} additions across ${s.questionsTouched} questions`);
}
console.log(`total additions: ${totalAdded}`);
console.log(`skipped (already present): ${totalSkipped}`);
if (dryRun) console.log('(dry run — no files written)');
