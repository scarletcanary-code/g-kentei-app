import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const questionsDir = join(__dirname, '..', 'src', 'data', 'questions');

const files = readdirSync(questionsDir).filter((f) => f.endsWith('.json'));

const totalCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };
let totalQuestions = 0;

for (const file of files) {
  const filePath = join(questionsDir, file);
  const data = JSON.parse(readFileSync(filePath, 'utf-8'));
  const questions = Array.isArray(data) ? data : data.questions ?? [];

  const fileCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const q of questions) {
    const idx = q.correctIndex;
    if (idx >= 0 && idx <= 3) {
      fileCounts[idx]++;
      totalCounts[idx]++;
      totalQuestions++;
    }
  }

  const fileTotal = questions.length;
  const parts = [0, 1, 2, 3].map((i) => {
    const pct = fileTotal > 0 ? ((fileCounts[i] / fileTotal) * 100).toFixed(1) : '0.0';
    return `correctIndex ${i}: ${fileCounts[i]}問 (${pct}%)`;
  });
  console.log(`[${file}] ${parts.join(', ')}`);
}

const globalParts = [0, 1, 2, 3].map((i) => {
  const pct = totalQuestions > 0 ? ((totalCounts[i] / totalQuestions) * 100).toFixed(1) : '0.0';
  return `correctIndex ${i}: ${totalCounts[i]}問 (${pct}%)`;
});
console.log(`[全体] ${globalParts.join(', ')}`);

let hasBias = false;
for (const i of [0, 1, 2, 3]) {
  const pct = totalQuestions > 0 ? (totalCounts[i] / totalQuestions) * 100 : 0;
  if (pct > 50) {
    console.log(`警告: correctIndex ${i} の割合が ${pct.toFixed(1)}% で 50% を超えています`);
    hasBias = true;
  }
}

process.exit(hasBias ? 1 : 0);
