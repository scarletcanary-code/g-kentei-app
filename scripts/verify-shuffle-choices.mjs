/**
 * shuffleChoices のシャッフル均等性を統計検証するスクリプト。
 * src/lib/quiz-engine.ts の shuffleChoices と同一の Fisher-Yates ロジックを
 * ここに直接再実装して Node.js 標準モジュールのみで動作させる。
 * （tsx/ts-node が存在しない環境向け）
 */

/**
 * @param {{ choices: {text: string}[], correctIndex: number, [key: string]: unknown }} question
 * @returns {{ choices: {text: string}[], correctIndex: number, [key: string]: unknown }}
 */
function shuffleChoices(question) {
  const choices = [...question.choices];
  const correctText = choices[question.correctIndex].text;

  // Fisher-Yates shuffle
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }

  const newCorrectIndex = choices.findIndex((c) => c.text === correctText);

  return {
    ...question,
    choices,
    correctIndex: newCorrectIndex,
  };
}

const testQuestion = {
  id: 'test-q',
  categoryId: 'ch1',
  question: 'テスト問題',
  choices: [
    { text: '選択肢A' },
    { text: '選択肢B' },
    { text: '選択肢C' },
    { text: '選択肢D' },
  ],
  correctIndex: 0,
  explanation: 'テスト用',
  relatedTermIds: [],
  difficulty: 1,
  tags: [],
};

const TRIALS = 4000;
const counts = { 0: 0, 1: 0, 2: 0, 3: 0 };

for (let i = 0; i < TRIALS; i++) {
  const result = shuffleChoices(testQuestion);
  counts[result.correctIndex]++;
}

let hasFailure = false;
for (const idx of [0, 1, 2, 3]) {
  const rate = counts[idx] / TRIALS;
  const pct = (rate * 100).toFixed(2);
  console.log(`correctIndex ${idx}: ${counts[idx]}回 (${pct}%)`);
  if (rate < 0.20 || rate > 0.30) {
    console.log(`  NG: correctIndex ${idx} の出現率 ${pct}% が 20〜30% の範囲外`);
    hasFailure = true;
  }
}

process.exit(hasFailure ? 1 : 0);
