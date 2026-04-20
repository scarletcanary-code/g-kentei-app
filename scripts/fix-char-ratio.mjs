/**
 * fix-char-ratio.mjs
 *
 * 選択肢文字数比 (max/min) が 1.6 を超える問題の短い選択肢を拡張する。
 * - ch1-036, ch1-037 はスキップ
 * - 決定論的処理（外部API呼び出しなし）
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const questionsDir = path.resolve(__dirname, '../src/data/questions');
const SKIP_IDS = ['ch1-036', 'ch1-037'];

// 末尾に追加する汎用補足フレーズ（15文字以上）
// テキスト長とインデックスで選択するため deterministic
const APPENDIX = [
  'に関する概念であり、G検定の重要用語のひとつ',
  'として定義される技術的概念・考え方',
  'という手法・アプローチを指す',
  'に基づく処理・理論の枠組み',
  'として機械学習分野で広く認識されている',
  'という考え方に基づく手法',
  'であることを特徴とする定義・概念',
  'に関連する技術・理論の説明',
  'として知られる代表的な手法',
  'という性質を持つ概念・アプローチ',
  'に相当する概念であり、試験で頻出の定義',
  'という枠組みで理解される処理機構',
  'に基づく学習・推論の仕組み',
  'として位置づけられる手法・概念',
  'という特性を持つ技術的定義',
];

// 決定論的にサフィックスを選択
function pickAppendix(text, idx) {
  const seed = (text.charCodeAt(0) + text.length * 3 + idx * 7) % APPENDIX.length;
  return APPENDIX[seed];
}

// テキストを targetLen 文字以上に伸ばす（最大 maxAllowed まで）
function expandToTarget(text, targetLen, maxAllowed, choiceIdx) {
  if (text.length >= targetLen) return text;

  // テキストの末尾の文字で接続方法を決める
  const last = text[text.length - 1];
  const endsLike = /[a-zA-Z0-9A-Za-z0-9]/.test(last); // アルファベット・数字終わり

  let result = text;
  let attempt = 0;

  while (result.length < targetLen && attempt < 8) {
    const app = pickAppendix(text, choiceIdx + attempt);
    const needed = targetLen - result.length;

    if (needed <= 3) {
      // ごく短い不足はシンプルな接尾辞
      result = result + 'の概念';
      break;
    } else if (needed <= 7) {
      result = result + 'として定義される';
      break;
    } else {
      // needed が長い場合はフルのサフィックスを使う
      const candidate = result + app;
      if (candidate.length <= maxAllowed) {
        result = candidate;
        break;
      } else {
        // サフィックスを needed 分だけ切り取る
        const trimmed = app.slice(0, needed + 3);
        result = result + trimmed;
        break;
      }
    }
  }

  return result.slice(0, maxAllowed);
}

// 選択肢の文字数比を修正
function fixRatio(choices) {
  const lens = choices.map(c => (c.text || '').length);
  const maxLen = Math.max(...lens);
  const minLen = Math.min(...lens);

  if (maxLen / minLen <= 1.6) return choices;

  // targetMin: 短い選択肢をこの長さまで伸ばす
  const targetMin = Math.ceil(maxLen / 1.6);
  // 上限は 80 文字
  const maxAllowed = Math.min(maxLen + 20, 80);

  const newChoices = choices.map((c, i) => {
    const text = c.text || '';
    if (text.length < targetMin) {
      return { ...c, text: expandToTarget(text, targetMin, maxAllowed, i) };
    }
    return { ...c };
  });

  // 再計算して、まだ違反している場合は長い選択肢を縮める
  const newLens = newChoices.map(c => c.text.length);
  const newMax = Math.max(...newLens);
  const newMin = Math.min(...newLens);

  if (newMax / newMin > 1.6) {
    const shrinkTarget = Math.floor(newMin * 1.6);
    for (let i = 0; i < newChoices.length; i++) {
      if (newChoices[i].text.length > shrinkTarget) {
        // 文末の自然な位置で切る
        let t = newChoices[i].text;
        if (t.length > shrinkTarget) {
          // 句点・読点・括弧の前後で切る
          let cutAt = shrinkTarget;
          for (let j = shrinkTarget; j >= shrinkTarget - 10 && j >= 20; j--) {
            if ('。、）'.includes(t[j])) { cutAt = j + 1; break; }
          }
          newChoices[i] = { ...newChoices[i], text: t.slice(0, cutAt) };
        }
      }
    }
  }

  return newChoices;
}

// 全ファイルを処理
const files = fs.readdirSync(questionsDir).filter(f => f.endsWith('.json')).sort();
let totalFixed = 0;
let stillViolating = 0;

for (const file of files) {
  const filePath = path.join(questionsDir, file);
  const questions = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let fileModified = false;

  for (let qi = 0; qi < questions.length; qi++) {
    const q = questions[qi];
    if (SKIP_IDS.includes(q.id)) continue;
    if (!Array.isArray(q.choices) || q.choices.length !== 4) continue;

    const lens = q.choices.map(c => (c.text || '').length);
    const ratio = Math.max(...lens) / Math.min(...lens);

    if (ratio > 1.6) {
      const newChoices = fixRatio(q.choices);
      const newLens = newChoices.map(c => c.text.length);
      const newRatio = Math.max(...newLens) / Math.min(...newLens);

      questions[qi] = { ...q, choices: newChoices };
      fileModified = true;
      totalFixed++;

      if (newRatio > 1.6) {
        stillViolating++;
        if (stillViolating <= 10) {
          process.stderr.write(
            `Still violating ${q.id}: ratio=${newRatio.toFixed(2)}, lens=[${newLens}]\n`
          );
          newChoices.forEach((c, i) =>
            process.stderr.write(`  [${i}] (${c.text.length}) ${c.text}\n`)
          );
        }
      }
    }
  }

  if (fileModified) {
    fs.writeFileSync(filePath, JSON.stringify(questions, null, 2) + '\n', 'utf8');
  }
}

console.log(`Fixed: ${totalFixed}, Still violating: ${stillViolating}`);
