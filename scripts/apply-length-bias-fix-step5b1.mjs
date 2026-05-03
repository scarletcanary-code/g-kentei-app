/**
 * apply-length-bias-fix-step5b1.mjs
 *
 * 0077 Step5b-1 — 選択肢長さバイアス実修正（high / ratio>=2.5 限定）
 *
 * 入力:
 *   - .harness/exports/questions-2026-05-02-step4g.csv (BOM 付き UTF-8、ヘッダー + 292 行)
 *   - .harness/runs/0076/audit-step5a-length-bias-candidates.csv (監査候補)
 *
 * 出力:
 *   - .harness/exports/questions-2026-05-02-step5b1.csv (BOM 付き UTF-8、CRLF)
 *   - .harness/runs/0077/audit-step5b1-length-bias-fixes.md
 *   - .harness/runs/0077/audit-step5b1-validation.md
 *   - .harness/runs/0077/audit-step5b1-diff.csv (id,column,before,after)
 *   - g-kentei-app/tmp/step5b1-target-ids.json
 *
 * 対象抽出条件 (3 条件 AND):
 *   - 優先度 = high
 *   - max_min_ratio >= 2.5
 *   - correct_is_longest = true
 *
 * 修正方針:
 *   - correctIndex 不変
 *   - question / difficulty / tags / 章 不変
 *   - 正答が長すぎる場合は意味を保って簡潔化
 *   - 誤答が短すぎる場合は内容を保って自然に少し補強
 *   - 正答 choice を修正したら 正答テキスト も完全一致
 *   - explanation/optionRationales は最小修正
 *   - 目標: max_min_ratio <= 2.0 程度
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REPO_ROOT = path.join(__dirname, '../..');
const INPUT_PATH = path.join(REPO_ROOT, '.harness/exports/questions-2026-05-02-step4g.csv');
const AUDIT_PATH = path.join(REPO_ROOT, '.harness/runs/0076/audit-step5a-length-bias-candidates.csv');
const OUTPUT_PATH = path.join(REPO_ROOT, '.harness/exports/questions-2026-05-02-step5b1.csv');
const RUN_DIR = path.join(REPO_ROOT, '.harness/runs/0077');
const FIXES_MD_PATH = path.join(RUN_DIR, 'audit-step5b1-length-bias-fixes.md');
const VALIDATION_MD_PATH = path.join(RUN_DIR, 'audit-step5b1-validation.md');
const DIFF_CSV_PATH = path.join(RUN_DIR, 'audit-step5b1-diff.csv');
const TMP_DIR = path.join(__dirname, '../tmp');
const TARGET_IDS_JSON = path.join(TMP_DIR, 'step5b1-target-ids.json');

// ===== Step3 系 11+1 ID (correctIndex 不変必須) =====
const STEP3_GUARDED_IDS = [
  'ch5-002', 'ch6-015', 'ch4-018', 'ch5-040', 'ch1-030',
  'ch1-010', 'ch1-027', 'ch3-024', 'ch7-003', 'ch8-003', 'ch8-019',
];

// ===== 想定対象 ID (タスク仕様参考) =====
const EXPECTED_TARGET_IDS = [
  'ch1-015', 'ch1-017', 'ch1-025', 'ch1-035', 'ch2-022',
  'ch3-025', 'ch3-045', 'ch4-027', 'ch6-018', 'ch7-020',
  'ch7-029', 'ch8-003', 'ch8-005', 'ch8-009', 'ch8-027',
];

/* ===========================================================================
 * CSV パーサ / シリアライザ
 * ========================================================================= */

/** RFC 4180 CSV パーサ (BOM 自動除去) */
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
    else if (c === '\r' && !inQ) { /* skip CR (CRLF) */ }
    else cur += c;
  }
  if (cur.length > 0 || row.length > 0) { row.push(cur); rows.push(row); }
  return rows;
}

function csvEscape(value) {
  const v = value === null || value === undefined ? '' : String(value);
  if (v.includes(',') || v.includes('"') || v.includes('\n') || v.includes('\r')) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}

