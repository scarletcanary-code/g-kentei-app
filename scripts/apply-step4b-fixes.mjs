/**
 * apply-step4b-fixes.mjs
 * Step4b の修正を適用して questions-2026-05-02-step4b.csv を生成する
 * Usage: node scripts/apply-step4b-fixes.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 入出力パス
const INPUT_CSV = path.join(__dirname, '../../.harness/exports/questions-2026-05-02-step4.csv');
const OUTPUT_CSV = path.join(__dirname, '../../.harness/exports/questions-2026-05-02-step4b.csv');
const DIFF_CSV = path.join(__dirname, '../../.harness/runs/0070/audit-step4b-diff.csv');

// 対象カラム
const TARGET_COLUMNS = ['choice0', 'choice1', 'choice2', 'choice3', '正答テキスト', 'explanation', 'optionRationales'];

/**
 * RFC 4180 準拠 CSV パーサー
 */
function parseCsv(csvText) {
  const text = csvText.startsWith('﻿') ? csvText.slice(1) : csvText;
  const rows = [];
  let inQuote = false;
  let current = '';
  let row = [];

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (!inQuote) { inQuote = true; }
      else if (i + 1 < text.length && text[i + 1] === '"') { current += '"'; i++; }
      else { inQuote = false; }
    } else if (c === ',' && !inQuote) {
      row.push(current); current = '';
    } else if (c === '\n' && !inQuote) {
      row.push(current); current = '';
      rows.push(row); row = [];
    } else if (c === '\r') {
      // skip
    } else {
      current += c;
    }
  }
  if (current || row.length > 0) { row.push(current); rows.push(row); }

  const headers = rows[0].map(h => h.replace(/\r/g, ''));
  const dataRows = rows.slice(1).filter(r => r.some(v => v.trim() !== ''));
  const records = dataRows.map(r => {
    const rec = {};
    headers.forEach((h, i) => { rec[h] = (r[i] || '').replace(/\r/g, ''); });
    return rec;
  });
  return { headers, rows: records };
}

/**
 * CSV 出力用: フィールドをエスケープ
 */
