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

if (failCount > 0) {
  process.exit(1);
} else {
  const totalQ = allQuestions.length;
  process.stdout.write(`All checks passed. (${totalQ} questions validated)\n`);
  process.exit(0);
}