/** ヘッダ + 行配列を BOM 付き UTF-8、CRLF 改行で出力 */
function buildCsv(headers, dataRows) {
  const lines = [];
  lines.push(headers.map(csvEscape).join(','));
  for (const r of dataRows) {
    lines.push(headers.map((h) => csvEscape(r[h] ?? '')).join(','));
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}

function unicodeLen(s) {
  if (!s) return 0;
  return Array.from(s).length;
}

/* ===========================================================================
 * 修正定義
 * ----------------------------------------------------------------------------
 * 各 ID に対し、変更後の choice0/1/2/3、正答テキスト、必要なら
 * optionRationales / explanation / misconceptionTarget を指定。
 *
 * before は実行時に入力 CSV と突合して整合性を確認する。
 * ========================================================================= */

const FIXES = {
  // ------------------------------------------------------------------
  // ch1-015 (correctIndex=0, before lens=36/21/21/14, ratio=2.57)
  //   正答短縮 + 最短(c3)補強
  // ------------------------------------------------------------------
  'ch1-015': {
    choices: {
      0: { reason: '正答短縮（意味維持）。「知能は現実世界を物理的な「身体」を通じて環境と相互作用することで発達する」(36) → 「物理的な「身体」を通じて環境と相互作用することで知能が発達する」(31)' },
      3: { reason: '誤答が短すぎるため自然に補強。「知能は身体の存在に依存しない」(14) → 「知能の発達は身体の存在に依存しない」(17)' },
    },
    after: {
      choice0: '物理的な「身体」を通じて環境と相互作用することで知能が発達する',
      choice3: '知能の発達は身体の存在に依存しない',
      正答テキスト: '物理的な「身体」を通じて環境と相互作用することで知能が発達する',
      optionRationales: '正解。物理的な身体を通じて環境と相互作用することで知能が発達するから。 || 誤り。身体性の考え方は単なる環境との相互作用だけでなく、物理的な「身体」を通じた実体験が知能発達に不可欠であると主張している点が正答との違いである。 || 誤り。身体を持たないAIは知能を持つことができない。 || 誤り。知能の発達は身体の存在に依存するという考え方が主流である。',
    },
  },

  // ------------------------------------------------------------------
  // ch1-017 (correctIndex=0, before 38/15/15/15, ratio=2.53)
  // ------------------------------------------------------------------
  'ch1-017': {
    choices: {
      0: { reason: '正答短縮。「チェスやパズルのように条件が限定された問題で、現実の複雑な問題とは異なるもの」(38) → 「チェスやパズルのように条件が限定された単純な問題を扱うもの」(29)' },
      1: { reason: '誤答補強。「現実の問題を解決するための手法」(15) → 「現実の複雑な問題を解決するための実用手法」(20)' },
      2: { reason: '誤答補強。「複雑な状況を考慮した問題解決法」(15) → 「複雑で曖昧な状況を考慮した問題解決手法」(19)' },
      3: { reason: '誤答補強。「ルールが不明確な問題を扱う手法」(15) → 「ルールが不明確な問題を扱うAI技術」(17)' },
    },
    after: {
      choice0: 'チェスやパズルのように条件が限定された単純な問題を扱うもの',
      choice1: '現実の複雑な問題を解決するための実用手法',
      choice2: '複雑で曖昧な状況を考慮した問題解決手法',
      choice3: 'ルールが不明確な問題を扱うAI技術',
      正答テキスト: 'チェスやパズルのように条件が限定された単純な問題を扱うもの',
      optionRationales: '正解。トイ・プロブレムは条件が限定された単純な問題を指すから。 || 誤り。現実の複雑な問題に対応する実用手法ではなく、限定された問題を扱う。 || 誤り。トイ・プロブレムはシンプルな問題であり、複雑で曖昧な状況には対応しない。 || 誤り。ルールが不明確な問題ではなく、条件が明確な問題を扱う。',
    },
  },

  // ------------------------------------------------------------------
  // ch1-025 (correctIndex=3, before 12/13/14/31, ratio=2.58)
  // 誤答 3 つを揃え、正答を短縮
  // ------------------------------------------------------------------
  'ch1-025': {
    choices: {
      0: { reason: '誤答補強。「自動で掃除を行うロボット」(12) → 「自動で部屋を掃除する学習機能つきロボット」(20)' },
      1: { reason: '誤答補強。「音声で指示を受ける家電製品」(13) → 「音声指示で家電を制御するスマート家電製品」(20)' },
      2: { reason: '誤答補強。「温度を測定するだけのセンサー」(14) → 「温度を測定し記録するだけの単機能センサー」(20)' },
      3: { reason: '正答短縮。「室温が設定値より高い場合にエアコンの冷房をオンにする温度調節器」(31) → 「室温が設定値より高ければ冷房をオンにする温度調節器」(25)' },
    },
    after: {
      choice0: '自動で部屋を掃除する学習機能つきロボット',
      choice1: '音声指示で家電を制御するスマート家電製品',
      choice2: '温度を測定し記録するだけの単機能センサー',
      choice3: '室温が設定値より高ければ冷房をオンにする温度調節器',
      正答テキスト: '室温が設定値より高ければ冷房をオンにする温度調節器',
      optionRationales: '誤り。学習機能つきの自動掃除ロボットはレベル2に該当する。 || 誤り。音声指示で動作するスマート家電は学習機能を含むためレベル2。 || 誤り。温度を記録するセンサーは単独では制御プログラムではない。 || 正解。エアコンの温度調節器は単純な条件分岐で動作するレベル1の典型例。',
    },
  },

  // ------------------------------------------------------------------
  // ch1-035 (correctIndex=3, before 23/22/29/59, ratio=2.68)
  //   ※ Step3 系ガード ID。correctIndex=3 を維持。
  // ------------------------------------------------------------------
  'ch1-035': {
    choices: {
      0: { reason: '誤答補強。「チューリングテストは機械の知能を測る手法である」(23) → 「チューリングテストは機械の知能を測る代表的な手法である」(26)' },
      1: { reason: '誤答補強。「中国語の部屋は機械の意識を証明する実験である」(22) → 「中国語の部屋は機械が意識を持つことを証明する実験である」(26)' },
      3: { reason: '正答短縮。「チューリングテストに合格できる機械でも真の意味理解（意識）を持つとは限らないという批判を『中国語の部屋』として提示した」(59) → 「中国語の部屋は、テストに合格できる機械でも真の意味理解を持つとは限らないという批判である」(44)' },
    },
    after: {
      choice0: 'チューリングテストは機械の知能を測る代表的な手法である',
      choice1: '中国語の部屋は機械が意識を持つことを証明する実験である',
      choice3: '中国語の部屋は、テストに合格できる機械でも真の意味理解を持つとは限らないという批判である',
      正答テキスト: '中国語の部屋は、テストに合格できる機械でも真の意味理解を持つとは限らないという批判である',
      optionRationales: '誤り。チューリングテスト単体の説明であり、『中国語の部屋』がチューリングテストへの批判として位置づけられる点を説明していない。 || 誤り。中国語の部屋は意識の存在を証明するものではなく、知識の模倣に過ぎないことを示す思考実験である。 || 誤り。チューリングテストは人間の思考を模倣する試験ではなく、知能の判定である。 || 正解。中国語の部屋はチューリングテスト合格でも真の意味理解を持つとは限らないことを示す批判である。',
    },
  },

  // ------------------------------------------------------------------
  // ch2-022 (correctIndex=3, before 18/17/19/43, ratio=2.53)
  // ------------------------------------------------------------------
  'ch2-022': {
    choices: {
      0: { reason: '誤答補強。「探索の過程で無関係な情報が増えるから」(18) → 「探索の過程で無関係な情報が増えてしまうから」(21)' },
      1: { reason: '誤答補強。「問題の複雑さが計算を難しくするから」(17) → 「問題そのものの複雑さが計算を難しくするから」(21)' },
      2: { reason: '誤答補強。「選択肢が多すぎて計算が追いつかないため」(19) → 「選択肢が多すぎて計算機の処理が追いつかないため」(23)' },
      3: { reason: '正答短縮。「ゲームや迷路などの問題では、手を進めるごとに考えられる状態数が指数関数的に増加するため」(43) → 「ゲームや迷路で手を進めるごとに状態数が指数関数的に増加するため」(31)' },
    },
    after: {
      choice0: '探索の過程で無関係な情報が増えてしまうから',
      choice1: '問題そのものの複雑さが計算を難しくするから',
      choice2: '選択肢が多すぎて計算機の処理が追いつかないため',
      choice3: 'ゲームや迷路で手を進めるごとに状態数が指数関数的に増加するため',
      正答テキスト: 'ゲームや迷路で手を進めるごとに状態数が指数関数的に増加するため',
      optionRationales: '誤り。無関係な情報の増加は組み合わせ爆発の原因ではない。 || 誤り。問題そのものの複雑さは影響するが、組み合わせ爆発の本質ではない。 || 誤り。選択肢の多さや計算機の処理速度は影響するが、根本的な理由ではない。 || 正解。手を進めるごとに状態数が指数関数的に増加するため。',
    },
  },

  // ------------------------------------------------------------------
  // ch3-025 (correctIndex=2, before 16/16/35/14, ratio=2.50)
  // ------------------------------------------------------------------
  'ch3-025': {
    choices: {
      0: { reason: '誤答補強。「回帰モデルの精度を示す指標である」(16) → 「回帰モデルの予測誤差の大きさを示す指標である」(22)' },
      1: { reason: '誤答補強。「データの相関関係を示す指標である」(16) → 「2つの変数間の相関関係の強さを示す指標である」(22)' },
      2: { reason: '正答短縮。「回帰モデルがデータの分散をどれだけ説明できるかを0〜1の範囲で示す指標」(35) → 「回帰モデルがデータの分散をどれだけ説明できるかを示す指標」(28)' },
      3: { reason: '誤答補強。「回帰分析の結果を評価する指標」(14) → 「回帰分析の結果を総合的に評価する分類指標」(20)' },
    },
    after: {
      choice0: '回帰モデルの予測誤差の大きさを示す指標である',
      choice1: '2つの変数間の相関関係の強さを示す指標である',
      choice2: '回帰モデルがデータの分散をどれだけ説明できるかを示す指標',
      choice3: '回帰分析の結果を総合的に評価する分類指標',
      正答テキスト: '回帰モデルがデータの分散をどれだけ説明できるかを示す指標',
      optionRationales: '誤り。決定係数は予測誤差の大きさそのものではなく、モデルの説明力を示す指標である。 || 誤り。2変数間の相関関係を示すのは相関係数であり、決定係数とは異なる。 || 正解。回帰モデルがデータの分散をどれだけ説明できるかを示す指標だから。 || 誤り。決定係数は分類用の指標ではなく、回帰モデルの説明力を示す指標である。',
    },
  },

  // ------------------------------------------------------------------
  // ch3-045 (correctIndex=3, before 37/32/32/80, ratio=2.50)
  // ------------------------------------------------------------------
  'ch3-045': {
    choices: {
      0: { reason: '誤答短縮（不自然な末尾を削除）。「不均衡なデータを削除して均等なデータセットにするに関連する技術・理論の説明」(37) → 「不均衡なデータを一律に削除して均等なデータセットにする」(27)' },
      1: { reason: '誤答短縮。「あらゆる問題はディープラーニングだけで解決できるとする誤った見方」(32) → 「あらゆる問題はディープラーニングだけで解決できるとする見方」(29)' },
      3: { reason: '正答短縮。「少数クラスのオーバーサンプリング（SMOTE等）や多数クラスのアンダーサンプリング、あるいはF値やAUCなどクラス不均衡に適した評価指標を用いることが有効である」(80) → 「少数クラスのオーバーサンプリングや多数クラスのアンダーサンプリング、F値やAUCなど適した指標を用いる」(51)' },
    },
    after: {
      choice0: '不均衡なデータを一律に削除して均等なデータセットにする',
      choice1: 'あらゆる問題はディープラーニングだけで解決できるとする見方',
      choice3: '少数クラスのオーバーサンプリングや多数クラスのアンダーサンプリング、F値やAUCなど適した指標を用いる',
      正答テキスト: '少数クラスのオーバーサンプリングや多数クラスのアンダーサンプリング、F値やAUCなど適した指標を用いる',
      optionRationales: '誤り。不均衡なデータを一律に削除すると情報損失が生じ、少数クラスの学習が困難になる。 || 誤り。ディープラーニングだけではなく、サンプリングや評価指標の工夫が有効である。 || 誤り。精度だけでは不均衡問題を評価できず、F値やAUCが重要である。 || 正解。少数クラスのオーバーサンプリングやアンダーサンプリング、F値やAUCの活用が有効だから。',
    },
  },

  // ------------------------------------------------------------------
  // ch4-027 (correctIndex=2, before 27/29/45/18, ratio=2.50)
  // ------------------------------------------------------------------
  'ch4-027': {
    choices: {
      0: { reason: '誤答微調整。「学習率を固定し、全てのエポックで同じ値を使う手法である」(27) → 「学習率を固定し、全エポックで同じ値を使い続ける手法である」(28)' },
      1: { reason: '誤答微調整。「学習の初期段階で学習率を下げ、終盤で上げることを目的とする」(29) は不変、ratio 改善のため微調整なしでも可' },
      2: { reason: '正答短縮。「学習の進行に応じて学習率を動的に変化させることで、初期は大きく探索し終盤は細かく収束させる」(45) → 「学習の進行に応じて学習率を動的に変化させ、初期は探索し終盤は収束させる」(35)' },
      3: { reason: '誤答補強。「データの前処理を行うための手法である」(18) → 「学習前にデータの前処理を一括で行うための手法である」(24)' },
    },
    after: {
      choice0: '学習率を固定し、全エポックで同じ値を使い続ける手法である',
      choice2: '学習の進行に応じて学習率を動的に変化させ、初期は探索し終盤は収束させる',
      choice3: '学習前にデータの前処理を一括で行うための手法である',
      正答テキスト: '学習の進行に応じて学習率を動的に変化させ、初期は探索し終盤は収束させる',
      optionRationales: '誤り。学習率を固定する手法ではないため。 || 誤り。学習率を下げるのは終盤であり、初期に大きく探索することが一般的である。 || 正解。学習率を動的に変化させることで、探索と収束を最適化するから。 || 誤り。データ前処理とは関係がない手法であるため。',
    },
  },

  // ------------------------------------------------------------------
  // ch6-018 (correctIndex=2, before 27/20/55/25, ratio=2.75)
  // ------------------------------------------------------------------
  'ch6-018': {
    choices: {
      0: { reason: '誤答微調整。「BERTは文脈を考慮した単語の埋め込みを行う手法である」(27) → 「BERTのように文脈を考慮した単語の埋め込みを行う手法である」(30)' },
      1: { reason: '誤答補強。「T5は主に画像処理に特化したモデルである」(20) → 「T5は主に画像処理に特化したマルチモーダルモデルである」(27)' },
      2: { reason: '正答短縮。「翻訳・要約・分類などあらゆるNLPタスクを「テキストを入力してテキストを出力する」統一フォーマットで解くモデル」(55) → 「あらゆるNLPタスクをテキスト入力からテキスト出力する形式で統一して解くモデル」(39)' },
      3: { reason: '誤答微調整。「RNNは時系列データを扱うための基本的な手法である」(25) → 「RNNのように時系列データを扱うための基本的な手法である」(28)' },
    },
    after: {
      choice0: 'BERTのように文脈を考慮した単語の埋め込みを行う手法である',
      choice1: 'T5は主に画像処理に特化したマルチモーダルモデルである',
      choice2: 'あらゆるNLPタスクをテキスト入力からテキスト出力する形式で統一して解くモデル',
      choice3: 'RNNのように時系列データを扱うための基本的な手法である',
      正答テキスト: 'あらゆるNLPタスクをテキスト入力からテキスト出力する形式で統一して解くモデル',
      optionRationales: '誤り。BERTは文脈を考慮した単語の埋め込みを行う手法であるが、T5の特徴ではない。 || 誤り。T5は自然言語処理に特化したモデルであり、画像処理に特化していない。 || 正解。T5はあらゆるNLPタスクをテキスト入出力の統一形式で解くモデルである。 || 誤り。RNNは時系列データを扱う手法であり、T5とはアプローチが異なる。',
    },
  },

  // ------------------------------------------------------------------
  // ch7-020 (correctIndex=2, before 20/32/64/24, ratio=3.20)
  // ------------------------------------------------------------------
  'ch7-020': {
    choices: {
      0: { reason: '誤答補強。「自動車の運転支援を目的とする機械学習技術」(20) → 「自動車の自動運転を支援することを目的とする機械学習技術」(26)' },
      2: { reason: '正答短縮。「データの前処理・特徴量エンジニアリング・アルゴリズム選択・ハイパーパラメータ調整といった機械学習の構築プロセスを自動化する技術。」(64) → 「前処理や特徴量エンジニアリング、アルゴリズム選択、ハイパーパラメータ調整を自動化する技術」(43)' },
      3: { reason: '誤答補強。「強化学習でロボットの動作だけを自動学習させる技術」(24) → 「強化学習でロボットの動作だけを自動学習させる専用の技術」(26)' },
    },
    after: {
      choice0: '自動車の自動運転を支援することを目的とする機械学習技術',
      choice2: '前処理や特徴量エンジニアリング、アルゴリズム選択、ハイパーパラメータ調整を自動化する技術',
      choice3: '強化学習でロボットの動作だけを自動学習させる専用の技術',
      正答テキスト: '前処理や特徴量エンジニアリング、アルゴリズム選択、ハイパーパラメータ調整を自動化する技術',
      optionRationales: '誤り。自動運転支援に関する技術ではない。 || 誤り。AutoMLはモデルのデプロイ自動化ではなく、機械学習の構築プロセス全体の自動化を目的とする技術である。 || 正解。データ前処理や特徴量エンジニアリングなどを自動化する技術だから。 || 誤り。強化学習やロボット動作専用の技術ではなく、機械学習全般を自動化する技術である。',
    },
  },

  // ------------------------------------------------------------------
  // ch7-029 (correctIndex=3, before 23/24/18/46, ratio=2.56)
  // ------------------------------------------------------------------
  'ch7-029': {
    choices: {
      2: { reason: '誤答補強。「データの前処理を自動化する技術である」(18) → 「データの前処理や変換を自動化する技術である」(21)' },
      3: { reason: '正答短縮。「モデルのバージョン管理・系統追跡（どのデータで何時学習したか）・本番デプロイ状態の把握が可能」(46) → 「モデルのバージョン管理と系統追跡を行い、本番デプロイ状態の把握を可能にする」(37)' },
    },
    after: {
      choice2: 'データの前処理や変換を自動化する技術である',
      choice3: 'モデルのバージョン管理と系統追跡を行い、本番デプロイ状態の把握を可能にする',
      正答テキスト: 'モデルのバージョン管理と系統追跡を行い、本番デプロイ状態の把握を可能にする',
      optionRationales: '誤り。モデルのトレーニングデータ管理に関する説明ではない。 || 誤り。モデルのパフォーマンス評価指標ではなく、管理手法に関する説明。 || 誤り。データ前処理や変換の自動化技術ではなく、モデル管理に関する説明。 || 正解。モデルのバージョン管理や系統追跡が可能だから。',
    },
  },

  // ------------------------------------------------------------------
  // ch8-003 (correctIndex=1, before 43/65/46/19, ratio=3.42)
  //   ※ Step3 系ガード ID。correctIndex=1 を維持。
  // ------------------------------------------------------------------
  'ch8-003': {
    choices: {
      0: { reason: '誤答短縮。「AIのリスクレベルを「高リスク」「中リスク」「低リスク」の3段階に分け、義務を設定する」(43) → 「AIのリスクを「高リスク」「中リスク」「低リスク」の3段階に分け義務を設定する」(39)' },
      1: { reason: '正答短縮。「AIのリスクレベルを「許容できないリスク」「高リスク」「限定的リスク」「最小限のリスク」の4段階に分類し、リスクに応じた義務を課す」(65) → 「AIを「許容できないリスク」「高リスク」「限定的リスク」「最小限のリスク」の4段階に分類し義務を課す」(49)' },
      2: { reason: '誤答短縮。「AIのリスクを「許容できないリスク」「高リスク」の2段階に分類し、特定の義務を課すものである」(46) → 「AIのリスクを「許容できないリスク」「高リスク」の2段階に分類し義務を課す」(36)' },
      3: { reason: '誤答補強。「すべてのAIシステムに同一の義務を課す」(19) → 「すべてのAIシステムに対して同一の義務を一律に課す」(25)' },
    },
    after: {
      choice0: 'AIのリスクを「高リスク」「中リスク」「低リスク」の3段階に分け義務を設定する',
      choice1: 'AIを「許容できないリスク」「高リスク」「限定的リスク」「最小限のリスク」の4段階に分類し義務を課す',
      choice2: 'AIのリスクを「許容できないリスク」「高リスク」の2段階に分類し義務を課す',
      choice3: 'すべてのAIシステムに対して同一の義務を一律に課す',
      正答テキスト: 'AIを「許容できないリスク」「高リスク」「限定的リスク」「最小限のリスク」の4段階に分類し義務を課す',
      optionRationales: '誤り。EU AI法のリスク分類は4段階であり、3段階（高・中・低）ではない。 || 正解。EU AI法はリスクベースアプローチを採用し、AIを4段階に分類してリスクに応じた義務を課す。 || 誤り。EU AI法のリスク分類は2段階ではなく4段階に分かれている。 || 誤り。EU AI法はリスクレベルに応じて異なる義務を課すリスクベースアプローチであり、一律規制ではない。',
    },
  },

  // ------------------------------------------------------------------
  // ch8-005 (correctIndex=1, before 16/44/21/20, ratio=2.75)
  // ------------------------------------------------------------------
  'ch8-005': {
    choices: {
      0: { reason: '誤答補強。「自動運転車の安全性を確保する技術」(16) → 「自動運転車の安全性を確保するための運転支援技術」(23)' },
      1: { reason: '正答短縮。「医療診断・融資審査・採用選考など、AIの判断が人の生命・権利・機会に影響する高リスク領域」(44) → 「医療診断や融資審査、採用選考など人の生命や権利に影響する高リスク領域」(34)' },
      2: { reason: '誤答補強。「データ分析に基づくマーケティング手法である」(21) → 「データ分析に基づくマーケティング戦略の立案手法」(23)' },
      3: { reason: '誤答補強。「AIによる画像認識の精度向上に関する技術」(20) → 「AIによる画像認識の精度向上を目指す研究分野」(22)' },
    },
    after: {
      choice0: '自動運転車の安全性を確保するための運転支援技術',
      choice1: '医療診断や融資審査、採用選考など人の生命や権利に影響する高リスク領域',
      choice2: 'データ分析に基づくマーケティング戦略の立案手法',
      choice3: 'AIによる画像認識の精度向上を目指す研究分野',
      正答テキスト: '医療診断や融資審査、採用選考など人の生命や権利に影響する高リスク領域',
      optionRationales: '誤り。自動運転車の安全性確保は重要だが、XAIの本質的な特性を示していない。 || 正解。医療診断や融資審査は人の生命や権利に影響するため、XAIが特に重要視される。 || 誤り。マーケティング手法はXAIの重要性を示すものではない。 || 誤り。画像認識の精度向上自体は重要だが、XAIの核心ではない。',
    },
  },

  // ------------------------------------------------------------------
  // ch8-009 (correctIndex=1, before 28/62/37/19, ratio=3.26)
  // ------------------------------------------------------------------
  'ch8-009': {
    choices: {
      0: { reason: '誤答補強。「AIの公平性は、データの透明性を確保することが重要である」(28) → 「AIの公平性は、データの透明性と監査体制を確保することが最重要である」(33)' },
      1: { reason: '正答短縮。「学習データに含まれる社会的偏見や不均衡（特定の性別・人種の過少代表など）がモデルに引き継がれ、差別的な判断を行う可能性がある」(62) → 「学習データに含まれる社会的偏見や不均衡がモデルに引き継がれ差別的判断を行う可能性」(40)' },
      2: { reason: '誤答短縮。「AIの公平性は、特定のデータセットを使用することで常に達成されるものである」(37) → 「AIの公平性は、特定のデータセットを使用すれば常に達成されるものである」(35)' },
      3: { reason: '誤答補強。「AIが公平な判断を行うための基準である」(19) → 「AIが公平な判断を行うために定められた共通の倫理基準である」(28)' },
    },
    after: {
      choice0: 'AIの公平性は、データの透明性と監査体制を確保することが最重要である',
      choice1: '学習データに含まれる社会的偏見や不均衡がモデルに引き継がれ差別的判断を行う可能性',
      choice2: 'AIの公平性は、特定のデータセットを使用すれば常に達成されるものである',
      choice3: 'AIが公平な判断を行うために定められた共通の倫理基準である',
      正答テキスト: '学習データに含まれる社会的偏見や不均衡がモデルに引き継がれ差別的判断を行う可能性',
      optionRationales: '誤り。データの透明性や監査体制は重要だが、公平性の核心は学習データのバイアスである。 || 正解。学習データに含まれる社会的偏見がモデルに引き継がれる可能性があるから。 || 誤り。特定のデータセットだけでは公平性は保証されない。 || 誤り。倫理基準そのものではなく、実際のデータに基づく問題である。',
    },
  },

  // ------------------------------------------------------------------
  // ch8-027 (correctIndex=3, before 28/26/20/55, ratio=2.75)
  // ------------------------------------------------------------------
  'ch8-027': {
    choices: {
      0: { reason: '誤答補強。「AIプロファイリングによるデータ収集を拒否する権利がある」(28) → 「AIプロファイリングによるデータ収集を一律に拒否する権利がある」(30)' },
      1: { reason: '誤答補強。「自動処理による意思決定の透明性を求める権利が存在する」(26) → 「自動処理による意思決定の透明性を求める一般的な権利が存在する」(29)' },
      2: { reason: '誤答補強。「個人情報の利用に関する同意を撤回する権利」(20) → 「個人情報の利用に関する同意をいつでも撤回できる権利」(25)' },
      3: { reason: '正答短縮。「本人の法的効果や重大な影響を及ぼす決定が自動処理（AIプロファイリング）のみによってなされることを拒否する権利」(55) → 「本人の法的効果や重大な影響を及ぼす決定が自動処理のみによってなされることを拒否する権利」(43)' },
    },
    after: {
      choice0: 'AIプロファイリングによるデータ収集を一律に拒否する権利がある',
      choice1: '自動処理による意思決定の透明性を求める一般的な権利が存在する',
      choice2: '個人情報の利用に関する同意をいつでも撤回できる権利',
      choice3: '本人の法的効果や重大な影響を及ぼす決定が自動処理のみによってなされることを拒否する権利',
      正答テキスト: '本人の法的効果や重大な影響を及ぼす決定が自動処理のみによってなされることを拒否する権利',
      optionRationales: '誤り。AIプロファイリングによるデータ収集を一律に拒否する権利は規定されていない。 || 誤り。自動処理の透明性を求める一般的権利はあるが、本問の中心ではない。 || 誤り。同意の撤回権は存在するが、AIプロファイリングに特化した権利ではない。 || 正解。GDPR第22条により、重大な影響を及ぼす決定が自動処理のみで行われることを拒否する権利がある。',
    },
  },
};

/* ===========================================================================
 * メイン
 * ========================================================================= */

function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    console.error(`ERROR: Input not found: ${INPUT_PATH}`);
    process.exit(1);
  }
  if (!fs.existsSync(AUDIT_PATH)) {
    console.error(`ERROR: Audit not found: ${AUDIT_PATH}`);
    process.exit(1);
  }
  if (!fs.existsSync(RUN_DIR)) fs.mkdirSync(RUN_DIR, { recursive: true });
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

  // ---------- 1. 監査 CSV から 3 条件で対象 ID 抽出 ----------
  const auditText = fs.readFileSync(AUDIT_PATH, 'utf8');
  const auditRows = parseCsv(auditText);
  const auditHeaders = auditRows[0];
  const auditDataRows = auditRows.slice(1).filter((r) => r.some((v) => v && v.trim() !== ''));
  const idIdx = auditHeaders.indexOf('id');
  const ratioIdx = auditHeaders.indexOf('max_min_ratio');
  const longestIdx = auditHeaders.indexOf('correct_is_longest');
  const prioIdx = auditHeaders.indexOf('優先度');
  if (idIdx < 0 || ratioIdx < 0 || longestIdx < 0 || prioIdx < 0) {
    console.error('ERROR: 監査 CSV に必要な列が見つからない');
    process.exit(1);
  }
  const targetIds = [];
  for (const r of auditDataRows) {
    const id = r[idIdx];
    const ratio = parseFloat(r[ratioIdx]);
    const longest = r[longestIdx];
    const prio = r[prioIdx];
    if (prio === 'high' && ratio >= 2.5 && longest === 'true') {
      targetIds.push({ id, ratio });
    }
  }
  console.log(`機械抽出 対象 ID: ${targetIds.length} 件`);
  fs.writeFileSync(TARGET_IDS_JSON, JSON.stringify(targetIds, null, 2), 'utf8');

  // 想定 ID との突合
  const extractedSet = new Set(targetIds.map((t) => t.id));
  const expectedSet = new Set(EXPECTED_TARGET_IDS);
  const onlyInExtracted = [...extractedSet].filter((x) => !expectedSet.has(x));
  const onlyInExpected = [...expectedSet].filter((x) => !extractedSet.has(x));
  const mismatchSummary = {
    extractedCount: targetIds.length,
    expectedCount: EXPECTED_TARGET_IDS.length,
    onlyInExtracted,
    onlyInExpected,
    matched: onlyInExtracted.length === 0 && onlyInExpected.length === 0,
  };
  console.log('想定 ID との突合:', mismatchSummary);

  // ---------- 2. 入力 CSV ロード ----------
  const csvText = fs.readFileSync(INPUT_PATH, 'utf8');
  const rawRows = parseCsv(csvText);
  const headers = rawRows[0].map((h) => h.replace(/\r/g, ''));
  const dataRowsArr = rawRows.slice(1).filter((r) => r.some((v) => v && v.trim() !== ''));
  const dataRows = dataRowsArr.map((r) => {
    const o = {};
    headers.forEach((h, i) => { o[h] = r[i] !== undefined ? r[i].replace(/\r/g, '') : ''; });
    return o;
  });
  console.log(`入力 CSV: ${dataRows.length} 行, ${headers.length} 列`);
  if (dataRows.length !== 292) {
    console.error(`ERROR: expected 292 rows, got ${dataRows.length}`);
    process.exit(1);
  }

  // FIXES に対象 ID 全てが定義されているか確認
  for (const t of targetIds) {
    if (!FIXES[t.id]) {
      console.error(`ERROR: FIXES に対象 ID 定義がない: ${t.id}`);
      process.exit(1);
    }
  }

  // ---------- 3. 修正前 ratio 計測 ----------
  const beforeMetrics = {};
  for (const t of targetIds) {
    const row = dataRows.find((r) => r.id === t.id);
    const lens = [0, 1, 2, 3].map((i) => unicodeLen(row[`choice${i}`]));
    const correctIdx = parseInt(row.correctIndex, 10);
    const maxL = Math.max(...lens);
    const minL = Math.min(...lens);
    const ratio = minL > 0 ? maxL / minL : Infinity;
    beforeMetrics[t.id] = {
      lens,
      correctIdx,
      ratio,
      correctIsLongest: lens[correctIdx] === maxL,
    };
  }

  // ---------- 4. 修正適用 ----------
  const diffs = []; // {id, column, before, after}
  const fixDetails = {}; // id -> [{column, before, after, before_length, after_length, reason}]
  let mutationCount = 0;

  for (const row of dataRows) {
    const id = row.id;
    const fix = FIXES[id];
    if (!fix) continue;
    const detailsForId = [];

    // どの列を変更するか: after オブジェクトのキー
    for (const [col, newVal] of Object.entries(fix.after)) {
      const before = row[col];
      if (before === newVal) continue; // 変更なしならスキップ
      diffs.push({ id, column: col, before, after: newVal });
      const beforeLen = unicodeLen(before);
      const afterLen = unicodeLen(newVal);
      let reason = '';
      // choice0..3 の場合、fix.choices の reason を使う
      const m = col.match(/^choice([0-3])$/);
      if (m) {
        const idx = parseInt(m[1], 10);
        if (fix.choices && fix.choices[idx] && fix.choices[idx].reason) {
          reason = fix.choices[idx].reason;
        }
      } else if (col === '正答テキスト') {
        reason = '正答 choice 修正に伴い 正答テキスト を完全一致させる';
      } else if (col === 'optionRationales') {
        reason = 'choice 内容変更に伴い rationale を整合的に更新（「正解。」「誤り。」始まり維持、 || 区切り維持）';
      }
      detailsForId.push({ column: col, before, after: newVal, before_length: beforeLen, after_length: afterLen, reason });
      row[col] = newVal;
      mutationCount++;
    }
    fixDetails[id] = detailsForId;
  }

  console.log(`Applied ${mutationCount} cell modifications across ${Object.keys(fixDetails).length} IDs`);

  // ---------- 5. 修正後 ratio 計測 + 完了条件検証 ----------
  const afterMetrics = {};
  for (const t of targetIds) {
    const row = dataRows.find((r) => r.id === t.id);
    const lens = [0, 1, 2, 3].map((i) => unicodeLen(row[`choice${i}`]));
    const correctIdx = parseInt(row.correctIndex, 10);
    const maxL = Math.max(...lens);
    const minL = Math.min(...lens);
    const ratio = minL > 0 ? maxL / minL : Infinity;
    afterMetrics[t.id] = {
      lens,
      correctIdx,
      ratio,
      correctIsLongest: lens[correctIdx] === maxL,
    };
  }

  // ---------- 6. 出力 CSV 書き出し ----------
  const outCsv = buildCsv(headers, dataRows);
  fs.writeFileSync(OUTPUT_PATH, outCsv, 'utf8');
  console.log(`Wrote ${OUTPUT_PATH}`);

  // ---------- 7. diff CSV 書き出し ----------
  const diffLines = ['id,column,before,after'];
  for (const d of diffs) {
    diffLines.push([d.id, d.column, d.before, d.after].map(csvEscape).join(','));
  }
  fs.writeFileSync(DIFF_CSV_PATH, diffLines.join('\n') + '\n', 'utf8');
  console.log(`Wrote ${DIFF_CSV_PATH}`);

  // ---------- 8. 完了条件 7 種を機械検証 ----------
  // 入力 CSV を再パース（生データを保持するため）
  const inputRowsObj = parseCsv(fs.readFileSync(INPUT_PATH, 'utf8'));
  const inputHeaders = inputRowsObj[0].map((h) => h.replace(/\r/g, ''));
  const inputDataRows = inputRowsObj.slice(1).filter((r) => r.some((v) => v && v.trim() !== '')).map((r) => {
    const o = {};
    inputHeaders.forEach((h, i) => { o[h] = r[i] !== undefined ? r[i].replace(/\r/g, '') : ''; });
    return o;
  });
  // 出力 CSV を再パース
  const outRowsObj = parseCsv(fs.readFileSync(OUTPUT_PATH, 'utf8'));
  const outHeaders = outRowsObj[0].map((h) => h.replace(/\r/g, ''));
  const outDataRows = outRowsObj.slice(1).filter((r) => r.some((v) => v && v.trim() !== '')).map((r) => {
    const o = {};
    outHeaders.forEach((h, i) => { o[h] = r[i] !== undefined ? r[i].replace(/\r/g, '') : ''; });
    return o;
  });

  const targetSetIds = new Set(targetIds.map((t) => t.id));

  // 条件 1: 修正対象は 3 条件 ID のみ（対象外で対象 7 列の diff = 0）
  const TARGET_COLS = ['choice0', 'choice1', 'choice2', 'choice3', '正答テキスト', 'explanation', 'optionRationales'];
  let cond1Violations = [];
  for (let i = 0; i < inputDataRows.length; i++) {
    const inRow = inputDataRows[i];
    const outRow = outDataRows[i];
    if (inRow.id !== outRow.id) {
      cond1Violations.push(`行 ${i + 1}: id 不一致 in=${inRow.id} out=${outRow.id}`);
      continue;
    }
    if (targetSetIds.has(inRow.id)) continue;
    for (const c of TARGET_COLS) {
      if (inRow[c] !== outRow[c]) {
        cond1Violations.push(`${inRow.id}.${c} に対象外 diff`);
      }
    }
  }
  const cond1 = cond1Violations.length === 0;

  // 条件 2: correctIndex 指定 choice == 正答テキスト (全 292 行)
  let cond2Violations = [];
  for (const r of outDataRows) {
    const ci = parseInt(r.correctIndex, 10);
    if (r[`choice${ci}`] !== r['正答テキスト']) {
      cond2Violations.push(`${r.id}: choice${ci}=${r[`choice${ci}`]} != 正答テキスト=${r['正答テキスト']}`);
    }
  }
  const cond2 = cond2Violations.length === 0;

  // 条件 3: optionRationales split(' || ') 長さ 4
  let cond3Violations = [];
  for (const r of outDataRows) {
    const parts = (r.optionRationales || '').split(' || ');
    if (parts.length !== 4) {
      cond3Violations.push(`${r.id}: optionRationales parts=${parts.length}`);
    }
  }
  const cond3 = cond3Violations.length === 0;

  // 条件 4: correctIndex 番目の rationale が「正解。」で始まる
  let cond4Violations = [];
  for (const r of outDataRows) {
    const ci = parseInt(r.correctIndex, 10);
    const parts = (r.optionRationales || '').split(' || ');
    if (parts.length === 4 && !parts[ci].startsWith('正解。')) {
      cond4Violations.push(`${r.id}: rationale[${ci}]="${parts[ci].slice(0, 30)}..." not start with 正解。`);
    }
  }
  const cond4 = cond4Violations.length === 0;

  // 条件 5: その他 3 つの rationale が「誤り。」で始まる
  let cond5Violations = [];
  for (const r of outDataRows) {
    const ci = parseInt(r.correctIndex, 10);
    const parts = (r.optionRationales || '').split(' || ');
    if (parts.length === 4) {
      for (let i = 0; i < 4; i++) {
        if (i === ci) continue;
        if (!parts[i].startsWith('誤り。')) {
          cond5Violations.push(`${r.id}: rationale[${i}]="${parts[i].slice(0, 30)}..." not start with 誤り。`);
        }
      }
    }
  }
  const cond5 = cond5Violations.length === 0;

  // 条件 6: 対象 ID の max_min_ratio が低下
  let cond6Violations = [];
  for (const t of targetIds) {
    const before = beforeMetrics[t.id].ratio;
    const after = afterMetrics[t.id].ratio;
    if (!(after < before)) {
      cond6Violations.push(`${t.id}: before=${before.toFixed(3)} after=${after.toFixed(3)} not decreased`);
    }
  }
  const cond6 = cond6Violations.length === 0;

  // 条件 7: Step3 系 11+1 ID の correctIndex が 0067/0068 と一致 (= 入力 CSV と一致)
  let cond7Violations = [];
  for (const id of STEP3_GUARDED_IDS) {
    const inRow = inputDataRows.find((r) => r.id === id);
    const outRow = outDataRows.find((r) => r.id === id);
    if (!inRow || !outRow) {
      cond7Violations.push(`${id}: not found`);
      continue;
    }
    if (inRow.correctIndex !== outRow.correctIndex) {
      cond7Violations.push(`${id}: correctIndex changed ${inRow.correctIndex} -> ${outRow.correctIndex}`);
    }
  }
  const cond7 = cond7Violations.length === 0;

  // ---------- 9. validation MD ----------
  const valLines = [];
  valLines.push('# 0077 Step5b-1 完了条件検証結果');
  valLines.push('');
  valLines.push(`- 検証日: 2026-05-02`);
  valLines.push(`- 入力: ${path.relative(REPO_ROOT, INPUT_PATH).replace(/\\/g, '/')}`);
  valLines.push(`- 出力 CSV: ${path.relative(REPO_ROOT, OUTPUT_PATH).replace(/\\/g, '/')}`);
  valLines.push(`- 対象 ID 数: ${targetIds.length}`);
  valLines.push(`- 修正セル数: ${mutationCount}`);
  valLines.push('');
  valLines.push('## 完了条件 7 種');
  valLines.push('');
  valLines.push(`- 条件 1 (対象外 ID で対象 7 列 diff=0): ${cond1 ? 'PASS' : 'FAIL'}`);
  if (!cond1) for (const v of cond1Violations) valLines.push(`  - ${v}`);
  valLines.push(`- 条件 2 (correctIndex 指定 choice == 正答テキスト): ${cond2 ? 'PASS' : 'FAIL'}`);
  if (!cond2) for (const v of cond2Violations) valLines.push(`  - ${v}`);
  valLines.push(`- 条件 3 (optionRationales split(' || ') 長さ 4): ${cond3 ? 'PASS' : 'FAIL'}`);
  if (!cond3) for (const v of cond3Violations) valLines.push(`  - ${v}`);
  valLines.push(`- 条件 4 (正答 rationale が「正解。」で始まる): ${cond4 ? 'PASS' : 'FAIL'}`);
  if (!cond4) for (const v of cond4Violations) valLines.push(`  - ${v}`);
  valLines.push(`- 条件 5 (誤答 rationale が「誤り。」で始まる): ${cond5 ? 'PASS' : 'FAIL'}`);
  if (!cond5) for (const v of cond5Violations) valLines.push(`  - ${v}`);
  valLines.push(`- 条件 6 (対象 ID の max_min_ratio 低下): ${cond6 ? 'PASS' : 'FAIL'}`);
  if (!cond6) for (const v of cond6Violations) valLines.push(`  - ${v}`);
  valLines.push(`- 条件 7 (Step3 系 11+1 ID の correctIndex 不変): ${cond7 ? 'PASS' : 'FAIL'}`);
  if (!cond7) for (const v of cond7Violations) valLines.push(`  - ${v}`);
  valLines.push('');
  valLines.push('## 対象 ID 別 ratio (before -> after)');
  valLines.push('');
  valLines.push('| id | correctIdx | before lens | before ratio | after lens | after ratio | 低下 |');
  valLines.push('|---|---|---|---|---|---|---|');
  for (const t of targetIds) {
    const b = beforeMetrics[t.id];
    const a = afterMetrics[t.id];
    const dec = a.ratio < b.ratio ? '✓' : '✗';
    valLines.push(`| ${t.id} | ${b.correctIdx} | ${b.lens.join('/')} | ${b.ratio.toFixed(2)} | ${a.lens.join('/')} | ${a.ratio.toFixed(2)} | ${dec} |`);
  }
  valLines.push('');
  valLines.push('## 想定 ID 突合');
  valLines.push('');
  valLines.push(`- 機械抽出: ${mismatchSummary.extractedCount} 件`);
  valLines.push(`- 想定 ID リスト: ${mismatchSummary.expectedCount} 件`);
  valLines.push(`- 機械抽出のみ: ${mismatchSummary.onlyInExtracted.length === 0 ? 'なし' : mismatchSummary.onlyInExtracted.join(', ')}`);
  valLines.push(`- 想定のみ: ${mismatchSummary.onlyInExpected.length === 0 ? 'なし' : mismatchSummary.onlyInExpected.join(', ')}`);
  valLines.push(`- 一致: ${mismatchSummary.matched ? 'YES' : 'NO'}`);
  valLines.push('');
  fs.writeFileSync(VALIDATION_MD_PATH, valLines.join('\n'), 'utf8');
  console.log(`Wrote ${VALIDATION_MD_PATH}`);

  // ---------- 10. fixes MD ----------
  const fxLines = [];
  fxLines.push('# 0077 Step5b-1 選択肢長さバイアス修正レポート');
  fxLines.push('');
  fxLines.push(`- 修正日: 2026-05-02`);
  fxLines.push(`- 入力: ${path.relative(REPO_ROOT, INPUT_PATH).replace(/\\/g, '/')}`);
  fxLines.push(`- 出力: ${path.relative(REPO_ROOT, OUTPUT_PATH).replace(/\\/g, '/')}`);
  fxLines.push(`- 対象 ID 数: ${targetIds.length}`);
  fxLines.push(`- 修正件数: ${mutationCount} セル (${Object.keys(fixDetails).length} ID)`);
  fxLines.push('');
  fxLines.push('## 抽出条件');
  fxLines.push('');
  fxLines.push('- 優先度 = high');
  fxLines.push('- max_min_ratio >= 2.5');
  fxLines.push('- correct_is_longest = true');
  fxLines.push('');
  fxLines.push('## 対象 ID 一覧と ratio 改善');
  fxLines.push('');
  fxLines.push('| id | correctIdx | before_ratio | after_ratio | 改善 |');
  fxLines.push('|---|---|---|---|---|');
  for (const t of targetIds) {
    const b = beforeMetrics[t.id];
    const a = afterMetrics[t.id];
    const delta = (b.ratio - a.ratio).toFixed(2);
    fxLines.push(`| ${t.id} | ${b.correctIdx} | ${b.ratio.toFixed(2)} | ${a.ratio.toFixed(2)} | -${delta} |`);
  }
  fxLines.push('');
  fxLines.push('## 修正詳細 (ID 別)');
  fxLines.push('');
  for (const t of targetIds) {
    const b = beforeMetrics[t.id];
    const a = afterMetrics[t.id];
    fxLines.push(`### ${t.id}`);
    fxLines.push('');
    fxLines.push(`- correctIndex: ${b.correctIdx}`);
    fxLines.push(`- before lens (c0/c1/c2/c3): ${b.lens.join('/')} (max/min ratio = ${b.ratio.toFixed(2)})`);
    fxLines.push(`- after lens (c0/c1/c2/c3): ${a.lens.join('/')} (max/min ratio = ${a.ratio.toFixed(2)})`);
    fxLines.push('');
    const details = fixDetails[t.id] || [];
    if (details.length === 0) {
      fxLines.push('（修正なし）');
      fxLines.push('');
      continue;
    }
    fxLines.push('| column | before | after | before_length | after_length | 変更理由 |');
    fxLines.push('|---|---|---|---|---|---|');
    for (const d of details) {
      const beforeStr = d.before.replace(/\|/g, '\\|').replace(/\n/g, ' ');
      const afterStr = d.after.replace(/\|/g, '\\|').replace(/\n/g, ' ');
      const reasonStr = d.reason.replace(/\|/g, '\\|').replace(/\n/g, ' ');
      fxLines.push(`| ${d.column} | ${beforeStr} | ${afterStr} | ${d.before_length} | ${d.after_length} | ${reasonStr} |`);
    }
    fxLines.push('');
  }
  fs.writeFileSync(FIXES_MD_PATH, fxLines.join('\n'), 'utf8');
  console.log(`Wrote ${FIXES_MD_PATH}`);

  // ---------- 11. exit code ----------
  const allPass = cond1 && cond2 && cond3 && cond4 && cond5 && cond6 && cond7;
  console.log('');
  console.log('=========================================');
  console.log(`完了条件: ${allPass ? 'ALL PASS' : 'FAIL'}`);
  console.log(`  条件1: ${cond1 ? 'PASS' : 'FAIL'}`);
  console.log(`  条件2: ${cond2 ? 'PASS' : 'FAIL'}`);
  console.log(`  条件3: ${cond3 ? 'PASS' : 'FAIL'}`);
  console.log(`  条件4: ${cond4 ? 'PASS' : 'FAIL'}`);
  console.log(`  条件5: ${cond5 ? 'PASS' : 'FAIL'}`);
  console.log(`  条件6: ${cond6 ? 'PASS' : 'FAIL'}`);
  console.log(`  条件7: ${cond7 ? 'PASS' : 'FAIL'}`);
  if (!allPass) {
    process.exit(2);
  }
}

main();
