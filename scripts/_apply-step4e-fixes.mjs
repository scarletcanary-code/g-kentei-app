/**
 * _apply-step4e-fixes.mjs
 * Step4e の修正を適用して questions-2026-05-02-step4e.csv を出力する
 * Usage: node scripts/_apply-step4e-fixes.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INPUT = path.join(__dirname, '../../.harness/exports/questions-2026-05-02-step4d.csv');
const OUTPUT = path.join(__dirname, '../../.harness/exports/questions-2026-05-02-step4e.csv');
const DIFF_OUT = path.join(__dirname, '../../.harness/runs/0073/audit-step4e-diff.csv');

// RFC 4180 CSV parser
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
      else if (i + 1 < text.length && text[i+1] === '"') { current += '"'; i++; }
      else { inQuote = false; }
    } else if (c === ',' && !inQuote) { row.push(current); current = ''; }
    else if (c === '\n' && !inQuote) { row.push(current); current = ''; rows.push(row); row = []; }
    else if (c === '\r' && !inQuote) { /* skip */ }
    else { current += c; }
  }
  if (current || row.length > 0) { row.push(current); rows.push(row); }
  const headers = rows[0].map(h => h.replace(/\r/g, ''));
  const dataRows = rows.slice(1).filter(r => r.some(v => v.trim() !== ''));
  const records = dataRows.map(r => {
    const record = {};
    headers.forEach((h, i) => { record[h] = r[i] !== undefined ? r[i].replace(/\r/g, '') : ''; });
    return record;
  });
  return { headers, rows: records };
}