function escapeField(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * 個別修正マップ
 * key: "id::column" → new value
 * 「→」の右が修正後。choice を修正したら 正答テキスト も別途管理
 */
const FIXES = {
  // ===== 完全消去対象 4件 =====
  // ch1-021 choice3: とされるとする説明
  'ch1-021::choice3':
    '強いAIは人間のように思考することができるという主張',

  // ch5-011 choice3: であるとされるという
  'ch5-011::choice3':
    '機械学習における強化学習の一種である',

  // ch5-015 choice2: であるとされるである
  'ch5-015::choice2':
    'VGGは主に画像セグメンテーションに特化したモデルである',

  // ch5-018 choice3: であるとされる・仕組み
  'ch5-018::choice3':
    'データの正規化を行うための手法である',

  // ===== 大幅削減対象 =====

  // --- という(文末) ---
  'ch1-002::choice3':
    'レベル4：深層学習AI',

  'ch1-014::choice3':
    '記号操作だけではなく、意味を理解することが可能である',

  'ch1-022::choice2':
    'AIが人間の知能を超えた後、急速に進化することを示す重要な概念である',

  'ch1-031::choice3':
    '特化型AI（特定の問題に特化したAI）',

  'ch1-034::choice2':
    '人工知能、弱いAI、知識ベース',

  'ch2-003::choice3':
    'ディープラーニング技術',

  'ch2-008::choice3':
    '第1次：探索・推論、第2次：機械学習、第3次：エキスパートシステム',

  'ch2-014::choice3':
    'スタートからゴールまでの経路を無視して探索を行うアルゴリズムである',

  'ch3-011::choice3':
    '適合率と再現率の合計',

  'ch3-038::choice2':
    '複数のモデルを独立に学習させ、最終的に平均を取る手法である',

  'ch4-004::choice3':
    '出力が0から1の範囲に収まり、分類問題に使われる手法である',

  'ch4-010::choice3':
    'tanh関数は画像処理に特化した技術であり、データの圧縮に利用される',

  'ch4-023::choice3':
    '活性化関数の一種である',

  'ch4-028::choice3':
    'ニューラルネットワークは、全てのデータを一度に処理する必要がある技術',

  'ch5-002::choice3':
    'データの次元を増加させ、詳細な特徴を強調する層',

  'ch5-006::choice3':
    '全てのデータを同じ重みで扱う手法にあたる',

  'ch5-020::choice3':
    '双方向RNNはデータを一方向に処理し、過去の情報だけを基に出力を生成する',

  'ch5-031::choice3':
    '異なるモデルを組み合わせて精度を向上させる方法である',

  'ch5-045::choice2':
    'CNNの層数は常に一定である',

  'ch7-003::choice3':
    'モデルの性能が常に安定することを示す',

  'ch7-014::choice3':
    '異なるアルゴリズムを用いて、データの処理速度を向上させるための手法である',

  // --- とする説明(文末) ---
  'ch1-004::choice0':
    'AIは無限の情報を処理できるため、問題解決が容易である',

  'ch1-004::choice3':
    'AIは特定の限られた状況でしか問題を解決できない',

  'ch1-008::choice3':
    '2050年にAIが人間と共存する未来を描いた',

  'ch1-014::choice1':
    'コンピュータは言語を真に理解する能力を持つ',

  'ch1-024::choice2':
    '知識表現：情報を整理し理解する手法',

  'ch2-001::choice3':
    '自然言語処理の進化',

  'ch2-006::choice3':
    'AIの進化は、主にクラウドサービスの普及によるものと考えられている',

  'ch2-029::choice3':
    '自然言語処理技術の発展がAIの実用化を加速させた背景',

  'ch3-005::choice0':
    'データを一度に全て分析する手法',

  'ch3-021::choice3':
    'ROC曲線は感度と特異度を一つの軸にとるグラフである',

  'ch3-022::choice1':
    'モデルの予測性能が十分に高い',

  'ch4-008::choice3':
    '勾配消失問題は、データの前処理が不十分な場合に発生するエラーの一種である',

  'ch4-013::choice3':
    'Leaky ReLU関数は、データの正規化を行うために設計された手法にあたる',

  'ch4-018::choice1':
    'XOR問題は単純パーセプトロンの出力が常に0になるため解けない技術である',

  'ch4-021::choice3':
    'RMSPropはデータのスパース性を考慮し、疎なデータに対して特に効果的な技術である',

  'ch4-022::choice0':
    '誤差逆伝播の過程で勾配が小さくなり、学習が進まなくなる問題である',

  'ch4-031::choice2':
    'データを圧縮し、情報を保存するための層にあたる',

  'ch4-033::choice2':
    '情報理論におけるエントロピーは、データの不確実性を測る指標である',

  'ch4-040::choice2':
    '同じ値で初期化した場合、出力層の活性化関数が影響を与えることがある',

  'ch5-022::choice1':
    'マルチヘッドアテンションは、単一のヘッドで注意を集中させる手法である',

  'ch5-036::choice2':
    'デコーダが入力シーケンスの全体を一度に処理する手法にあたる',

  'ch5-037::choice2':
    '最大プーリングは画像の色を強調し、平均プーリングは形状を重視する手法にあたる',

  'ch6-016::choice3':
    '物体検出において、YOLOは画像の特徴を抽出するために、深層学習を用いる手法である',

  'ch6-019::choice1':
    'モデルのパラメータを調整し、過去のデータを基に新しいタスクを学習させる手法である',

  'ch7-022::choice3':
    'データ分析において、視覚化が重要であることを示すものである',

  'ch8-009::choice0':
    'AIの公平性は、データの透明性を確保することが重要である',

  'ch8-014::choice3':
    'データを一元管理するためのシステムを構築する手法である',

  'ch8-015::choice3':
    'データの収集後にプライバシーを保護する技術にあたる',

  'ch8-020::choice3':
    'AIによる発明は特許の対象外であるが、著作権が適用される',

  // --- ・仕組み(文末) ---
  'ch1-026::choice3':
    '人間の感情を理解する能力',

  'ch3-016::choice3':
    '各モデルが独立して学習し、最終的に結果を平均化する手法',

  'ch3-026::choice3':
    'L1正則化はモデルの精度を高めるために使われ、L2正則化は特徴量を削減するために使う',

  'ch3-043::choice2':
    'モデルの複雑さを減少させるために、特徴量を削除する手法である',

  'ch4-024::choice3':
    'Softmax関数は多クラス分類において確率を出力するため、回帰問題に適用される',

  'ch8-007::choice3':
    '著作権法第30条の4は、著作物の利用に関する特例を設けている法律である',

  'ch8-024::choice2':
    'AIのアカウンタビリティは、データの収集方法と密接に関連する手法にあたる',

  'ch8-029::choice2':
    'AIが生成したコンテンツを商用利用する際、著作権者の利益を考慮しない行為が該当する',
};

// correctIndex が指す choice から 正答テキスト を同期する必要があるかのマップ
// (choice が修正されたとき、正答テキストも同じ値に直す)

const csvText = fs.readFileSync(INPUT_CSV, 'utf8');
const { headers, rows } = parseCsv(csvText);
console.log(`Parsed: ${rows.length} rows, ${headers.length} cols`);

const diffs = []; // { id, column, before, after }
const fixedRows = rows.map(row => {
  const id = row['id'];
  const newRow = { ...row };

  // 修正を適用
  for (const col of TARGET_COLUMNS) {
    const key = `${id}::${col}`;
    if (FIXES[key] !== undefined) {
      const before = newRow[col];
      const after = FIXES[key];
      if (before !== after) {
        diffs.push({ id, column: col, before, after });
        newRow[col] = after;
      }
    }
  }

  // correctIndex が指す choice と 正答テキスト の同期
  const ci = parseInt(newRow['correctIndex'], 10);
  if (!isNaN(ci) && ci >= 0 && ci <= 3) {
    const choiceCol = `choice${ci}`;
    const newChoiceVal = newRow[choiceCol];
    const currentAnswer = newRow['正答テキスト'];
    if (newChoiceVal !== currentAnswer) {
      // choice が修正された場合のみ正答テキストを更新
      const key = `${id}::${choiceCol}`;
      if (FIXES[key] !== undefined) {
        if (currentAnswer !== newChoiceVal) {
          diffs.push({ id, column: '正答テキスト', before: currentAnswer, after: newChoiceVal });
          newRow['正答テキスト'] = newChoiceVal;
        }
      }
    }
  }

  return newRow;
});

// 出力 CSV を生成
const outputLines = [
  headers.map(escapeField).join(','),
  ...fixedRows.map(row => headers.map(h => escapeField(row[h] || '')).join(','))
];
const outputText = '﻿' + outputLines.join('\n') + '\n';

fs.writeFileSync(OUTPUT_CSV, outputText, 'utf8');
console.log(`Output CSV: ${OUTPUT_CSV}`);

// diff CSV 生成
const diffLines = [
  'id,column,before,after',
  ...diffs.map(d => [d.id, d.column, d.before, d.after].map(escapeField).join(','))
];
const diffDir = path.dirname(DIFF_CSV);
if (!fs.existsSync(diffDir)) fs.mkdirSync(diffDir, { recursive: true });
fs.writeFileSync(DIFF_CSV, '﻿' + diffLines.join('\n') + '\n', 'utf8');
console.log(`Diff CSV: ${DIFF_CSV} (${diffs.length} changes)`);
