/**
 * generate-step2.mjs
 * Step2 修正CSV生成スクリプト
 * 入力: ../.harness/exports/questions-2026-05-02-step1b.csv
 * 出力: ../.harness/exports/questions-2026-05-02-step2.csv
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const repoRoot = join(projectRoot, '..');

const csvPath = join(repoRoot, '.harness/exports/questions-2026-05-02-step1b.csv');
const outCsvPath = join(repoRoot, '.harness/exports/questions-2026-05-02-step2.csv');
const auditPath = join(repoRoot, '.harness/runs/0064/audit-step2-rationale-alignment.md');
const reviewNeededPath = join(repoRoot, '.harness/runs/0064/audit-step2-review-needed.csv');

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

function escapeField(v) {
  if (v.includes(',') || v.includes('"') || v.includes('\n') || v.includes('\r')) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}

// ---- Load CSV ----
const rawText = readFileSync(csvPath, 'utf8');
const allRows = parseCsv(rawText);
const headers = allRows[0];
const dataRows = allRows.slice(1).filter(r => r.some(c => c.trim() !== ''));

const colIdx = {};
for (let i = 0; i < headers.length; i++) colIdx[headers[i]] = i;

const SEPARATOR = ' || ';

// ---- Modification map ----
const modifications = {};
const changes = [];
const reviewNeeded = [];

function getRow(id) {
  return dataRows.find(r => r[colIdx['id']] === id);
}

function modifyRationale(id, blockFixes) {
  const row = getRow(id);
  if (!row) return;
  const or = row[colIdx['optionRationales']];
  const blocks = or.split(SEPARATOR);

  for (const [idx, newPrefix] of blockFixes) {
    let content = blocks[idx];
    if (content.startsWith('正解。')) content = content.slice(3);
    else if (content.startsWith('誤り。')) content = content.slice(3);
    blocks[idx] = newPrefix + content;
  }

  const before = or;
  const after = blocks.join(SEPARATOR);
  if (!modifications[id]) modifications[id] = {};
  modifications[id].optionRationales = after;
  changes.push({ id, column: 'optionRationales', before, after });
}

function setMisconceptionTarget(id, value) {
  const row = getRow(id);
  if (!row) return;
  const before = row[colIdx['misconceptionTarget']] || '';
  if (!modifications[id]) modifications[id] = {};
  modifications[id].misconceptionTarget = value;
  changes.push({ id, column: 'misconceptionTarget', before, after: value });
}

// ---- ch1-004 (correctIndex=1): block[0] has 正解。label, block[1] has 誤り。label ----
modifyRationale('ch1-004', [
  [0, '誤り。'],
  [1, '正解。'],
]);

// ---- ch1-012 (correctIndex=1): block[1] missing 正解。prefix ----
modifyRationale('ch1-012', [
  [1, '正解。'],
]);

// ---- ch1-022 (correctIndex=3): block[3] missing 正解。prefix ----
modifyRationale('ch1-022', [
  [3, '正解。'],
]);

// ---- ch1-035 (correctIndex=3): block[0] has 正解。, block[3] has 誤り。 ----
modifyRationale('ch1-035', [
  [0, '誤り。'],
  [3, '正解。'],
]);

// ---- ch2-010 (correctIndex=1): block[0] has 正解。, block[1] has 誤り。 ----
modifyRationale('ch2-010', [
  [0, '誤り。'],
  [1, '正解。'],
]);

// ---- ch2-028 (correctIndex=3): block[3] has 誤り。instead of 正解。 ----
modifyRationale('ch2-028', [
  [3, '正解。'],
]);

// ---- ch3-036 (correctIndex=3): block[3] has 誤り。instead of 正解。 ----
modifyRationale('ch3-036', [
  [3, '正解。'],
]);

// ---- ch4-022 (correctIndex=2): block[1] has 正解。label (choice2 matches seikai, ci=2 correct) ----
modifyRationale('ch4-022', [
  [1, '誤り。'],
]);

// ---- ch4-032 (correctIndex=3): block[1] has 正解。label (choice3 matches seikai, ci=3 correct) ----
modifyRationale('ch4-032', [
  [1, '誤り。'],
]);

// ---- ch4-033 (correctIndex=3): block[2] has 正解。label (choice3 matches seikai, ci=3 correct) ----
modifyRationale('ch4-033', [
  [2, '誤り。'],
]);

// ---- ch5-002 (correctIndex=1): block[0] has 正解。, block[1] has 誤り。 ----
modifyRationale('ch5-002', [
  [0, '誤り。'],
  [1, '正解。'],
]);

// ---- ch5-028 (correctIndex=2): block[2] has 誤り。instead of 正解。 ----
modifyRationale('ch5-028', [
  [2, '正解。'],
]);

// ---- ch6-035 (correctIndex=3): block[3] has 誤り。instead of 正解。 ----
modifyRationale('ch6-035', [
  [3, '正解。'],
]);

// ---- ch8-028 (correctIndex=3): block[0] has 正解。, block[3] has 誤り。 ----
modifyRationale('ch8-028', [
  [0, '誤り。'],
  [3, '正解。'],
]);

// ---- misconceptionTarget 補完 ----
setMisconceptionTarget('ch1-019', 'チューリングテストをジョン・マッカーシーやジョン・フォン・ノイマンが提唱したと混同しやすい。');
setMisconceptionTarget('ch1-023', 'ジョン・サールとアラン・チューリングを混同し、中国語の部屋とチューリングテストを同じ人物の考案と誤解しやすい。');
setMisconceptionTarget('ch1-030', '「シンギュラリティは近い」をニック・ボストロムの「スーパーインテリジェンス」と混同しやすい。');
setMisconceptionTarget('ch2-010', 'AIという言葉の提唱者をマービン・ミンスキーやアラン・チューリングと混同しやすい。');

// ---- review-needed ----
reviewNeeded.push({
  id: 'ch4-022',
  column: 'optionRationales',
  reason: 'block[1]に「正解。」ラベルが付いていた（修正済み→「誤り。」）。choice2がseikaiと完全一致のためcorrectIndex=2は正しいと判断。rationale内容の妥当性は要確認。',
  suggested_action: 'choice1「重みの初期化が不適切な場合に勾配爆発が起こる」は正しい記述のため、block[1]の説明文の内容も人間が確認することを推奨。',
});
reviewNeeded.push({
  id: 'ch4-032',
  column: 'optionRationales',
  reason: 'block[1]に「正解。」ラベルが付いていた（修正済み→「誤り。」）。choice3がseikaiと完全一致のためcorrectIndex=3は正しいと判断。rationale内容の妥当性は要確認。',
  suggested_action: 'choice1「ReLU関数は負の値を持つ入力に対しても勾配が存在し学習が進みやすい」は誤解を招く記述。説明文内容の修正を検討。',
});
reviewNeeded.push({
  id: 'ch4-033',
  column: 'optionRationales',
  reason: 'block[2]に「正解。」ラベルが付いていた（修正済み→「誤り。」）。choice3がseikaiと完全一致のためcorrectIndex=3は正しいと判断。rationale内容の妥当性は要確認。',
  suggested_action: 'choice2「情報理論におけるエントロピーはデータの不確実性を測る指標」は正しい記述だが交差エントロピー誤差の特徴としては不完全。説明文内容の修正を検討。',
});

// ---- Generate modified CSV ----
const outputRows = [headers];
for (const row of dataRows) {
  const id = row[colIdx['id']];
  if (modifications[id]) {
    const newRow = [...row];
    for (const [col, val] of Object.entries(modifications[id])) {
      newRow[colIdx[col]] = val;
    }
    outputRows.push(newRow);
  } else {
    outputRows.push(row);
  }
}

const csvLines = outputRows.map(row => row.map(escapeField).join(','));
const csvContent = '﻿' + csvLines.join('\r\n') + '\r\n';
writeFileSync(outCsvPath, csvContent, 'utf8');

// ---- Write review-needed.csv ----
const rnLines = ['id,column,reason,suggested_action'];
for (const r of reviewNeeded) {
  rnLines.push([r.id, r.column, r.reason, r.suggested_action].map(escapeField).join(','));
}
writeFileSync(reviewNeededPath, rnLines.join('\r\n') + '\r\n', 'utf8');

// ---- Chapter breakdown for audit ----
const chapterMap = {};
for (const c of changes) {
  const chapter = c.id.split('-')[0];
  if (!chapterMap[chapter]) chapterMap[chapter] = { optionRationales: 0, misconceptionTarget: 0 };
  chapterMap[chapter][c.column] = (chapterMap[chapter][c.column] || 0) + 1;
}

// ---- Write audit-step2-rationale-alignment.md ----
const orChanges = changes.filter(c => c.column === 'optionRationales');
const mtChanges = changes.filter(c => c.column === 'misconceptionTarget');

let md = `# audit-step2-rationale-alignment\n\n`;
md += `生成日: 2026-05-02\n\n`;
md += `## 修正件数\n\n`;
md += `- 合計: ${changes.length} 件\n`;
md += `- optionRationales: ${orChanges.length} 件\n`;
md += `- misconceptionTarget 補完: ${mtChanges.length} 件\n\n`;
md += `## 章別修正件数\n\n`;
md += `| 章 | optionRationales | misconceptionTarget |\n`;
md += `|---|---|---|\n`;
for (const [ch, counts] of Object.entries(chapterMap).sort()) {
  md += `| ${ch} | ${counts.optionRationales || 0} | ${counts.misconceptionTarget || 0} |\n`;
}
md += `\n`;
md += `## optionRationales 修正詳細（before / after）\n\n`;
for (const c of orChanges) {
  md += `### ${c.id}\n\n`;
  md += `**before:**\n\`\`\`\n${c.before}\n\`\`\`\n\n`;
  md += `**after:**\n\`\`\`\n${c.after}\n\`\`\`\n\n`;
}
md += `## misconceptionTarget 補完詳細（before / after）\n\n`;
for (const c of mtChanges) {
  md += `### ${c.id}\n\n`;
  md += `- before: \`${c.before || '(空欄)'}\`\n`;
  md += `- after: \`${c.after}\`\n\n`;
}
writeFileSync(auditPath, md, 'utf8');

// ---- Console summary ----
console.log('=== Step2 Generation Complete ===');
console.log('Total changes:', changes.length);
console.log('  - optionRationales:', orChanges.length, 'rows');
console.log('  - misconceptionTarget:', mtChanges.length, 'rows');
console.log('review-needed entries:', reviewNeeded.length);
console.log('Output CSV:', outCsvPath);