// CSV cell escape
function escapeCell(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// Read input
const csvText = fs.readFileSync(INPUT, 'utf8');
const { headers, rows } = parseCsv(csvText);
console.log(`Parsed: ${rows.length} rows, ${headers.length} columns`);

// Diff records
const diffs = [];

function recordDiff(id, col, before, after) {
  if (before !== after) {
    diffs.push({ id, column: col, before, after });
  }
}

// ====================================================================
// MODIFICATION RULES (ピンポイント最小修正)
// ====================================================================

// Rule 1: 完全消去 5 表現を含むセル + 大幅削減 2 表現を含むセル + 文末「とされる」修正
// 各セルを after の文字列で完全置換する
const cellFixes = {
  // === 完全消去 5 表現 ===
  'ch1-009': {
    'choice3': 'シンボルグラウンディング問題（記号と実体が結びつかないという問題）',
  },
  'ch1-012': {
    'choice3': '心理療法士の役割を果たすAI',
  },
  'ch1-017': {
    'choice3': 'ルールが不明確な問題を扱う手法',
  },
  'ch1-018': {
    'choice3': '人間の感情を理解し、対話が可能なAI',
  },
  'ch2-002': {
    'choice3': 'AIの実用化が進まず、企業の関心が失われたため',
  },
  'ch2-022': {
    'choice2': '選択肢が多すぎて計算が追いつかないため',
  },
  'ch3-002': {
    'choice3': '住宅の面積・築年数などの特徴量と実際の売却価格のペアから価格予測式を学習する',
  },
  'ch3-022': {
    'choice3': '全く意味のないモデルである',
  },
  'ch3-027': {
    'choice3': '次元の呪いは、データの量が増えることで解消される現象である',
  },
  'ch3-030': {
    'choice3': '方策を間接的に評価し、価値関数を用いて更新する手法',
  },
  'ch3-045': {
    'choice2': 'クラス不均衡問題は精度（Accuracy）で評価すれば解決できる',
  },
  'ch5-010': {
    'choice3': 'バッチサイズを大きくするほど汎化性能が低下するという問題',
  },
  'ch6-002': {
    'choice3': '文脈を無視して単語の出現頻度を分析する技術',
  },
  'ch6-005': {
    'choice3': 'LLMが多言語に対応しておらず日本語での精度が低いという課題',
  },
  'ch6-013': {
    'choice3': 'VGG：画像処理に特化した手法 / GoogLeNet：自然言語処理に応用される技術',
  },
  'ch6-029': {
    'choice2': '音声認識は音声データを圧縮する技術であり、音声合成は音声をデジタル化するプロセスである',
  },
  'ch6-031': {
    'choice2': 'この手法は、AIが自然言語を生成する際の文法的な正確さを向上させるものである',
  },
  'ch7-024': {
    'choice2': 'AIガバナンスは、情報セキュリティの強化だけを目的とした技術的対策である',
  },
  'ch8-009': {
    'choice3': 'AIが公平な判断を行うための基準である',
  },
  'ch8-017': {
    'choice3': 'データの前処理を行うための手法で、モデルのトレーニングを効率化する技術である',
  },
  'ch8-018': {
    'choice3': '企業内部の機密文書として管理されるノウハウや技術情報で、営業秘密として扱われるデータ',
  },

  // === 大幅削減 2 表現 (であるとされる) ===
  'ch4-033': {
    'choice1': '交差エントロピーは、回帰問題に特化した誤差関数である',
  },
  // ch6-035 は「であるとされる」と重点 38 ID 必須を兼ねる
  'ch6-035': {
    'choice2': 'LoRAはデータの前処理を効率化するための手法であり、特に自然言語処理において有効である',
  },

  // === 文末「とされる」 ===
  'ch1-014': {
    'explanation': '「中国語の部屋」はジョン・サールが提唱した思考実験。中国語を知らない人が部屋の中でルール帳を使って中国語の質問に答えられても、意味を「理解」していない。同様にコンピュータは記号操作をしているだけで、真の意味理解（意識・意図）はないと主張し、強いAIを批判した。',
  },
  'ch1-015': {
    'choice3': '知能は身体の存在に依存しない',
    'optionRationales': '正解。知能は身体を通じて環境と相互作用することで発達するから。 || 誤り。身体性の考え方は単なる環境との相互作用だけでなく、物理的な「身体」を通じた実体験が知能発達に不可欠であると主張している点が正答との違いである。 || 誤り。身体を持たないAIは知能を持つことができない。 || 誤り。知能は身体の存在に依存するという考え方が主流である。',
  },
  'ch1-037': {
    'choice2': 'Turing テストはプログラムコードの品質を専門家が採点して評価するものである',
  },
  'ch2-016': {
    'explanation': 'AI冬の時代（AI Winter）とは、AIへの期待が過剰に高まった後に限界が露呈し、研究資金や投資が急減してAI研究が停滞した時期を指す。第1次ブームの後（1970年代）と第2次ブームの後（1990年代）の2回起きた。ブームと冬の繰り返しがAIの歴史の特徴の一つ。',
  },
  'ch7-005': {
    'explanation': 'AIモデルのヘルスモニタリングとは、本番環境で稼働中のAIモデルの予測精度・入力データの分布・異常を継続的に監視し、モデルドリフトを早期に検知して対処するための活動。AIは一度作れば終わりではなく、定期的な「健康診断」が必要である。',
  },
  'ch8-011': {
    'explanation': '著作権法第47条の5は、検索エンジンや情報解析サービスなどの提供において、必要な限度で著作物を軽微に利用（例：検索結果のサムネイル表示など）することを認める規定。第30条の4（情報解析規定）と並び、日本のAI開発に寛容な法体系の根拠の一つである。',
  },
  'ch8-015': {
    'choice2': 'プライバシー・バイ・デザインはデータ収集後にプライバシー対策を行う方法である',
  },
  'ch8-024': {
    'explanation': 'AIのアカウンタビリティ（説明責任）とは、AIの判断や行動について開発者・運用者が利害関係者（ユーザー・被影響者・規制当局・社会）に対して説明し、問題が生じた際に責任を負う体制・義務のこと。FAccT（公平性・アカウンタビリティ・透明性）の一要素で、特に高リスク領域でのAI利用に不可欠な概念である。',
  },

  // === 重点 38 ID で auto-detected されなかった 12 ID への最小修正 ===
  // 「にあたる」（完全消去対象「にあたるを」「にあたるものである」のバリエーション、AI 生成的な不自然語尾）を「である」等に正す
  'ch1-028': {
    'choice3': 'フレーム問題はAIの倫理的判断に関する課題である',
  },
  'ch4-017': {
    'choice3': 'MSEは自然言語処理において重要で、交差エントロピーは画像認識で用いられる。',
  },
  'ch4-022': {
    'choice1': '勾配爆発は、重みの初期化が不適切な場合に発生する現象である',
  },
  'ch4-031': {
    'choice2': 'データを圧縮し、情報を保存するための層である',
  },
  'ch5-017': {
    'choice3': 'データの次元を削減するために用いる処理である',
  },
  'ch7-003': {
    'choice2': 'データリーケージは過学習である',
  },
  'ch7-015': {
    'choice2': 'AIを活用して顧客データを分析することである',
  },
  'ch7-017': {
    'choice3': 'データの整合性を保つための手法であり、主にデータの暗号化やセキュリティ対策である。',
  },
  'ch7-027': {
    'choice2': '異なる病院が患者データを用いて、AIによる新薬の開発を行うプロジェクトである。',
  },
  'ch8-014': {
    'choice2': '個人データを他者に無条件で開示する権利である',
  },
  'ch8-016': {
    'choice3': '人間の感情を理解するためのAIの倫理基準である',
  },
  'ch8-029': {
    'choice0': '特定の著作物を無断で複製し、AI学習に利用する行為は著作権侵害である',
  },
};

// Apply cell fixes
for (const row of rows) {
  const id = row['id'];
  if (cellFixes[id]) {
    for (const [col, newVal] of Object.entries(cellFixes[id])) {
      const before = row[col];
      if (before !== newVal) {
        recordDiff(id, col, before, newVal);
        row[col] = newVal;
      }
    }
  }
}

// Rule 2: Sync 正答テキスト with correctIndex choice after modifications
// (修正対象の choice が correctIndex 指定の choice なら 正答テキスト も更新)
for (const row of rows) {
  const id = row['id'];
  const ci = parseInt(row['correctIndex']);
  if (!isNaN(ci) && ci >= 0 && ci <= 3) {
    const choiceCol = 'choice' + ci;
    const choiceVal = row[choiceCol];
    const answerVal = row['正答テキスト'];
    if (choiceVal !== answerVal) {
      recordDiff(id, '正答テキスト', answerVal, choiceVal);
      row['正答テキスト'] = choiceVal;
    }
  }
}

// ====================================================================
// OUTPUT CSV
// ====================================================================

// Serialize with BOM + CRLF
let out = '﻿' + headers.map(escapeCell).join(',') + '\r\n';
for (const row of rows) {
  out += headers.map(h => escapeCell(row[h] || '')).join(',') + '\r\n';
}

fs.writeFileSync(OUTPUT, out, 'utf8');
console.log(`Output written: ${OUTPUT}`);
console.log(`Data rows: ${rows.length}`);

// Write diff CSV
const diffDir = path.dirname(DIFF_OUT);
if (!fs.existsSync(diffDir)) {
  fs.mkdirSync(diffDir, { recursive: true });
}
let diffOut = 'id,column,before,after\r\n';
for (const d of diffs) {
  diffOut += [d.id, d.column, d.before, d.after].map(escapeCell).join(',') + '\r\n';
}
fs.writeFileSync(DIFF_OUT, diffOut, 'utf8');
console.log(`Diff written: ${DIFF_OUT} (${diffs.length} changes)`);

// Print summary
const changedIds = [...new Set(diffs.map(d => d.id))];
console.log(`\nChanged IDs: ${changedIds.length}`);
for (const id of changedIds) {
  const idDiffs = diffs.filter(d => d.id === id);
  console.log(`  ${id}: ${idDiffs.map(d => d.column).join(', ')}`);
}

// Count expressions after fix
const postText = out.replace(/^﻿/, '');
const exterminatePatterns = ['を実現するとする方式','に近い記述','にあたるを','概念・アプローチ','にあたるものである'];
const reducePatterns = ['であるとされる'];
console.log('\n=== After fix: 完全消去 5 表現 ===');
let exterminateTotal = 0;
for (const p of exterminatePatterns) {
  const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = postText.match(new RegExp(escaped, 'g'));
  const c = m ? m.length : 0;
  exterminateTotal += c;
  console.log(`  "${p}": ${c}`);
}
console.log(`  TOTAL: ${exterminateTotal}`);

console.log('\n=== After fix: 大幅削減 2 表現 ===');
for (const p of reducePatterns) {
  const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = postText.match(new RegExp(escaped, 'g'));
  console.log(`  "${p}": ${m ? m.length : 0}`);
}
// 文末のとされる
let trailingCount = 0;
const re = /とされる(。|」|]|\)|"|\r?\n|\s*\|\||,)/g;
let mm;
while ((mm = re.exec(postText)) !== null) {
  const before = postText.slice(Math.max(0, mm.index - 3), mm.index);
  if (before === 'である') continue;
  trailingCount++;
}
console.log(`  "文末のとされる": ${trailingCount}`);
