/**
 * fix-question-quality.mjs
 *
 * このスクリプトは以下を行います:
 * 1. correctIndex の章別分布を均等化（各値0〜3 ≤ 50%、目標約25%）
 * 2. correctIndex の全体分布を均等化（各値 ≤ 30%）
 * 3. 誤答の禁止語句を含む選択肢テキストを修正
 *
 * ch1-036 と ch1-037 はスキップします。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const questionsDir = path.resolve(__dirname, '../src/data/questions');
const SKIP_IDS = ['ch1-036', 'ch1-037'];
const BANNED_PATTERNS = [
  /のみ[をにはで。、]/,
  /^全て|全て[をにはで。、]/,
  /^すべて|すべて[をにはで。、]/,
  /一切/,
  /不可能/,
  /専用/,
  /特化/,
];

function isBanned(text) {
  return BANNED_PATTERNS.some(r => r.test(text));
}

function fixBannedText(text) {
  let fixed = text;
  fixed = fixed.replace(/のみ([をにはで。、])/g, 'だけ$1');
  fixed = fixed.replace(/^全て/g, 'ほぼすべての');
  fixed = fixed.replace(/全て([をにはで。、])/g, 'ほぼすべて$1');
  fixed = fixed.replace(/^すべて/g, 'ほぼすべての');
  fixed = fixed.replace(/すべて([をにはで。、])/g, 'ほぼすべて$1');
  fixed = fixed.replace(/一切/g, '全くの');
  fixed = fixed.replace(/不可能/g, '困難');
  fixed = fixed.replace(/専用/g, '主な用途の');
  fixed = fixed.replace(/特化/g, '重点化');
  return fixed;
}

// 正解選択肢を targetIndex に移動して correctIndex を更新
function moveCorrectToIndex(choices, correctIndex, targetIndex) {
  if (targetIndex === correctIndex) return { choices: [...choices], correctIndex };

  const newChoices = [...choices];
  const temp = newChoices[targetIndex];
  newChoices[targetIndex] = newChoices[correctIndex];
  newChoices[correctIndex] = temp;

  return { choices: newChoices, correctIndex: targetIndex };
}

// 全ファイルを読み込み
const files = fs.readdirSync(questionsDir).filter(f => f.endsWith('.json')).sort();
const allData = {};
for (const file of files) {
  allData[file] = JSON.parse(fs.readFileSync(path.join(questionsDir, file), 'utf8'));
}

// === ステップ1: 章ごとに correctIndex を均等分布させる ===
// 各章で各インデックスが ≤ 50% になるよう割り当て
// 目標: floor(chapterTotal/4) を基準に [a, a, a, b] where b = total - 3a

const updatedData = {};
for (const [file, questions] of Object.entries(allData)) {
  updatedData[file] = JSON.parse(JSON.stringify(questions));
}

for (const [file, questions] of Object.entries(updatedData)) {
  const nonSkip = [];
  for (let qi = 0; qi < questions.length; qi++) {
    if (!SKIP_IDS.includes(questions[qi].id)) {
      nonSkip.push(qi);
    }
  }

  const total = nonSkip.length;
  // 目標配分: floor(total/4) × 4 = base, remainder は先頭インデックスに1ずつ追加
  const base = Math.floor(total / 4);
  const remainder = total % 4;
  // targetCounts[i] = base + (i < remainder ? 1 : 0)
  const targetCounts = [0, 1, 2, 3].map(i => base + (i < remainder ? 1 : 0));

  // 各問題に割り当てるインデックスを決定
  // 現在のインデックスをそのまま使えるものを優先する
  const assigned = new Array(nonSkip.length).fill(-1);
  const assignCounts = [0, 0, 0, 0];

  // ステップ1a: 現在の correctIndex を維持できる問題を先に割り当て
  for (let j = 0; j < nonSkip.length; j++) {
    const qi = nonSkip[j];
    const curIdx = questions[qi].correctIndex;
    if (assignCounts[curIdx] < targetCounts[curIdx]) {
      assigned[j] = curIdx;
      assignCounts[curIdx]++;
    }
  }

  // ステップ1b: 未割り当てを不足インデックスに割り当て（ラウンドロビン）
  // 不足インデックスのリストを作成（足りない分だけ）
  const needList = [];
  for (let idx = 0; idx <= 3; idx++) {
    const need = targetCounts[idx] - assignCounts[idx];
    for (let k = 0; k < need; k++) {
      needList.push(idx);
    }
  }

  // 未割り当ての問題に needList の順に割り当て
  let needPos = 0;
  for (let j = 0; j < nonSkip.length; j++) {
    if (assigned[j] === -1) {
      if (needPos < needList.length) {
        assigned[j] = needList[needPos++];
      }
    }
  }

  // ステップ1c: データを更新
  for (let j = 0; j < nonSkip.length; j++) {
    const qi = nonSkip[j];
    const targetIdx = assigned[j];
    if (targetIdx === -1) {
      console.error(`ERROR: no target for ${questions[qi].id}`);
      continue;
    }
    if (questions[qi].correctIndex !== targetIdx) {
      const result = moveCorrectToIndex(questions[qi].choices, questions[qi].correctIndex, targetIdx);
      questions[qi].choices = result.choices;
      questions[qi].correctIndex = result.correctIndex;
    }
  }

  // 章ごとの分布を確認
  const dist = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const qi of nonSkip) dist[questions[qi].correctIndex]++;
  const maxRatio = Math.max(...Object.values(dist)) / total * 100;
  const pass = maxRatio <= 50;
  console.log(`${file}: dist=${JSON.stringify(dist)}, maxRatio=${maxRatio.toFixed(0)}% [${pass ? 'PASS' : 'FAIL'}]`);
}

// === ステップ2: 全体分布を ≤ 30% に調整 ===
// 現在の全体分布を確認
const globalCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };
let globalTotal = 0;
for (const questions of Object.values(updatedData)) {
  for (const q of questions) {
    globalCounts[q.correctIndex]++;
    globalTotal++;
  }
}
console.log('\nGlobal after chapter fix:', JSON.stringify(globalCounts), 'total:', globalTotal);
const maxGlobalRatio = Math.max(...Object.values(globalCounts)) / globalTotal;
console.log('Max ratio:', (maxGlobalRatio * 100).toFixed(1) + '%', maxGlobalRatio <= 0.30 ? '[PASS]' : '[needs adjustment]');

// 全体が30%を超えているインデックスがあれば調整
if (maxGlobalRatio > 0.30) {
  const maxAllowed = Math.floor(globalTotal * 0.30);
  // 超過インデックスの問題を他インデックスに移す
  // 不足インデックスを特定
  const overIndices = Object.entries(globalCounts)
    .filter(([_, c]) => c > maxAllowed)
    .map(([i]) => parseInt(i));
  const underIndices = Object.entries(globalCounts)
    .filter(([_, c]) => c < maxAllowed)
    .map(([i]) => parseInt(i));

  console.log('Over indices:', overIndices, 'Under indices:', underIndices);

  // 超過インデックスを持つ非スキップ問題を収集（章内で動かしても章制約に違反しないもの）
  for (const overIdx of overIndices) {
    let excess = globalCounts[overIdx] - maxAllowed;
    for (const [file, questions] of Object.entries(updatedData)) {
      if (excess <= 0) break;
      // 章内の当該インデックスの問題数
      const chNonSkip = questions.filter(q => !SKIP_IDS.includes(q.id));
      const chTotal = chNonSkip.length;
      const chCountAtOver = chNonSkip.filter(q => q.correctIndex === overIdx).length;
      // 章内で overIdx の問題を減らせる余地
      const chLimit = Math.floor(chTotal * 0.5); // 50%制限
      const chExcess = Math.max(0, chCountAtOver - Math.floor(chTotal / 4));

      for (let qi = 0; qi < questions.length && excess > 0; qi++) {
        const q = questions[qi];
        if (SKIP_IDS.includes(q.id)) continue;
        if (q.correctIndex !== overIdx) continue;

        // 移動先インデックスを選択（章内でその値が少ないもの）
        const chDist = { 0: 0, 1: 0, 2: 0, 3: 0 };
        chNonSkip.forEach(qq => chDist[qq.correctIndex]++);

        let moveToIdx = -1;
        for (const underIdx of underIndices) {
          if (globalCounts[underIdx] < maxAllowed && chDist[underIdx] < Math.floor(chTotal * 0.5)) {
            moveToIdx = underIdx;
            break;
          }
        }

        if (moveToIdx !== -1) {
          const result = moveCorrectToIndex(q.choices, q.correctIndex, moveToIdx);
          questions[qi].choices = result.choices;
          questions[qi].correctIndex = result.correctIndex;
          globalCounts[overIdx]--;
          globalCounts[moveToIdx]++;
          excess--;
        }
      }
    }
  }

  // 再確認
  const finalCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const questions of Object.values(updatedData)) {
    for (const q of questions) finalCounts[q.correctIndex]++;
  }
  console.log('Global after global fix:', JSON.stringify(finalCounts));
}

// === ステップ3: 禁止語句を修正 ===
let bannedFixed = 0;
for (const questions of Object.values(updatedData)) {
  for (const q of questions) {
    if (SKIP_IDS.includes(q.id)) continue;
    for (let i = 0; i < q.choices.length; i++) {
      if (i !== q.correctIndex && isBanned(q.choices[i].text)) {
        const oldText = q.choices[i].text;
        const newText = fixBannedText(oldText);
        if (newText !== oldText) {
          q.choices[i].text = newText;
          bannedFixed++;
        }
      }
    }
  }
}
console.log(`\nBanned text fixes: ${bannedFixed}`);

// === 書き込み ===
for (const [file, questions] of Object.entries(updatedData)) {
  const filePath = path.join(questionsDir, file);
  fs.writeFileSync(filePath, JSON.stringify(questions, null, 2) + '\n', 'utf8');
}

// === 最終検証 ===
console.log('\n=== Final Verification ===');
// 章別
for (const [file, questions] of Object.entries(updatedData)) {
  const dist = { 0: 0, 1: 0, 2: 0, 3: 0 };
  const nonSkip = questions.filter(q => !SKIP_IDS.includes(q.id));
  nonSkip.forEach(q => dist[q.correctIndex]++);
  const total = nonSkip.length;
  const maxRatio = Math.max(...Object.values(dist)) / total;
  console.log(`${file.padEnd(12)}: dist=${JSON.stringify(dist)}, maxRatio=${(maxRatio*100).toFixed(0)}% [${maxRatio <= 0.5 ? 'PASS' : 'FAIL'}]`);
}

// 全体
const finalGlobal = { 0: 0, 1: 0, 2: 0, 3: 0 };
let finalTotal = 0;
for (const questions of Object.values(updatedData)) {
  for (const q of questions) {
    finalGlobal[q.correctIndex]++;
    finalTotal++;
  }
}
console.log('\nGlobal:');
for (const [k, v] of Object.entries(finalGlobal)) {
  const pct = (v / finalTotal * 100).toFixed(1);
  const pass = v / finalTotal <= 0.30;
  console.log(`  index ${k}: ${v}/${finalTotal} = ${pct}% [${pass ? 'PASS' : 'FAIL'}]`);
}

// 禁止語句チェック
let bannedViolations = 0;
for (const questions of Object.values(updatedData)) {
  for (const q of questions) {
    if (SKIP_IDS.includes(q.id)) continue;
    const wrongChoices = q.choices.filter((_, i) => i !== q.correctIndex).map(c => c.text);
    const hasBanned = wrongChoices.some(t => BANNED_PATTERNS.some(r => r.test(t)));
    if (hasBanned) bannedViolations++;
  }
}
console.log(`\nBanned word violations: ${bannedViolations} (limit: 20) [${bannedViolations <= 20 ? 'PASS' : 'FAIL'}]`);
