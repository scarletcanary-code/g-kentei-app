/**
 * validate-step2.mjs
 * Step2 完了条件 5 種を機械的に検証して audit-step2-validation.md を出力する。
 *
 * 使い方:
 *   node scripts/validate-step2.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const repoRoot = join(projectRoot, '..');

const csvPath = join(repoRoot, '.harness/exports/questions-2026-05-02-step2.csv');
const validationPath = join(repoRoot, '.harness/runs/0064/audit-step2-validation.md');

mkdirSync(join(repoRoot, '.harness/runs/0064'), { recursive: true });

// ---- CSV parser ----
function splitLines(text) {
  const lines = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuote && text[i + 1] === '"') { cur += '"'; i++; }
      else { inQuote = !inQuote; cur += ch; }
    } else if ((ch === '\r' || ch === '\n') && !inQuote) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      lines.push(cur); cur = '';
    } else cur += ch;
  }
  if (cur.length > 0) lines.push(cur);
  return lines;
}

function splitRow(line) {
  const fields = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) { fields.push(cur); cur = ''; }
    else cur += ch;
  }
  fields.push(cur);
  return fields;
}

function parseCsv(text) {
  const raw = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
  const lines = splitLines(raw).filter(l => l.trim() !== '');
  return lines.map(splitRow);
}

const rawText = readFileSync(csvPath, 'utf8');
const allRows = parseCsv(rawText);
const headers = allRows[0];
const dataRows = allRows.slice(1).filter(r => r.some(c => c.trim() !== ''));

const colIdx = {};
for (let i = 0; i < headers.length; i++) colIdx[headers[i]] = i;

const SEPARATOR = ' || ';

const results = [];

// ---- Check 1: correctIndex 指定 choice と 正答テキスト の不一致 ----
const mismatch1 = [];
for (const row of dataRows) {
  const id = row[colIdx['id']];
  const ci = parseInt(row[colIdx['correctIndex']]);
  const seikai = row[colIdx['正答テキスト']] || '';
  const correctChoice = row[colIdx['choice' + ci]] || '';
  if (seikai !== correctChoice) {
    mismatch1.push({ id, ci, seikai: seikai.slice(0, 80), correctChoice: correctChoice.slice(0, 80) });
  }
}
results.push({
  check: '1. correctIndex 指定 choice と 正答テキスト の不一致',
  pass: mismatch1.length === 0,
  count: mismatch1.length,
  details: mismatch1,
});

// ---- Check 2: optionRationales が 4 件でない ----
const mismatch2 = [];
for (const row of dataRows) {
  const id = row[colIdx['id']];
  const or = row[colIdx['optionRationales']] || '';
  const blocks = or.split(SEPARATOR);
  if (blocks.length !== 4) {
    mismatch2.push({ id, count: blocks.length });
  }
}
results.push({
  check: '2. optionRationales 4 件でない',
  pass: mismatch2.length === 0,
  count: mismatch2.length,
  details: mismatch2,
});

// ---- Check 3: 正答位置 rationale が「正解。」で始まらない ----
const mismatch3 = [];
for (const row of dataRows) {
  const id = row[colIdx['id']];
  const ci = parseInt(row[colIdx['correctIndex']]);
  const or = row[colIdx['optionRationales']] || '';
  const blocks = or.split(SEPARATOR);
  if (blocks.length === 4 && !blocks[ci].startsWith('正解。')) {
    mismatch3.push({ id, ci, actual: blocks[ci].slice(0, 60) });
  }
}
results.push({
  check: '3. 正答位置 rationale が「正解。」で始まらない',
  pass: mismatch3.length === 0,
  count: mismatch3.length,
  details: mismatch3,
});

// ---- Check 4: 誤答位置 rationale が「誤り。」で始まらない ----
const mismatch4 = [];
for (const row of dataRows) {
  const id = row[colIdx['id']];
  const ci = parseInt(row[colIdx['correctIndex']]);
  const or = row[colIdx['optionRationales']] || '';
  const blocks = or.split(SEPARATOR);
  if (blocks.length === 4) {
    for (let i = 0; i < 4; i++) {
      if (i !== ci && !blocks[i].startsWith('誤り。')) {
        mismatch4.push({ id, pos: i, actual: blocks[i].slice(0, 60) });
      }
    }
  }
}
results.push({
  check: '4. 誤答位置 rationale が「誤り。」で始まらない',
  pass: mismatch4.length === 0,
  count: mismatch4.length,
  details: mismatch4,
});

// ---- Check 5: misconceptionTarget 空欄 ----
const mismatch5 = [];
for (const row of dataRows) {
  const id = row[colIdx['id']];
  const mt = row[colIdx['misconceptionTarget']] || '';
  if (!mt || mt.trim() === '') {
    mismatch5.push({ id });
  }
}
results.push({
  check: '5. misconceptionTarget 空欄',
  pass: mismatch5.length === 0,
  count: mismatch5.length,
  details: mismatch5,
});

// ---- Write validation.md ----
const allPass = results.every(r => r.pass);
let md = `# audit-step2-validation\n\n`;
md += `生成日: 2026-05-02\n`;
md += `対象ファイル: questions-2026-05-02-step2.csv\n`;
md += `データ行数: ${dataRows.length}\n\n`;
md += `## 完了条件検証結果\n\n`;
md += `| # | 条件 | 違反件数 | 判定 |\n`;
md += `|---|---|---|---|\n`;
for (const r of results) {
  md += `| - | ${r.check} | ${r.count} | ${r.pass ? 'PASS' : 'FAIL'} |\n`;
}
md += `\n## 総合判定: ${allPass ? 'PASS' : 'FAIL'}\n\n`;

if (!allPass) {
  md += `## 違反詳細\n\n`;
  for (const r of results) {
    if (!r.pass && r.details.length > 0) {
      md += `### ${r.check}\n\n`;
      for (const d of r.details) {
        md += `- ${JSON.stringify(d)}\n`;
      }
      md += '\n';
    }
  }
}

writeFileSync(validationPath, md, 'utf8');

// ---- Console ----
console.log('=== Step2 Validation ===');
console.log('Data rows:', dataRows.length);
for (const r of results) {
  console.log(`  Check ${r.check}: ${r.pass ? 'PASS' : 'FAIL'} (violations: ${r.count})`);
  if (!r.pass && r.details.length > 0) {
    for (const d of r.details.slice(0, 5)) {
      console.log('    ', JSON.stringify(d));
    }
  }
}
console.log('Overall:', allPass ? 'PASS' : 'FAIL');
console.log('Validation report:', validationPath);
process.exit(allPass ? 0 : 1);
