/**
 * _apply-step1b-fixes.mjs
 * Step1b 修正をCSVに適用し step1b.csv を出力する。
 * 一時スクリプト。直接 node で実行する。
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const repoRoot = join(projectRoot, '..');

const inputPath = join(repoRoot, '.harness/exports/questions-2026-05-02-step1.csv');
const outputPath = join(repoRoot, '.harness/exports/questions-2026-05-02-step1b.csv');

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
      lines.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
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
    } else if (ch === ',' && !inQuote) {
      fields.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

function parseCsv(text) {
  const raw = text.startsWith('﻿') ? text.slice(1) : text;
  const lines = splitLines(raw).filter(l => l.trim() !== '');
  return lines.map(splitRow);
}

// ---- CSV serializer ----
function escapeCell(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function serializeCsv(rows) {
  return rows.map(row => row.map(escapeCell).join(',')).join('\r\n') + '\r\n';
}

// ---- Load ----
const rawText = readFileSync(inputPath, 'utf8');
const hasBom = rawText.startsWith('﻿');
const allRows = parseCsv(rawText);

const headers = allRows[0];
const dataRows = allRows.slice(1).filter(r => r.some(c => c.trim() !== ''));

const colIdx = {};
for (let i = 0; i < headers.length; i++) colIdx[headers[i]] = i;

// ---- Fixes ----
// format: { id, column, newValue }
const fixes = [
  // ch2-026: 末尾「、」を削除
  {
    id: 'ch2-026', column: 'choice3',
    newValue: '第1次：トイ・プロブレムの限界（現実の複雑な問題に対処できない）、第2次：知識獲得のボトルネック（常識を教えられない）',
  },
  {
    id: 'ch2-026', column: '正答テキスト',
    newValue: '第1次：トイ・プロブレムの限界（現実の複雑な問題に対処できない）、第2次：知識獲得のボトルネック（常識を教えられない）',
  },

  // ch3-010: choice3「F値（F1-score）：適合率と再現率の調和平均」→末尾を調整
  {
    id: 'ch3-010', column: 'choice3',
    newValue: 'F値（F1-score）：適合率と再現率の調和平均（バランス指標）',
  },

  // ch3-011: choice1/正答テキスト「適合率と再現率の調和平均」→末尾を調整
  {
    id: 'ch3-011', column: 'choice1',
    newValue: '適合率と再現率の調和平均（F値）',
  },
  {
    id: 'ch3-011', column: '正答テキスト',
    newValue: '適合率と再現率の調和平均（F値）',
  },

  // ch3-031: choice2/正答テキスト「設計が必」→「設計が必要である」
  {
    id: 'ch3-031', column: 'choice2',
    newValue: '適切な報酬設計がなければエージェントが目標とは異なる行動を学習してしまうため、タスクの目的に合わせた慎重な設計が必要である',
  },
  {
    id: 'ch3-031', column: '正答テキスト',
    newValue: '適切な報酬設計がなければエージェントが目標とは異なる行動を学習してしまうため、タスクの目的に合わせた慎重な設計が必要である',
  },

  // ch3-045: choice3/正答テキスト「クラス不均」→補完
  {
    id: 'ch3-045', column: 'choice3',
    newValue: '少数クラスのオーバーサンプリング（SMOTE等）や多数クラスのアンダーサンプリング、あるいはF値やAUCなどクラス不均衡に適した評価指標を用いることが有効である',
  },
  {
    id: 'ch3-045', column: '正答テキスト',
    newValue: '少数クラスのオーバーサンプリング（SMOTE等）や多数クラスのアンダーサンプリング、あるいはF値やAUCなどクラス不均衡に適した評価指標を用いることが有効である',
  },

  // ch4-015: choice0/正答テキスト「損失の勾」→補完
  {
    id: 'ch4-015', column: 'choice0',
    newValue: '連鎖律は合成関数の微分を各関数の微分の積として求める法則であり、誤差逆伝播法はこれを利用して各層の重みへの損失の勾配を出力側から入力側へ効率的に計算するアルゴリズム',
  },
  {
    id: 'ch4-015', column: '正答テキスト',
    newValue: '連鎖律は合成関数の微分を各関数の微分の積として求める法則であり、誤差逆伝播法はこれを利用して各層の重みへの損失の勾配を出力側から入力側へ効率的に計算するアルゴリズム',
  },

  // ch4-018: 正答テキスト → choice0と一致させる（choice0は完結）
  {
    id: 'ch4-018', column: '正答テキスト',
    newValue: 'XOR問題のデータは1本の直線では正例と負例を分けられない（線形分離不可能）ため、線形分類器である単純パーセプトロンでは解くことができない。',
  },

  // ch4-024: 正答テキスト → choice2と一致させる（末尾「か」を削除）
  {
    id: 'ch4-024', column: '正答テキスト',
    newValue: 'ReLU関数は入力が0以下のとき出力が0になるため実質的に半分のニューロンしか活性化されず、それを考慮して分散を2倍にしている。',
  },

  // ch5-017: 正答テキスト → choice0と一致させる
  {
    id: 'ch5-017', column: '正答テキスト',
    newValue: '入力データの周囲に値（0など）を埋めることで、畳み込み後の特徴マップサイズが縮小しすぎるのを防ぐ手法。',
  },

  // ch5-024: choice2/正答テキスト「を生」→補完
  {
    id: 'ch5-024', column: 'choice2',
    newValue: '本物らしいデータを生成するGeneratorと、本物か偽物かを識別するDiscriminatorを競わせることで高品質なデータを生成する仕組み',
  },
  {
    id: 'ch5-024', column: '正答テキスト',
    newValue: '本物らしいデータを生成するGeneratorと、本物か偽物かを識別するDiscriminatorを競わせることで高品質なデータを生成する仕組み',
  },

  // ch6-027: choice3/正答テキスト「を生成させ、」→補完
  {
    id: 'ch6-027', column: 'choice3',
    newValue: 'ハルシネーションとはLLMが事実と異なる情報をもっともらしく生成する現象。RAGは外部知識ベースを検索してその結果をプロンプトに組み込むことで根拠のある回答を生成させ、ハルシネーションを抑制する手法',
  },
  {
    id: 'ch6-027', column: '正答テキスト',
    newValue: 'ハルシネーションとはLLMが事実と異なる情報をもっともらしく生成する現象。RAGは外部知識ベースを検索してその結果をプロンプトに組み込むことで根拠のある回答を生成させ、ハルシネーションを抑制する手法',
  },

  // ch6-034: choice0/正答テキスト「パラメータを新タ」→補完
  {
    id: 'ch6-034', column: 'choice0',
    newValue: '転移学習は別タスクで学習済みのモデルの知識を新タスクに活用する概念の総称。ファインチューニングはその手法の一つで、事前学習済みモデルの全部または一部のパラメータを新タスクのデータで追加学習する手法',
  },
  {
    id: 'ch6-034', column: '正答テキスト',
    newValue: '転移学習は別タスクで学習済みのモデルの知識を新タスクに活用する概念の総称。ファインチューニングはその手法の一つで、事前学習済みモデルの全部または一部のパラメータを新タスクのデータで追加学習する手法',
  },

  // ch7-008: 正答テキスト → choice2と一致させる
  {
    id: 'ch7-008', column: '正答テキスト',
    newValue: '時間経過に伴うデータ分布の変化（モデルドリフト）への継続的な対処と、システムの監視・再学習が必要になること。',
  },

  // ch7-020: 正答テキスト → choice2と一致させる
  {
    id: 'ch7-020', column: '正答テキスト',
    newValue: 'データの前処理・特徴量エンジニアリング・アルゴリズム選択・ハイパーパラメータ調整といった機械学習の構築プロセスを自動化する技術。',
  },

  // ch7-028: choice3/正答テキスト「制約があるため、」→補完
  {
    id: 'ch7-028', column: 'choice3',
    newValue: 'スマートフォン・IoT機器などのエッジデバイスはメモリ・演算能力・バッテリーの制約があるため、モデルの軽量化が求められる',
  },
  {
    id: 'ch7-028', column: '正答テキスト',
    newValue: 'スマートフォン・IoT機器などのエッジデバイスはメモリ・演算能力・バッテリーの制約があるため、モデルの軽量化が求められる',
  },
];

// ---- Apply fixes ----
const idCol = colIdx['id'];
const fixLog = [];

for (const fix of fixes) {
  const rowIdx = dataRows.findIndex(r => r[idCol] === fix.id);
  if (rowIdx < 0) { console.error('NOT FOUND:', fix.id); continue; }
  const ci = colIdx[fix.column];
  if (ci === undefined) { console.error('COLUMN NOT FOUND:', fix.column); continue; }
  const before = dataRows[rowIdx][ci];
  dataRows[rowIdx][ci] = fix.newValue;
  fixLog.push({ id: fix.id, column: fix.column, before, after: fix.newValue });
  console.log(`Fixed ${fix.id}.${fix.column}`);
}

// ---- Serialize and write ----
const outputRows = [headers, ...dataRows];
const csv = serializeCsv(outputRows);
const bom = hasBom ? '﻿' : '';
writeFileSync(outputPath, bom + csv, 'utf8');
console.log(`\nWrote ${dataRows.length} data rows to ${outputPath}`);

// Save fix log for audit
mkdirSync(join(repoRoot, '.harness/runs/0063'), { recursive: true });
const logPath = join(repoRoot, '.harness/runs/0063/fixlog.json');
writeFileSync(logPath, JSON.stringify(fixLog, null, 2), 'utf8');
console.log(`Fix log: ${logPath}`);
