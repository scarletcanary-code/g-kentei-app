/**
 * _apply-step4f-fixes.mjs
 * Step4f: 9 target IDs (Planner 改訂版) のピンポイント修正を適用し、
 * questions-2026-05-02-step4f.csv を出力する。
 *
 * 改訂履歴:
 *  - 初版: 8 ID。
 *  - 2026-05-02 改訂: ch1-029 を 9 件目として追加（Planner 仕様書 0074 改訂版に準拠）。
 *    完了条件 #9「として整理した説明 0 件」を全体で達成するための必須修正。
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INPUT_PATH = path.join(__dirname, '../../.harness/exports/questions-2026-05-02-step4e.csv');
const OUTPUT_PATH = path.join(__dirname, '../../.harness/exports/questions-2026-05-02-step4f.csv');
const DIFF_PATH = path.join(__dirname, '../../.harness/runs/0074/audit-step4f-diff.csv');
const PINPOINT_MD_PATH = path.join(__dirname, '../../.harness/runs/0074/audit-step4f-final-pinpoint.md');

// CSV parser (RFC 4180)
function parseCsv(csvText) {
  const text = csvText.startsWith('﻿') ? csvText.slice(1) : csvText;
  const rows = [];
  let inQ = false, cur = '', row = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (!inQ) inQ = true;
      else if (i + 1 < text.length && text[i + 1] === '"') { cur += '"'; i++; }
      else inQ = false;
    } else if (c === ',' && !inQ) { row.push(cur); cur = ''; }
    else if (c === '\n' && !inQ) { row.push(cur); cur = ''; rows.push(row); row = []; }
    else if (c === '\r' && !inQ) { /* skip */ }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

// CSV escape
function csvEscape(value) {
  const v = value === null || value === undefined ? '' : String(value);
  if (v.includes(',') || v.includes('"') || v.includes('\n') || v.includes('\r')) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}

