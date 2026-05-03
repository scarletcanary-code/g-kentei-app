/**
 * apply-step3b-fixes.mjs
 * Step3b: one-best-answer 修正（11 件）を適用して修正版 CSV を出力する。
 *
 * 使い方:
 *   node scripts/apply-step3b-fixes.mjs
 *
 * 入力:
 *   ../.harness/exports/questions-2026-05-02-step2b.csv
 *
 * 出力:
 *   ../.harness/exports/questions-2026-05-02-step3b.csv
 *   ../.harness/runs/0067/audit-step3b-one-best-answer-fixes.md
 *   ../.harness/runs/0067/audit-step3b-validation.md
 *   ../.harness/runs/0067/audit-step3b-skipped.csv（スキップ件数 0 のため空ヘッダーのみ）
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const repoRoot = join(projectRoot, '..');

const csvIn = join(repoRoot, '.harness/exports/questions-2026-05-02-step2b.csv');
const csvOut = join(repoRoot, '.harness/exports/questions-2026-05-02-step3b.csv');
const runsDir = join(repoRoot, '.harness/runs/0067');
const fixesLog = join(runsDir, 'audit-step3b-one-best-answer-fixes.md');
const validationLog = join(runsDir, 'audit-step3b-validation.md');
const skippedCsv = join(runsDir, 'audit-step3b-skipped.csv');

mkdirSync(runsDir, { recursive: true });

// ---- CSV parser (BOM-aware, RFC 4180) ----
function splitLines(text) {
  const lines = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuote && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuote = !inQuote;
        cur += ch;
      }
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
      if (inQuote && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === ',' && !inQuote) {
      fields.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

function parseCsv(text) {
  const raw = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
  const lines = splitLines(raw).filter(l => l.trim() !== '');
  return lines.map(splitRow);
}

// ---- CSV serializer (BOM 付き、RFC 4180) ----
function escapeField(val) {
  if (val.includes('"') || val.includes(',') || val.includes('\n') || val.includes('\r')) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}

function serializeCsv(rows) {
  return '﻿' + rows.map(r => r.map(escapeField).join(',')).join('\r\n') + '\r\n';
}

const SEPARATOR = ' || ';

// ---- 修正定義 ----
// 各エントリ: id → { column: newValue, ... }
// optionRationales は配列インデックスで指定
const FIXES = {

  // ch5-002: choice0 を明確な誤答に変更（正答は choice1 を維持）
  'ch5-002': {
    choice0: '畳み込みフィルタの重みを学習し、局所特徴を抽出する層',
    optionRationales: [
      '誤り。畳み込みフィルタの重みを学習して局所特徴を抽出するのは畳み込み層（Convolutional Layer）であり、プーリング層の役割ではない。',
      '正解。プーリング層は特徴マップの空間的サイズを縮小し、位置ずれへの頑健性を高めることが主な役割である。',
      '誤り。色彩調整は画像処理の別の技術であり、プーリング層の役割ではない。',
      '誤り。プーリング層は次元を減少させるが、詳細を強調するのではなく、重要な特徴を保持する処理を行う。',
    ],
    misconceptionTarget: 'プーリング層の役割を畳み込み層と混同すること',
  },

  // ch6-015: choice0 途中切れ補完 + 正答テキスト整合 + choice1 を明確な誤答に変更
  'ch6-015': {
    choice0: 'セマンティックセグメンテーションは全画素にクラスラベルを付けるが、同じクラスの個体同士は区別しない。',
    '正答テキスト': 'セマンティックセグメンテーションは全画素にクラスラベルを付けるが、同じクラスの個体同士は区別しない。',
    choice1: 'インスタンスセグメンテーションは画像全体に1つのラベルだけを付ける手法である',
    optionRationales: [
      '正解。セマンティックセグメンテーションは全画素にクラスラベルを付けるが、同クラスの個体（例：複数の車）を個別に区別しない。',
      '誤り。インスタンスセグメンテーションは画像全体に1つのラベルを付ける手法ではなく、各物体インスタンスを個別に画素レベルで識別・分離する手法である。',
      '誤り。セマンティックセグメンテーションは画像全体を単一クラスに分類するのではなく、各画素にクラスラベルを付与する。単一クラス分類は画像分類（Image Classification）の説明に近い。',
      '誤り。Bounding Boxで矩形を囲むのは物体検出（Object Detection）の手法であり、インスタンスセグメンテーションは画素レベルのマスク生成を行う。',
    ],
  },

  // ch4-018: choice3 を明確な誤答に変更（choice0 と重複解消）
  'ch4-018': {
    choice3: 'XOR問題は入力特徴量が多すぎるため、単純パーセプトロンでは計算できない',
    optionRationales: [
      '正解。XOR問題は4点が1本の直線で分離できない（線形分離不可能）ため、線形分類器である単純パーセプトロンでは解けない。',
      '誤り。単純パーセプトロンの出力が常に0になるわけではない。入力によって0または1を出力するが、XORの正しい分類ができない。',
      '誤り。多層構造を持たないことは関連するが、XOR問題が解けない直接の理由は線形分離不可能性であり、多層構造の欠如はその結果として解法が存在しないことを意味する。',
      '誤り。XOR問題の入力特徴量は2変数のみであり、特徴量が多すぎるわけではない。単純パーセプトロンで解けない理由は線形分離不可能性である。',
    ],
    misconceptionTarget: '線形分離不可能性と特徴量の次元数の混同',
  },

  // ch5-040: 問題を再設計（正答は choice3、correctIndex=3 を維持）
  'ch5-040': {
    question: '転移学習において、特徴抽出（Feature Extraction）として事前学習済みモデルを使う場合の説明として最も適切なものはどれか。',
    choice0: '事前学習済みモデルの全層を新しいタスク用に最初から再学習させる手法である',
    choice1: '事前学習済みモデルは自然言語処理タスクにのみ適用でき、画像認識には使えない',
    choice2: '事前学習済みモデルを使う場合、常に大量のラベル付きデータが必要となる',
    choice3: '事前学習済みモデルの一部または大部分の重みを固定し、抽出された特徴を新しいタスクの分類器などに利用する',
    '正答テキスト': '事前学習済みモデルの一部または大部分の重みを固定し、抽出された特徴を新しいタスクの分類器などに利用する',
    explanation: '転移学習の「特徴抽出（Feature Extraction）」とは、事前学習済みモデルの重みを固定（凍結）し、そのモデルが学習した特徴表現を新しいタスクの入力特徴として利用する手法である。ファインチューニングと異なり、事前学習済みの層は更新されず、新たに追加した出力層のみを学習する。少量のデータでも有効であり、画像・言語など多様なドメインで広く使われる。',
    optionRationales: [
      '誤り。特徴抽出では全層を再学習させない。事前学習済みモデルの重みは固定し、最終層など一部のみを学習させる。全層を再学習させる手法はファインチューニングに近い。',
      '誤り。転移学習の特徴抽出は自然言語処理に限らず、画像認識（VGG、ResNet等）や音声認識など多様なドメインで広く使われる手法である。',
      '誤り。特徴抽出は少量のデータでも有効に機能する点が利点の一つである。大量のラベル付きデータが必要とするのは事前学習そのものであり、転移先タスクでは少量データでも適用可能である。',
      '正解。特徴抽出では事前学習済みモデルの重みを固定し、学習済みの特徴表現を新しいタスクの分類器等に利用する。',
    ],
    misconceptionTarget: '特徴抽出とファインチューニングの違いの混同',
  },

  // ch1-030: choice0 を別著作に変更（choice1 と重複しないように）
  'ch1-030': {
    choice0: '「スーパーインテリジェンス」（Superintelligence: Paths, Dangers, Strategies）',
    optionRationales: [
      '誤り。「スーパーインテリジェンス」はニック・ボストロムの著書であり、レイ・カーツワイルの著書ではない。',
      '誤り。「スーパーインテリジェンス」（Superintelligence）はニック・ボストロムの著書である。',
      '誤り。「マインド・チルドレン」はハンス・モラベックの著書である。',
      '正解。「The Singularity Is Near」（シンギュラリティは近い）はレイ・カーツワイルの代表的著作である。',
    ],
    misconceptionTarget: '「シンギュラリティは近い」をニック・ボストロムの著書と混同しやすい。',
  },

  // ch1-010: 問題文をレベル4に限定 + 選択肢をレベル4以外として明確化
  'ch1-010': {
    question: 'AIレベル分類におけるレベル4の説明として最も適切なものはどれか。',
    choice0: 'あらかじめ定められたルールに従って動作し、入力に応じた出力を返す制御システムである（レベル1の説明）',
    choice1: '人間が事前に定義した特徴量を用いて、データからパターンを学習する（レベル3の説明）',
    choice2: '入力データの特徴量をAIが自律的に学習する',
    '正答テキスト': '入力データの特徴量をAIが自律的に学習する',
    choice3: '検索・推論エンジンなどルールベースで知識を表現し処理する古典的AIである（レベル2の説明）',
    optionRationales: [
      '誤り。これはレベル1（制御プログラム）の説明である。レベル4は特徴量の自律学習（ディープラーニング）を特徴とする。',
      '誤り。人間が特徴量を定義してAIに与える手法はレベル3（機械学習）の説明である。レベル4では特徴量の抽出もAIが行う。',
      '正解。レベル4のディープラーニングは、入力データから特徴量をAI自身が自律的に学習する点が最大の特徴である。',
      '誤り。これはレベル2（ルールベースAI）の説明である。レベル4は特徴量の自律学習を行うディープラーニングを指す。',
    ],
    misconceptionTarget: 'レベル4（ディープラーニング）と他のレベルの混同',
  },

  // ch1-027: 問題文を AI 効果に限定
  'ch1-027': {
    question: 'AI効果が、人工知能の定義を難しくする理由として最も適切なものはどれか。',
    optionRationales: [
      '誤り。技術の進化が影響することは事実だが、AI効果が定義を難しくする直接の理由ではない。AI効果は実現済み技術が「AIではない」と格下げされる現象を指す。',
      '誤り。専門家の意見多様化は関連するが、AI効果の本質は「実現されるとAIとみなされなくなる」という定義の動的変化にある。',
      '誤り。技術の進化による定義の古化は一般的な問題であり、AI効果の特徴的なメカニズムを説明していない。',
      '正解。AI効果により、実現された技術は「AIではなく単なる自動化」とみなされ、定義の境界が常に変化するから。',
    ],
  },

  // ch3-024: choice3 を Precision 重視ユースケースに変更
  'ch3-024': {
    choice3: '迷惑メール判定で、正常なメールを誤って迷惑メールに分類しないようにする場合',
    optionRationales: [
      '誤り。誤って陽性と判断することを減らすのは適合率（Precision）の目的に近い。再現率（Recall）は陽性の見逃しを減らすことを重視する。',
      '誤り。偽陽性を減らすことは適合率（Precision）の向上に対応する。再現率は偽陰性（見逃し）を減らすことを目的とする。',
      '正解。がん検診AIで実際の陽性患者を見逃さないことは再現率（Recall）を重視するユースケースである。',
      '誤り。正常なメールを迷惑メールに誤分類しないようにする（偽陽性を減らす）ことは適合率（Precision）を重視するユースケースであり、再現率重視とは逆の方針である。',
    ],
    misconceptionTarget: '再現率重視と適合率重視のユースケース混同',
  },

  // ch7-003: choice0 を明確な誤答に変更
  'ch7-003': {
    choice0: '検証データと本番データの分布差が必ず小さくなる',
    optionRationales: [
      '誤り。データリーケージは検証データと本番データの分布差を小さくするものではない。むしろ学習データに本来使えない情報が混入することで検証精度が過大評価される問題である。',
      '正解。データリーケージにより検証時には高精度に見えるが、実際の運用環境では精度が大幅に低下する。',
      '誤り。データリーケージは過学習の一因となることはあるが、過学習そのものではない。リーケージは学習・検証プロセスへの不正な情報混入を指す。',
      '誤り。データリーケージはモデルの性能を不安定にする原因であり、安定性を高めるものではない。',
    ],
    misconceptionTarget: 'データリーケージの影響を誤解し、検証精度の上昇のみに着目すること',
  },

  // ch8-003: choice3 を明確な誤答に変更
  'ch8-003': {
    choice3: 'すべてのAIシステムに同一の義務を課す',
    optionRationales: [
      '誤り。EU AI法のリスク分類は4段階であり、3段階（高・中・低）ではない。「許容できないリスク」「高リスク」「限定的リスク」「最小限のリスク」の4カテゴリである。',
      '正解。EU AI法はリスクベースアプローチを採用し、AIを4段階に分類してリスクに応じた義務を課す。',
      '誤り。EU AI法のリスク分類は2段階ではなく4段階に分かれている。',
      '誤り。EU AI法はリスクレベルに応じて異なる義務を課す「リスクベースアプローチ」であり、すべてのAIシステムに同一の義務を課す均一規制ではない。',
    ],
    misconceptionTarget: 'EU AI法のリスク分類段階数と義務の均一性の誤解',
  },

  // ch8-019: choice0 と choice1 を別バイアス/明確な誤答に変更
  'ch8-019': {
    choice0: '予測結果を人間が過度に信頼してしまう偏り',
    choice1: 'モデル内部の判断根拠が説明できない状態',
    optionRationales: [
      '誤り。予測結果を人間が過度に信頼してしまう偏りは自動化バイアス（Automation Bias）の説明であり、選択バイアスとは異なる。',
      '誤り。モデル内部の判断根拠が説明できない状態はブラックボックス問題（説明可能性の欠如）の説明であり、選択バイアスとは異なる。',
      '正解。選択バイアスとは、学習データが対象となる母集団を適切に代表していないことで生じる偏りである。',
      '誤り。誤ったラベルはラベリングエラー（アノテーションバイアス）の問題であり、選択バイアスとは異なる概念である。',
    ],
    misconceptionTarget: '選択バイアスを自動化バイアスやブラックボックス問題と混同すること',
  },
};

// ---- Load CSV ----
const rawText = readFileSync(csvIn, 'utf8');
const allRows = parseCsv(rawText);
const headers = allRows[0].map(h => h.replace(/\r$/, ''));
const dataRows = allRows.slice(1).filter(r => r.some(c => c.trim() !== ''));

const colIdx = {};
for (let i = 0; i < headers.length; i++) {
  colIdx[headers[i]] = i;
}

// Track actual changes
const appliedFixes = [];

const newRows = [headers];
for (const row of dataRows) {
  const newRow = [...row];
  const id = row[colIdx['id']] || '';

  if (!FIXES[id]) {
    newRows.push(newRow);
    continue;
  }

  const fix = FIXES[id];

  // Apply text column fixes
  const textColumns = ['question', 'choice0', 'choice1', 'choice2', 'choice3', '正答テキスト', 'explanation', 'misconceptionTarget'];
  for (const col of textColumns) {
    if (fix[col] !== undefined) {
      const ci = colIdx[col];
      if (ci !== undefined) {
        const before = row[ci];
        const after = fix[col];
        if (before !== after) {
          newRow[ci] = after;
          appliedFixes.push({ id, column: col, before, after });
        }
      }
    }
  }

  // Apply optionRationales fix
  if (fix.optionRationales) {
    const ci = colIdx['optionRationales'];
    const orBefore = row[ci] || '';
    const newBlocks = fix.optionRationales;
    const orAfter = newBlocks.join(SEPARATOR);
    if (orBefore !== orAfter) {
      newRow[ci] = orAfter;
      appliedFixes.push({ id, column: 'optionRationales', before: orBefore, after: orAfter });
    }
  }

  newRows.push(newRow);
}

// ---- Write output CSV ----
writeFileSync(csvOut, serializeCsv(newRows), 'utf8');
console.log(`Written: ${csvOut}`);

// ---- Validation ----
let seikaiMismatch = 0;
let blockCountViolation = 0;
let correctLabelViolation = 0;
let wrongLabelViolation = 0;
let truncationViolation = 0;
const truncationDetails = [];
const TRUNCATION_PATTERN = /インスタンスセグメンテーショ("|,|$)/;

const seikaiMismatchDetails = [];
const blockCountDetails = [];
const correctLabelDetails = [];
const wrongLabelDetails = [];

for (const row of newRows.slice(1)) {
  const id = row[colIdx['id']] || '';
  const correctIndex = parseInt(row[colIdx['correctIndex']] || '0');
  const seikai = row[colIdx['正答テキスト']] || '';
  const correctChoice = row[colIdx['choice' + correctIndex]] || '';
  const or = row[colIdx['optionRationales']] || '';
  const blocks = or.split(SEPARATOR);

  if (seikai !== correctChoice) {
    seikaiMismatch++;
    seikaiMismatchDetails.push({ id, correctIndex, seikai, correctChoice });
    console.error(`[ERROR] seikai_mismatch: ${id} correctIndex=${correctIndex}`);
    console.error(`  choice${correctIndex}: ${correctChoice.slice(0, 80)}`);
    console.error(`  正答テキスト: ${seikai.slice(0, 80)}`);
  }

  if (blocks.length !== 4) {
    blockCountViolation++;
    blockCountDetails.push({ id, count: blocks.length });
    console.error(`[ERROR] block_count: ${id} blocks=${blocks.length}`);
  }

  if (blocks.length >= correctIndex + 1 && !blocks[correctIndex].startsWith('正解。')) {
    correctLabelViolation++;
    correctLabelDetails.push({ id, correctIndex, label: blocks[correctIndex].slice(0, 60) });
    console.error(`[ERROR] correct_label_missing: ${id} correctIndex=${correctIndex} actual="${blocks[correctIndex].slice(0, 60)}"`);
  }

  if (blocks.length === 4) {
    for (let i = 0; i < 4; i++) {
      if (i !== correctIndex && !blocks[i].startsWith('誤り。')) {
        wrongLabelViolation++;
        wrongLabelDetails.push({ id, position: i, label: blocks[i].slice(0, 60) });
        console.error(`[ERROR] wrong_label_missing: ${id} position=${i} actual="${blocks[i].slice(0, 60)}"`);
      }
    }
  }

  // ch6-015 truncation check
  const textCells = [
    { col: 'choice0', val: row[colIdx['choice0']] || '' },
    { col: 'choice1', val: row[colIdx['choice1']] || '' },
    { col: 'choice2', val: row[colIdx['choice2']] || '' },
    { col: 'choice3', val: row[colIdx['choice3']] || '' },
    { col: '正答テキスト', val: seikai },
  ];
  for (const { col, val } of textCells) {
    if (/インスタンスセグメンテーショ$/.test(val)) {
      truncationViolation++;
      truncationDetails.push({ id, col });
      console.error(`[ERROR] truncation_ch6015: ${id} ${col}`);
    }
  }
}

// ---- Write fixes log ----
const chapterFixes = {};
const columnFixes = {};
for (const f of appliedFixes) {
  const ch = f.id.split('-')[0];
  chapterFixes[ch] = (chapterFixes[ch] || 0) + 1;
  columnFixes[f.column] = (columnFixes[f.column] || 0) + 1;
}

const targetIds = ['ch5-002', 'ch6-015', 'ch4-018', 'ch5-040', 'ch1-030', 'ch1-010', 'ch1-027', 'ch3-024', 'ch7-003', 'ch8-003', 'ch8-019'];
const fixedIds = [...new Set(appliedFixes.map(f => f.id))];

const fixesLines = [
  '# audit-step3b-one-best-answer-fixes.md',
  '',
  '## 修正件数',
  '',
  `合計: ${appliedFixes.length} 件（対象 ID: ${fixedIds.length} 件）`,
  '',
  '## 章別',
  '',
  ...Object.entries(chapterFixes).sort().map(([ch, n]) => `- ${ch}: ${n} 件`),
  '',
  '## カラム別',
  '',
  ...Object.entries(columnFixes).sort().map(([col, n]) => `- ${col}: ${n} 件`),
  '',
  '## 対象 ID 一覧',
  '',
  ...targetIds.map(id => `- ${id}: ${fixedIds.includes(id) ? '修正済み' : '変更なし'}`),
  '',
  '## 修正詳細',
  '',
];

for (const f of appliedFixes) {
  fixesLines.push(`### ${f.id} / ${f.column}`);
  fixesLines.push('');
  fixesLines.push('**before:**');
  fixesLines.push('```');
  fixesLines.push(f.before);
  fixesLines.push('```');
  fixesLines.push('');
  fixesLines.push('**after:**');
  fixesLines.push('```');
  fixesLines.push(f.after);
  fixesLines.push('```');
  fixesLines.push('');
}

writeFileSync(fixesLog, fixesLines.join('\n'), 'utf8');
console.log(`Written: ${fixesLog}`);

// ---- Write skipped.csv ----
writeFileSync(skippedCsv, 'id,column,reason,suggested_action\n', 'utf8');
console.log(`Written: ${skippedCsv}`);

// ---- Write validation log ----
const dataCount = newRows.length - 1;
const allPass = (seikaiMismatch + blockCountViolation + correctLabelViolation + wrongLabelViolation + truncationViolation) === 0;

const validationLines = [
  '# audit-step3b-validation.md',
  '',
  `検証日時: 2026-05-02`,
  `入力: questions-2026-05-02-step2b.csv`,
  `出力: questions-2026-05-02-step3b.csv`,
  `データ行数: ${dataCount}`,
  '',
  '## 完了条件チェック',
  '',
  `1. correctIndex 指定 choice と 正答テキスト の不一致: ${seikaiMismatch} 件 → ${seikaiMismatch === 0 ? 'PASS' : 'FAIL'}`,
  `2. optionRationales 4 件でない: ${blockCountViolation} 件 → ${blockCountViolation === 0 ? 'PASS' : 'FAIL'}`,
  `3. 正答 rationale が「正解。」で始まらない: ${correctLabelViolation} 件 → ${correctLabelViolation === 0 ? 'PASS' : 'FAIL'}`,
  `4. 誤答 rationale が「誤り。」で始まらない: ${wrongLabelViolation} 件 → ${wrongLabelViolation === 0 ? 'PASS' : 'FAIL'}`,
  `5. 修正対象 11 ID すべてに差分あり: ${fixedIds.length === 11 ? 'PASS' : 'FAIL'}（修正済み ${fixedIds.length} / 11 件）`,
  `6. ch6-015 途中切れ（「インスタンスセグメンテーショ」末尾）: ${truncationViolation} 件 → ${truncationViolation === 0 ? 'PASS' : 'FAIL'}`,
  '',
  `## 総合: ${allPass && fixedIds.length === 11 ? 'PASS' : 'FAIL'}`,
];

if (seikaiMismatchDetails.length > 0) {
  validationLines.push('');
  validationLines.push('### seikai_mismatch 詳細');
  for (const d of seikaiMismatchDetails) {
    validationLines.push(`- ${d.id}: correctIndex=${d.correctIndex}`);
    validationLines.push(`  choice${d.correctIndex}: ${d.correctChoice.slice(0, 80)}`);
    validationLines.push(`  正答テキスト: ${d.seikai.slice(0, 80)}`);
  }
}

writeFileSync(validationLog, validationLines.join('\n'), 'utf8');
console.log(`Written: ${validationLog}`);

// ---- Summary ----
console.log('\n===== Summary =====');
console.log(`Applied fixes: ${appliedFixes.length} (${fixedIds.length} IDs)`);
for (const f of appliedFixes) {
  console.log(`  [${f.id}] ${f.column}`);
}
console.log('\n===== Validation =====');
console.log(`1. seikai_mismatch:      ${seikaiMismatch} violations ${seikaiMismatch === 0 ? 'PASS' : 'FAIL'}`);
console.log(`2. block_count:          ${blockCountViolation} violations ${blockCountViolation === 0 ? 'PASS' : 'FAIL'}`);
console.log(`3. correct_label:        ${correctLabelViolation} violations ${correctLabelViolation === 0 ? 'PASS' : 'FAIL'}`);
console.log(`4. wrong_label:          ${wrongLabelViolation} violations ${wrongLabelViolation === 0 ? 'PASS' : 'FAIL'}`);
console.log(`5. all_11_ids_fixed:     ${fixedIds.length === 11 ? 'PASS' : 'FAIL'} (${fixedIds.length}/11)`);
console.log(`6. truncation_ch6015:    ${truncationViolation} violations ${truncationViolation === 0 ? 'PASS' : 'FAIL'}`);
const totalPass = allPass && fixedIds.length === 11;
console.log(`\nOverall: ${totalPass ? 'PASS' : 'FAIL'}`);
