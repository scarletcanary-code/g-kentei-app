import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const questionsDir = path.resolve(__dirname, '../src/data/questions');

// Collect all JSON files in questions dir
const files = fs.readdirSync(questionsDir)
  .filter(f => f.endsWith('.json'))
  .sort();

const allQuestions = [];
const questionsByFile = {};

for (const file of files) {
  const filePath = path.join(questionsDir, file);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    process.stderr.write(`[FAIL PARSE] ${file}: JSON parse error: ${e.message}\n`);
    process.exit(1);
  }
  questionsByFile[file] = data;
  allQuestions.push(...data.map(q => ({ ...q, _file: file })));
}

let failCount = 0;

// V1: id global uniqueness
const idMap = {};
for (const q of allQuestions) {
  if (!idMap[q.id]) {
    idMap[q.id] = [];
  }
  idMap[q.id].push(q._file);
}
for (const [id, files] of Object.entries(idMap)) {
  if (files.length > 1) {
    process.stderr.write(`[FAIL V1] 重複id: ${id} (${files.join(', ')})\n`);
    failCount++;
  }
}

// V2, V3, V4, V5 per question
for (const q of allQuestions) {
  // V2: choices length
  if (!Array.isArray(q.choices) || q.choices.length !== 4) {
    const len = Array.isArray(q.choices) ? q.choices.length : 0;
    process.stderr.write(`[FAIL V2] ${q.id}: choices が ${len} 件\n`);
    failCount++;
  }

  // V3: correctIndex range
  if (![0, 1, 2, 3].includes(q.correctIndex)) {
    process.stderr.write(`[FAIL V3] ${q.id}: correctIndex=${q.correctIndex}\n`);
    failCount++;
  }

  // V4: explanation length
  if (!q.explanation || q.explanation.length < 40) {
    const len = q.explanation ? q.explanation.length : 0;
    process.stderr.write(`[FAIL V4] ${q.id}: explanation が ${len} 文字\n`);
    failCount++;
  }

  // V5: source_ref existence
  if (!q.source_ref || q.source_ref.length < 5) {
    process.stderr.write(`[FAIL V5] ${q.id}: source_ref が未定義または短すぎる\n`);
    failCount++;
  }
}

// V6: correctIndex distribution per chapter file
for (const [file, questions] of Object.entries(questionsByFile)) {
  const total = questions.length;
  if (total === 0) continue;

  const counts = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const q of questions) {
    if (q.correctIndex >= 0 && q.correctIndex <= 3) {
      counts[q.correctIndex]++;
    }
  }

  const chapterName = file.replace('.json', '');
  for (const [idx, count] of Object.entries(counts)) {
    const ratio = count / total;
    if (ratio > 0.5) {
      const pct = (ratio * 100).toFixed(0);
      process.stderr.write(
        `[FAIL V6] ${chapterName}: correctIndex=${idx} が ${pct}% (${count}/${total}問) → 制限: 50%未満\n`
      );
      failCount++;
    }
  }
}

// V7: 選択肢文字数比ゲート (max/min <= 1.6)
const SKIP_CHAR_RATIO = ['ch1-036', 'ch1-037'];
for (const q of allQuestions) {
  if (SKIP_CHAR_RATIO.includes(q.id)) continue;
  if (!Array.isArray(q.choices) || q.choices.length !== 4) continue;
  const lens = q.choices.map(c => (c.text || '').length);
  const maxLen = Math.max(...lens);
  const minLen = Math.min(...lens);
  if (minLen === 0) {
    process.stderr.write(`[FAIL V7] ${q.id}: 選択肢文字数比 計算不能 (minLen=0)\n`);
    failCount++;
    continue;
  }
  const ratio = maxLen / minLen;
  if (ratio > 1.6) {
    process.stderr.write(
      `[FAIL V7] ${q.id}: 選択肢文字数比 ${ratio.toFixed(2)} (max=${maxLen}, min=${minLen})\n`
    );
    failCount++;
  }
}