function buildCsv(headers, dataRows) {
  const lines = [];
  lines.push(headers.map(csvEscape).join(','));
  for (const r of dataRows) {
    lines.push(headers.map(h => csvEscape(r[h] || '')).join(','));
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}

const csvText = fs.readFileSync(INPUT_PATH, 'utf8');
const rawRows = parseCsv(csvText);
const headers = rawRows[0].map(h => h.replace(/\r/g, ''));
const dataRowsArr = rawRows.slice(1).filter(r => r.some(v => v.trim() !== ''));
const dataRows = dataRowsArr.map(r => {
  const o = {};
  headers.forEach((h, i) => { o[h] = r[i] !== undefined ? r[i].replace(/\r/g, '') : ''; });
  return o;
});

console.log(`Loaded ${dataRows.length} data rows`);

// Modification ledger: collected as { id, column, before, after, reason }
const diffs = [];
const fixes = {};  // by id

// ---------- ch5-033 (correctIndex=2) ----------
fixes['ch5-033'] = {
  choice2: {
    before: '1×1・3×3・5×5畳み込みを並列に適用するInceptionモジュールを用い、計算コストを抑えつつ多スケールの特徴を捉えるCNNモ',
    after: '1×1・3×3・5×5畳み込みを並列に適用するInceptionモジュールを用い、計算コストを抑えつつ多スケールの特徴を捉えるCNNモデル',
    reason: '末尾の途中切れ「CNNモ」を「CNNモデル」に補完',
  },
  正答テキスト: {
    before: '1×1・3×3・5×5畳み込みを並列に適用するInceptionモジュールを用い、計算コストを抑えつつ多スケールの特徴を捉えるCNNモ',
    after: '1×1・3×3・5×5畳み込みを並列に適用するInceptionモジュールを用い、計算コストを抑えつつ多スケールの特徴を捉えるCNNモデル',
    reason: 'choice2修正に伴い正答テキストを完全一致させる',
  },
  choice3: {
    before: 'GoogLeNetは、自然言語処理に特化したモデルであることが特徴であるとして適用される技術',
    after: 'GoogLeNetは、自然言語処理に特化したモデルである',
    reason: '不自然な末尾「であることが特徴であるとして適用される技術」を削除し、自然な誤答選択肢に整える',
  },
};

// ---------- ch8-012 (correctIndex=0) ----------
fixes['ch8-012'] = {
  choice0: {
    before: '人種、信条、病歴、犯罪歴など、不当な差別や偏見を生じさせる可能性があるため取得に原',
    after: '人種、信条、病歴、犯罪歴など、不当な差別や偏見を生じさせる可能性があるため、取得に原則として本人の同意が必要となる情報',
    reason: '末尾の途中切れ「取得に原」を「取得に原則として本人の同意が必要となる情報」に補完',
  },
  正答テキスト: {
    before: '人種、信条、病歴、犯罪歴など、不当な差別や偏見を生じさせる可能性があるため取得に原',
    after: '人種、信条、病歴、犯罪歴など、不当な差別や偏見を生じさせる可能性があるため、取得に原則として本人の同意が必要となる情報',
    reason: 'choice0修正に伴い正答テキストを完全一致させる',
  },
  choice2: {
    before: '要配慮個人情報は、本人の同意があれば自由に取得できる情報であるとして整理した説明',
    after: '要配慮個人情報は、本人の同意があれば自由に取得できる情報である',
    reason: '禁止文字列「として整理した説明」を削除し、自然な誤答選択肢に整える',
  },
};

// ---------- ch2-013 (correctIndex=0) ----------
fixes['ch2-013'] = {
  choice2: {
    before: 'ヒューリスティック探索は、無作為に選択肢を選び、最終的に結果を評価する方法であるとして整理した説明',
    after: 'ヒューリスティック探索は、無作為に選択肢を選び、最終的に結果を評価する方法である',
    reason: '禁止文字列「として整理した説明」を削除し、自然な誤答選択肢に整える',
  },
  choice3: {
    before: 'ヒューリスティック探索は、探索空間を網羅的に列挙し、最適解を見つける手法であるとみなす選択肢と説明する内容',
    after: 'ヒューリスティック探索は、探索空間を網羅的に列挙し、最適解を見つける手法である',
    reason: '禁止文字列「とみなす選択肢と説明する内容」を削除し、自然な誤答選択肢に整える',
  },
};

// ---------- ch6-008 (correctIndex=1) ----------
fixes['ch6-008'] = {
  choice2: {
    before: 'ノイズを加えたデータをVAE（変分オートエンコーダ）の潜在空間で復元し、元データを再構成する手法として整理した説明',
    after: 'ノイズを加えたデータをVAE（変分オートエンコーダ）の潜在空間で復元し、元データを再構成する手法',
    reason: '禁止文字列「として整理した説明」を削除し、自然な誤答選択肢に整える',
  },
  choice3: {
    before: 'CLIP（コントラスト学習）でテキストと画像のペアを学習し、異なるデータセットを組み合わせて生成する手法とみなす選択肢と説明する内容',
    after: 'CLIP（コントラスト学習）でテキストと画像のペアを学習し、異なるデータセットを組み合わせて生成する手法',
    reason: '禁止文字列「とみなす選択肢と説明する内容」を削除し、自然な誤答選択肢に整える',
  },
};

// ---------- ch2-028 (correctIndex=3) ----------
fixes['ch2-028'] = {
  choice1: {
    before: '2000年代初頭のSVM（サポートベクターマシン）・ブースティングブームが生成AIを促進したを示す見方',
    after: '2000年代初頭のSVM（サポートベクターマシン）・ブースティングブームが生成AIの直接的な発展を促進した',
    reason: '不自然表現「促進したを示す見方」を「の直接的な発展を促進した」に修正',
  },
};

// ---------- ch3-023 (correctIndex=1) ----------
fixes['ch3-023'] = {
  choice2: {
    before: 'FPが問題: がん診断（患者を陽性誤判定）、FNが問題: 詐欺検出（不正取引を見逃す）として整理した説明',
    after: 'FPが問題: がん診断（患者を陽性誤判定）、FNが問題: 詐欺検出（不正取引を見逃す）',
    reason: '禁止文字列「として整理した説明」を削除し、自然な誤答選択肢に整える',
  },
};

// ---------- ch7-013 (correctIndex=0) ----------
fixes['ch7-013'] = {
  choice2: {
    before: 'データドリフトはデータの変化を示し、コンセプトドリフトはモデルの再学習を必要とするものであるとして整理した説明',
    after: 'データドリフトはデータの変化を示し、コンセプトドリフトはモデルの再学習を必要とするものである',
    reason: '禁止文字列「として整理した説明」を削除し、自然な誤答選択肢に整える',
  },
};

// ---------- ch8-028 (correctIndex=3) ----------
fixes['ch8-028'] = {
  choice2: {
    before: 'ユーザーの意見を反映し、AIが常に正確な判断を下すことに寄与する技術であるとして整理した説明',
    after: 'ユーザーの意見を反映し、AIが常に正確な判断を下すことに寄与する技術である',
    reason: '禁止文字列「として整理した説明」を削除し、自然な誤答選択肢に整える',
  },
};

// ---------- ch1-029 (correctIndex=0) ----------
// Planner 仕様書 0074 改訂版に基づき、9 件目として正規追加。
// choice2 末尾の禁止文字列「として整理した説明」を削除し、自然な誤答選択肢に整える。
// optionRationales の 3 番目（誤答位置）は「誤り。これはフレーム問題の説明であり、
// AI効果ではない。」で choice2 修正後とも整合するため変更不要。
// explanation / misconceptionTarget も choice2 修正と矛盾しないため変更不要。
fixes['ch1-029'] = {
  choice2: {
    before: 'AIが現実世界で関係する情報と無関係な情報を切り分けられないと指摘されたとして整理した説明',
    after: 'AIが現実世界で関係する情報と無関係な情報を切り分けられないと指摘された',
    reason: '禁止文字列「として整理した説明」を削除し、自然な誤答選択肢に整える（choice2 は誤答位置で、フレーム問題の説明として自然な完結文に修正）',
  },
};

// Apply fixes
let mutationCount = 0;
for (const row of dataRows) {
  const id = row.id;
  if (!fixes[id]) continue;
  const idFixes = fixes[id];
  for (const [col, spec] of Object.entries(idFixes)) {
    const before = row[col];
    if (before !== spec.before) {
      console.error(`MISMATCH for ${id}.${col}:`);
      console.error(`  expected: ${spec.before}`);
      console.error(`  actual  : ${before}`);
      process.exit(1);
    }
    row[col] = spec.after;
    diffs.push({ id, column: col, before: spec.before, after: spec.after, reason: spec.reason });
    mutationCount++;
  }
}

console.log(`Applied ${mutationCount} cell modifications`);

// Write output CSV
const out = buildCsv(headers, dataRows);
fs.writeFileSync(OUTPUT_PATH, out, 'utf8');
console.log(`Wrote ${OUTPUT_PATH}`);

// Write diff CSV
const diffLines = ['id,column,before,after'];
for (const d of diffs) {
  diffLines.push([d.id, d.column, d.before, d.after].map(csvEscape).join(','));
}
const diffDir = path.dirname(DIFF_PATH);
if (!fs.existsSync(diffDir)) fs.mkdirSync(diffDir, { recursive: true });
fs.writeFileSync(DIFF_PATH, diffLines.join('\n') + '\n', 'utf8');
console.log(`Wrote ${DIFF_PATH}`);

// Write final pinpoint MD
const ids9 = ['ch5-033', 'ch8-012', 'ch2-013', 'ch6-008', 'ch2-028', 'ch3-023', 'ch7-013', 'ch8-028', 'ch1-029'];
const md = [];
md.push('# Step4f 最終ピンポイント修正レポート');
md.push('');
md.push(`- 入力: ${path.basename(INPUT_PATH)}`);
md.push(`- 出力: ${path.basename(OUTPUT_PATH)}`);
md.push(`- 修正件数: ${mutationCount}`);
md.push('');
md.push('## 対象 9 ID');
md.push('');
md.push(`9 ID: ${ids9.join(' / ')}`);
md.push('');
md.push('## 改訂履歴');
md.push('');
md.push('- 2026-05-02 初版: 8 ID（ch5-033 / ch8-012 / ch2-013 / ch6-008 / ch2-028 / ch3-023 / ch7-013 / ch8-028）。');
md.push('- 2026-05-02 改訂: Planner 仕様書改訂を受け、ch1-029 を 9 件目として正規追加。完了条件 #9「として整理した説明 0 件」を全体で達成。');
md.push('');
for (const id of ids9) {
  md.push(`## ${id}`);
  md.push('');
  const f = fixes[id];
  if (!f) continue;
  for (const [col, spec] of Object.entries(f)) {
    md.push(`### column: ${col}`);
    md.push('');
    md.push(`- before: ${spec.before}`);
    md.push(`- after: ${spec.after}`);
    md.push(`- 変更理由: ${spec.reason}`);
    md.push('');
  }
}
fs.writeFileSync(PINPOINT_MD_PATH, md.join('\n'), 'utf8');
console.log(`Wrote ${PINPOINT_MD_PATH}`);
