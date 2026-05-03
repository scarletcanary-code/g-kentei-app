/**
 * apply-step5c-parallel-patches.mjs
 *
 * Step5c Coordinator: 4 つの Worker JSON パッチを統合して
 * questions-2026-05-02-step5b2.csv に一括適用し
 * questions-2026-05-02-step5c.csv を出力する。
 *
 * Usage:
 *   node scripts/apply-step5c-parallel-patches.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const repoRoot = join(projectRoot, '..');

const inputCsvPath = join(repoRoot, '.harness/exports/questions-2026-05-02-step5b2.csv');
const outputCsvPath = join(repoRoot, '.harness/exports/questions-2026-05-02-step5c.csv');
const stepDir = join(repoRoot, '.harness/step5c');
const runsDir = join(repoRoot, '.harness/runs/0079');
mkdirSync(runsDir, { recursive: true });

const TARGET_IDS = [
  'ch1-012', 'ch2-002', 'ch2-004', 'ch2-016',
  'ch3-020', 'ch3-027', 'ch3-039', 'ch4-007',
  'ch4-020', 'ch5-012', 'ch5-018', 'ch5-044',
  'ch6-003', 'ch6-007', 'ch6-027', 'ch8-014',
];
const TARGET_ID_SET = new Set(TARGET_IDS);

const ALLOWED_COLUMNS = new Set([
  'choice0', 'choice1', 'choice2', 'choice3',
  '正答テキスト', 'explanation', 'optionRationales',
]);

const STEP3_CORRECT_INDEX = {
  'ch5-002': 1, 'ch6-015': 0, 'ch4-018': 0, 'ch5-040': 3,
  'ch1-030': 3, 'ch1-010': 2, 'ch1-027': 3, 'ch3-024': 2,
  'ch7-003': 1, 'ch8-003': 1, 'ch8-019': 2,
};

const EXPECTED_HEADERS = [
  'id', '章', 'question',
  'choice0', 'choice1', 'choice2', 'choice3',
  'correctIndex', '正答テキスト',
  'explanation',
  'difficulty', 'tags',
  'source_ref',
  'learningObjective', 'cognitiveLevel', 'misconceptionTarget',
  'optionRationales',
];

// ─── RFC 4180 CSV パーサ ────────────────────────────────────────────────────
function parseCsv(text) {
  const rows = [];
  let pos = 0;
  const len = text.length;
  while (pos < len) {
    const row = [];
    while (true) {
      if (pos >= len) { row.push(''); break; }
      if (text[pos] === '"') {
        pos++;
        let field = '';
        while (true) {
          if (pos >= len) throw new Error(`Unterminated quoted field at ${pos}`);
          if (text[pos] === '"') {
            if (pos + 1 < len && text[pos + 1] === '"') { field += '"'; pos += 2; }
            else { pos++; break; }
          } else { field += text[pos]; pos++; }
        }
        row.push(field);
        if (pos < len && text[pos] === ',') pos++;
        else break;
      } else {
        let field = '';
        while (pos < len && text[pos] !== ',' && text[pos] !== '\r' && text[pos] !== '\n') {
          field += text[pos]; pos++;
        }
        row.push(field);
        if (pos < len && text[pos] === ',') pos++;
        else break;
      }
    }
    rows.push(row);
    if (pos < len && text[pos] === '\r') pos++;
    if (pos < len && text[pos] === '\n') pos++;
  }
  return rows;
}

// ─── CSV エスケープ ────────────────────────────────────────────────────
function escapeCsv(v) {
  if (v === undefined || v === null) return '';
  const s = String(v);
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function rowsToCsv(rows) {
  return '﻿' + rows.map((r) => r.map(escapeCsv).join(',')).join('\r\n') + '\r\n';
}

// ─── Unicode 文字数（コードポイント単位） ─────────────────────────────────
function uniLen(s) {
  return [...String(s)].length;
}

function calcRatio(lens) {
  const max = Math.max(...lens);
  const min = Math.min(...lens);
  return min > 0 ? max / min : 0;
}

// ─── メイン ─────────────────────────────────────────────────────────────────

console.log(`[step5c] input: ${inputCsvPath}`);
console.log(`[step5c] output: ${outputCsvPath}`);

// CSV 読み込み
let rawText = readFileSync(inputCsvPath, 'utf8');
const hadBOM = rawText.startsWith('﻿');
if (hadBOM) rawText = rawText.slice(1);

const allRows = parseCsv(rawText);
while (allRows.length > 0 && allRows[allRows.length - 1].every((c) => c === '')) allRows.pop();

const headerRow = allRows[0];
if (headerRow.length !== EXPECTED_HEADERS.length) {
  console.error(`[ERROR] Header column count mismatch: ${headerRow.length} vs ${EXPECTED_HEADERS.length}`);
  process.exit(1);
}
for (let i = 0; i < EXPECTED_HEADERS.length; i++) {
  if (headerRow[i] !== EXPECTED_HEADERS[i]) {
    console.error(`[ERROR] Header column[${i}]: expected "${EXPECTED_HEADERS[i]}", got "${headerRow[i]}"`);
    process.exit(1);
  }
}

const dataRows = allRows.slice(1);
if (dataRows.length !== 292) {
  console.error(`[ERROR] Expected 292 data rows, got ${dataRows.length}`);
  process.exit(1);
}
console.log(`[step5c] CSV parsed: ${dataRows.length} rows`);

// 行マップ作成（id => row index）
const idIdx = EXPECTED_HEADERS.indexOf('id');
const ciIdx = EXPECTED_HEADERS.indexOf('correctIndex');
const colIdx = {};
for (const c of EXPECTED_HEADERS) colIdx[c] = EXPECTED_HEADERS.indexOf(c);

const rowByIdMap = new Map();
for (let i = 0; i < dataRows.length; i++) {
  const id = dataRows[i][idIdx];
  if (rowByIdMap.has(id)) {
    console.error(`[ERROR] Duplicate id: ${id}`);
    process.exit(1);
  }
  rowByIdMap.set(id, i);
}

// 修正前の choice 文字数 / ratio を記録
function snapshotLens(rowIdx) {
  const r = dataRows[rowIdx];
  const lens = [
    uniLen(r[colIdx.choice0]),
    uniLen(r[colIdx.choice1]),
    uniLen(r[colIdx.choice2]),
    uniLen(r[colIdx.choice3]),
  ];
  const correctIndex = parseInt(r[ciIdx], 10);
  return { lens, ratio: calcRatio(lens), correctIndex };
}

const beforeStats = {};
for (const id of TARGET_IDS) {
  const idx = rowByIdMap.get(id);
  if (idx === undefined) {
    console.error(`[ERROR] Target id not found in CSV: ${id}`);
    process.exit(1);
  }
  beforeStats[id] = snapshotLens(idx);
}

// 4 Worker JSON 読み込み
const workers = ['A', 'B', 'C', 'D'];
const allPatches = [];
const workerStats = {};

for (const w of workers) {
  const p = join(stepDir, `patch_worker_${w}.json`);
  const arr = JSON.parse(readFileSync(p, 'utf8'));
  if (!Array.isArray(arr)) {
    console.error(`[ERROR] worker ${w} JSON not an array`);
    process.exit(1);
  }
  workerStats[w] = arr.length;
  for (const pa of arr) {
    pa._worker = w;
    allPatches.push(pa);
  }
}

console.log(`[step5c] worker patches: A=${workerStats.A} B=${workerStats.B} C=${workerStats.C} D=${workerStats.D} total=${allPatches.length}`);

// 検証 1: 対象 ID 内のみ
const offTargetPatches = allPatches.filter((p) => !TARGET_ID_SET.has(p.id));
if (offTargetPatches.length > 0) {
  console.error(`[ERROR] Off-target patches: ${offTargetPatches.map((p) => `${p._worker}:${p.id}`).join(', ')}`);
  process.exit(1);
}
console.log(`[step5c] off-target check: OK`);

// 検証 2: column 許容
const badColumnPatches = allPatches.filter((p) => !ALLOWED_COLUMNS.has(p.column));
if (badColumnPatches.length > 0) {
  console.error(`[ERROR] Bad column patches: ${badColumnPatches.map((p) => `${p._worker}:${p.id}/${p.column}`).join(', ')}`);
  process.exit(1);
}

// 検証 3: 同一 id+column の重複
const seenKeys = new Map();
for (const p of allPatches) {
  const k = `${p.id}|${p.column}`;
  if (seenKeys.has(k)) {
    console.error(`[ERROR] Duplicate patch for ${k}: workers ${seenKeys.get(k)} and ${p._worker}`);
    process.exit(1);
  }
  seenKeys.set(k, p._worker);
}
console.log(`[step5c] duplicate check: OK`);

// 検証 4: before 一致
const beforeMismatches = [];
for (const p of allPatches) {
  const rowIdx = rowByIdMap.get(p.id);
  const cell = dataRows[rowIdx][colIdx[p.column]];
  if (cell !== p.before) {
    beforeMismatches.push({ id: p.id, column: p.column, worker: p._worker, csvLen: cell.length, patchBeforeLen: p.before.length });
  }
}
if (beforeMismatches.length > 0) {
  console.error(`[ERROR] before mismatch (${beforeMismatches.length} entries):`);
  for (const m of beforeMismatches) {
    console.error(`  ${m.worker}:${m.id}/${m.column} csvLen=${m.csvLen} patchBeforeLen=${m.patchBeforeLen}`);
  }
  process.exit(1);
}
console.log(`[step5c] before-match check: OK (all ${allPatches.length} patches match)`);

// patch 適用
const diffEntries = [];
for (const p of allPatches) {
  const rowIdx = rowByIdMap.get(p.id);
  const c = colIdx[p.column];
  diffEntries.push({ id: p.id, column: p.column, before: p.before, after: p.after });
  dataRows[rowIdx][c] = p.after;
}
console.log(`[step5c] applied: ${allPatches.length} patches`);

// 構造チェック
const validations = [];
function check(label, ok, detail) {
  validations.push({ label, ok, detail: detail || '' });
}

// 1. 問題数
check('1. 問題数 = 292', dataRows.length === 292, `actual=${dataRows.length}`);

// 2. ID 重複
const idSet = new Set();
let idDup = 0;
for (const r of dataRows) {
  const id = r[idIdx];
  if (idSet.has(id)) idDup++;
  idSet.add(id);
}
check('2. ID 重複 = 0', idDup === 0, `dup=${idDup}`);

// 3. correctIndex 範囲外
let ciOOB = 0;
for (const r of dataRows) {
  const ci = parseInt(r[ciIdx], 10);
  if (!(ci >= 0 && ci <= 3)) ciOOB++;
}
check('3. correctIndex 範囲外 = 0', ciOOB === 0, `oob=${ciOOB}`);

// 4. correctIndex 指定 choice == 正答テキスト
let ciTextMismatch = 0;
const ciTextMismatchIds = [];
for (const r of dataRows) {
  const ci = parseInt(r[ciIdx], 10);
  const choice = r[colIdx[`choice${ci}`]];
  const truth = r[colIdx['正答テキスト']];
  if (choice !== truth) {
    ciTextMismatch++;
    ciTextMismatchIds.push(r[idIdx]);
  }
}
check('4. correctIndex choice == 正答テキスト', ciTextMismatch === 0, `mismatch=${ciTextMismatch} ids=${ciTextMismatchIds.slice(0, 5).join(',')}`);

// 5. optionRationales が 4 件
let orBad = 0;
const orBadIds = [];
for (const r of dataRows) {
  const or = r[colIdx['optionRationales']];
  const blocks = String(or).split(' || ');
  if (blocks.length !== 4) {
    orBad++;
    orBadIds.push(r[idIdx]);
  }
}
check('5. optionRationales split(" || ") 長さ 4', orBad === 0, `bad=${orBad} ids=${orBadIds.slice(0, 5).join(',')}`);

// 6. 正答 rationale が「正解。」始まり
let correctLabelBad = 0;
const correctLabelBadIds = [];
for (const r of dataRows) {
  const ci = parseInt(r[ciIdx], 10);
  const blocks = String(r[colIdx['optionRationales']]).split(' || ');
  if (blocks.length === 4) {
    const t = blocks[ci].trim();
    if (!t.startsWith('正解。')) {
      correctLabelBad++;
      correctLabelBadIds.push(r[idIdx]);
    }
  }
}
check('6. 正答 rationale が「正解。」始まり', correctLabelBad === 0, `bad=${correctLabelBad} ids=${correctLabelBadIds.slice(0, 5).join(',')}`);

// 7. 誤答 rationale が「誤り。」始まり
let wrongLabelBad = 0;
const wrongLabelBadIds = [];
for (const r of dataRows) {
  const ci = parseInt(r[ciIdx], 10);
  const blocks = String(r[colIdx['optionRationales']]).split(' || ');
  if (blocks.length === 4) {
    for (let i = 0; i < 4; i++) {
      if (i === ci) continue;
      const t = blocks[i].trim();
      if (!t.startsWith('誤り。')) {
        wrongLabelBad++;
        wrongLabelBadIds.push(`${r[idIdx]}#${i}`);
      }
    }
  }
}
check('7. 誤答 rationale が「誤り。」始まり', wrongLabelBad === 0, `bad=${wrongLabelBad} entries=${wrongLabelBadIds.slice(0, 5).join(',')}`);

// 8. 空欄チェック（必須カラム）
const REQUIRED_NONEMPTY = ['id', 'question', 'choice0', 'choice1', 'choice2', 'choice3', '正答テキスト', 'explanation', 'optionRationales'];
let emptyBad = 0;
for (const r of dataRows) {
  for (const col of REQUIRED_NONEMPTY) {
    if (!r[colIdx[col]] || r[colIdx[col]].trim() === '') {
      emptyBad++;
    }
  }
}
check('8. 必須カラム空欄 = 0', emptyBad === 0, `empty=${emptyBad}`);

// 9. 変更 ID は対象 16 ID 内 (実装上 patch 段階でガード済みだが再確認)
const changedIds = new Set(diffEntries.map((d) => d.id));
const offTarget = [...changedIds].filter((id) => !TARGET_ID_SET.has(id));
check('9. 変更 ID は対象 16 ID 内', offTarget.length === 0, `off=${offTarget.join(',')}`);

// 10. 各 patch の before が一致 (適用前検証で保証済み)
check('10. patch before 一致', true, `${allPatches.length}/${allPatches.length} matched`);

// 11. 修正された ID で max_min_ratio が低下
const afterStats = {};
const ratioReport = [];
let ratioBad = 0;
for (const id of TARGET_IDS) {
  const idx = rowByIdMap.get(id);
  afterStats[id] = snapshotLens(idx);
  const before = beforeStats[id].ratio;
  const after = afterStats[id].ratio;
  const reduced = after < before;
  const isModified = changedIds.has(id);
  if (isModified && !reduced) ratioBad++;
  ratioReport.push({ id, before, after, reduced, modified: isModified });
}
check('11. 修正 ID で max_min_ratio 低下', ratioBad === 0, `bad=${ratioBad}`);

// 12. Step3 系 11+1 ID の correctIndex 不変
let step3Bad = 0;
const step3BadDetails = [];
for (const [id, expectedCi] of Object.entries(STEP3_CORRECT_INDEX)) {
  const idx = rowByIdMap.get(id);
  if (idx === undefined) continue;
  const actualCi = parseInt(dataRows[idx][ciIdx], 10);
  if (actualCi !== expectedCi) {
    step3Bad++;
    step3BadDetails.push(`${id}:${actualCi}≠${expectedCi}`);
  }
}
check('12. Step3 系 correctIndex 不変', step3Bad === 0, `bad=${step3Bad} ${step3BadDetails.join(',')}`);

// 全 PASS か
const allPass = validations.every((v) => v.ok);
console.log(`[step5c] validations: ${validations.filter((v) => v.ok).length}/${validations.length} PASS`);

// CSV 出力
const outputRows = [headerRow, ...dataRows];
writeFileSync(outputCsvPath, rowsToCsv(outputRows), 'utf8');
console.log(`[step5c] CSV written: ${outputCsvPath}`);

// diff CSV 出力
const diffHeader = ['id', 'column', 'before', 'after'];
const diffRows = [diffHeader, ...diffEntries.map((d) => [d.id, d.column, d.before, d.after])];
writeFileSync(join(runsDir, 'audit-step5c-diff.csv'), rowsToCsv(diffRows), 'utf8');

// merge.md 出力
const mergeMd = [
  '# Step5c Coordinator: 並列パッチ統合結果',
  '',
  `- 検証日: 2026-05-02`,
  `- 入力 CSV: \`questions-2026-05-02-step5b2.csv\``,
  `- 出力 CSV: \`questions-2026-05-02-step5c.csv\``,
  '',
  '## Worker パッチ件数',
  '',
  `| Worker | 担当 ID | パッチ件数 |`,
  `|---|---|---|`,
  `| Worker A | ch1-012 / ch2-002 / ch2-004 / ch2-016 | ${workerStats.A} |`,
  `| Worker B | ch3-020 / ch3-027 / ch3-039 / ch4-007 | ${workerStats.B} |`,
  `| Worker C | ch4-020 / ch5-012 / ch5-018 / ch5-044 | ${workerStats.C} |`,
  `| Worker D | ch6-003 / ch6-007 / ch6-027 / ch8-014 | ${workerStats.D} |`,
  `| **合計** | 16 ID | **${allPatches.length}** |`,
  '',
  '## 競合検出',
  '',
  `- 対象外 ID への patch: ${offTargetPatches.length} 件`,
  `- 不正 column への patch: ${badColumnPatches.length} 件`,
  `- 同一 id+column 重複: 0 件（検出時 exit）`,
  `- before 不一致: ${beforeMismatches.length} 件`,
  '',
  `→ 競合なし、全 ${allPatches.length} patch を適用`,
  '',
  '## 適用件数',
  '',
  `- 適用パッチ: ${allPatches.length}`,
  `- 影響 ID 数: ${changedIds.size}`,
  '',
  '## ratio 変化',
  '',
  `| ID | before | after | 変化 |`,
  `|---|---:|---:|:--:|`,
  ...ratioReport.map((r) => `| ${r.id} | ${r.before.toFixed(2)} | ${r.after.toFixed(2)} | ${r.reduced ? '✓' : '−'} |`),
].join('\n');
writeFileSync(join(runsDir, 'audit-step5c-parallel-merge.md'), mergeMd, 'utf8');

// validation.md 出力
const validationMd = [
  '# 0079 Step5c 完了条件検証結果',
  '',
  `- 検証日: 2026-05-02`,
  `- 入力 CSV: \`questions-2026-05-02-step5b2.csv\``,
  `- 出力 CSV: \`questions-2026-05-02-step5c.csv\``,
  `- 適用パッチ: ${allPatches.length}`,
  `- 影響 ID 数: ${changedIds.size}`,
  `- 全体結果: ${allPass ? '**ALL PASS**' : '**FAIL**'}`,
  '',
  '## チェック項目',
  '',
  ...validations.map((v) => `- ${v.label}: ${v.ok ? 'PASS' : 'FAIL'}${v.detail ? ` (${v.detail})` : ''}`),
  '',
  '## 対象 ID 別 ratio (before -> after)',
  '',
  `| id | correctIdx | before lens | before ratio | after lens | after ratio | 低下 |`,
  `|---|---|---|---:|---|---:|:--:|`,
  ...ratioReport.map((r) => {
    const b = beforeStats[r.id];
    const a = afterStats[r.id];
    return `| ${r.id} | ${b.correctIndex} | ${b.lens.join('/')} | ${b.ratio.toFixed(2)} | ${a.lens.join('/')} | ${a.ratio.toFixed(2)} | ${r.reduced ? '✓' : '−'} |`;
  }),
].join('\n');
writeFileSync(join(runsDir, 'audit-step5c-validation.md'), validationMd, 'utf8');

console.log('[step5c] all artifacts written');
console.log(`  CSV: ${outputCsvPath}`);
console.log(`  diff: ${join(runsDir, 'audit-step5c-diff.csv')}`);
console.log(`  merge: ${join(runsDir, 'audit-step5c-parallel-merge.md')}`);
console.log(`  validation: ${join(runsDir, 'audit-step5c-validation.md')}`);

if (!allPass) {
  console.error('[step5c] VALIDATION FAILED');
  process.exit(2);
}
console.log('[step5c] ALL PASS');