// V8: 誤答禁止語句ゲート (誤答選択肢に禁止パターンが2件以上含まれる問題を違反とする)
const bannedPatterns = [
  /のみ[をにはで。、]/,
  /^全て|全て[をにはで。、]/,
  /^すべて|すべて[をにはで。、]/,
  /一切/,
  /不可能/,
  /専用/,
  /特化/,
];
const BANNED_THRESHOLD = 2;
for (const q of allQuestions) {
  if (!Array.isArray(q.choices) || q.correctIndex === undefined) continue;
  const wrongChoices = q.choices
    .filter((_, i) => i !== q.correctIndex)
    .map(c => c.text || '');
  const matchedChoices = wrongChoices.filter(t => bannedPatterns.some(r => r.test(t)));
  if (matchedChoices.length >= BANNED_THRESHOLD) {
    const preview = matchedChoices.map(t => `"${t.slice(0, 20)}"`).join(', ');
    process.stderr.write(
      `[FAIL V8] ${q.id}: 誤答禁止語句 ${matchedChoices.length}件 (${preview})\n`
    );
    failCount++;
  }
}

// V9: 全体 correctIndex 分布ゲート (いずれの値も全体の 30% 以下)
{
  const globalCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };
  const globalTotal = allQuestions.length;
  for (const q of allQuestions) {
    if (q.correctIndex >= 0 && q.correctIndex <= 3) {
      globalCounts[q.correctIndex]++;
    }
  }
  const GLOBAL_LIMIT = 0.30;
  for (const [idx, count] of Object.entries(globalCounts)) {
    const ratio = count / globalTotal;
    if (ratio > GLOBAL_LIMIT) {
      const pct = (ratio * 100).toFixed(1);
      process.stderr.write(
        `[FAIL V9] 全体: correctIndex=${idx} が ${pct}% (${count}/${globalTotal}問) → 制限: 30%以下\n`
      );
      failCount++;
    }
  }
}

// V10: 禁止語尾拡張（誤答のみ）
const BANNED_SUFFIX_V10 = [
  /として定義される(?:技術的)?(?:概念)?(?:・考え方)?。?$/,
  /の概念(?:・考え方)?。?$/,
  /のための概念。?$/,
  /(?:した|する)の概念/,
  /に重点化した?/,
  /主な用途の/,
  /ほぼすべてのの/,
  /という(?:考え方|手法|枠組み)に基づく(?:手法|処理機構)?。?$/,
];
for (const q of allQuestions) {
  if (!Array.isArray(q.choices) || q.correctIndex === undefined) continue;
  q.choices.forEach((c, i) => {
    if (i === q.correctIndex) return;
    const text = c.text || '';
    for (const pat of BANNED_SUFFIX_V10) {
      if (pat.test(text)) {
        const preview = text.slice(-30);
        process.stderr.write(`[FAIL V10] ${q.id}: 禁止語尾 "${preview}"\n`);
        failCount++;
        break;
      }
    }
  });
}

// V11: 助詞重複タイポ（誤答のみ）
const DUP_PATTERN = /(のの|をを|にに|がが|でで|はは)/g;
const DUP_ALLOWLIST = ['ものの', '我々', '日々', '人々', '個々', '別々', '中々', '時々'];
for (const q of allQuestions) {
  if (!Array.isArray(q.choices) || q.correctIndex === undefined) continue;
  q.choices.forEach((c, i) => {
    if (i === q.correctIndex) return;
    const text = c.text || '';
    const matches = text.match(/.{0,2}(のの|をを|にに|がが|でで|はは).{0,2}/g) || [];
    for (const hit of matches) {
      if (!DUP_ALLOWLIST.some(a => hit.includes(a))) {
        process.stderr.write(`[FAIL V11] ${q.id}: 助詞重複 "${hit}"\n`);
        failCount++;
      }
    }
  });
}

// V12: 末尾 N-gram 衝突（誤答 3 つ間）
const tail = (s, n = 8) => s.slice(-n).replace(/[。、\s]+$/, '');
function editDistance(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}
for (const q of allQuestions) {
  if (!Array.isArray(q.choices) || q.correctIndex === undefined) continue;
  const wrongChoices = q.choices
    .map((c, i) => ({ text: c.text || '', idx: i }))
    .filter(x => x.idx !== q.correctIndex);
  if (wrongChoices.length < 2) continue;
  const tails = wrongChoices.map(x => tail(x.text));
  for (let a = 0; a < tails.length; a++) {
    for (let b = a + 1; b < tails.length; b++) {
      if (tails[a] === tails[b] || editDistance(tails[a], tails[b]) <= 1) {
        process.stderr.write(`[FAIL V12] ${q.id}: 誤答末尾衝突 "${tails[a]}"\n`);
        failCount++;
      }
    }
  }
}

if (failCount > 0) {
  process.exit(1);
} else {
  const totalQ = allQuestions.length;
  process.stdout.write(`All checks passed. (${totalQ} questions validated)\n`);
  process.exit(0);
}
