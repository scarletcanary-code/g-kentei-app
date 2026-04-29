import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const questionsDir = path.resolve(__dirname, '../src/data/questions');
const outputDir = path.resolve(__dirname, '../../.harness/runs/0031-audit');

// Ensure output directory exists
fs.mkdirSync(outputDir, { recursive: true });

// Load all questions
const files = fs.readdirSync(questionsDir)
  .filter(f => f.endsWith('.json'))
  .sort();

const allQuestions = [];
const questionsByCategory = {};

for (const file of files) {
  const filePath = path.join(questionsDir, file);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    process.stderr.write(`[ERROR] ${file}: JSON parse error: ${e.message}\n`);
    process.exit(1);
  }
  const categoryId = file.replace('.json', '');
  questionsByCategory[categoryId] = data;
  allQuestions.push(...data.map(q => ({ ...q, _file: file, _categoryId: categoryId })));
}

// Heuristic helpers

const ABSOLUTE_PATTERN = /すべて|必ず|完全に|のみ[^を]|一切(?!の)/;
const DEFINITION_PATTERN = /[^\s]{1,20}(とは|とはなにか|とは何か|の説明として正しい|の定義として正しい|について正しく説明している)/;

function calcSpecialityDensity(text) {
  const katakana = (text.match(/[ァ-ヶー]{3,}/g) || []).join('').length;
  const ascii = (text.match(/[A-Za-z]{2,}/g) || []).join('').length;
  const numeric = (text.match(/[0-9]+/g) || []).join('').length;
  const brackets = (text.match(/（[^）]*）/g) || []).join('').length;
  const total = text.length;
  if (total === 0) return 0;
  return (katakana + ascii + numeric + brackets) / total;
}

function auditQuestion(q) {
  const checks = {};
  const reasons = [];

  // has_source_ref
  if (q.source_ref && q.source_ref.length >= 5) {
    checks.has_source_ref = 'PASS';
  } else {
    checks.has_source_ref = 'WARN';
    reasons.push('source_ref is missing or too short');
  }

  // has_learningObjective
  if (q.learningObjective) {
    checks.has_learningObjective = 'PASS';
  } else {
    checks.has_learningObjective = 'WARN';
    reasons.push('learningObjective is missing');
  }

  // has_cognitiveLevel
  if (q.cognitiveLevel) {
    checks.has_cognitiveLevel = 'PASS';
  } else {
    checks.has_cognitiveLevel = 'WARN';
    reasons.push('cognitiveLevel is missing');
  }

  // has_optionRationales
  if (q.optionRationales && Array.isArray(q.optionRationales) && q.optionRationales.length > 0) {
    checks.has_optionRationales = 'PASS';
  } else {
    checks.has_optionRationales = 'WARN';
    reasons.push('optionRationales is missing');
  }

  // has_misconceptionTarget
  if (q.misconceptionTarget) {
    checks.has_misconceptionTarget = 'PASS';
  } else {
    checks.has_misconceptionTarget = 'WARN';
    reasons.push('misconceptionTarget is missing');
  }

  // absolute_expression (V21 equivalent)
  const hasAbsolute = Array.isArray(q.choices) && q.choices.some(c => ABSOLUTE_PATTERN.test(c.text || ''));
  if (hasAbsolute) {
    checks.absolute_expression = 'WARN';
    reasons.push('absolute expression found in choices');
  } else {
    checks.absolute_expression = 'PASS';
  }

  // correct_specificity_skew (V19 equivalent)
  let hasSkew = false;
  if (Array.isArray(q.choices) && q.correctIndex !== undefined) {
    const correctText = (q.choices[q.correctIndex] || {}).text || '';
    const wrongTexts = q.choices
      .filter((_, i) => i !== q.correctIndex)
      .map(c => c.text || '');
    if (wrongTexts.length > 0) {
      const correctDensity = calcSpecialityDensity(correctText);
      const avgWrongDensity = wrongTexts.reduce((s, t) => s + calcSpecialityDensity(t), 0) / wrongTexts.length;
      if (correctDensity > avgWrongDensity * 1.5 && correctDensity > 0.15) {
        hasSkew = true;
      }
    }
  }
  if (hasSkew) {
    checks.correct_specificity_skew = 'WARN';
    reasons.push('correct answer has higher speciality density than distractors');
  } else {
    checks.correct_specificity_skew = 'PASS';
  }

  // definition_type (V20 equivalent)
  const isDefinitionType = DEFINITION_PATTERN.test(q.question || '');
  if (isDefinitionType) {
    checks.definition_type = 'WARN';
    reasons.push('problem type is definition-form');
  } else {
    checks.definition_type = 'PASS';
  }

  // manual_review_needed
  const missingMetadata = [
    checks.has_learningObjective,
    checks.has_cognitiveLevel,
    checks.has_optionRationales,
    checks.has_misconceptionTarget,
  ].some(v => v === 'WARN');
  if (checks.has_source_ref === 'WARN' && missingMetadata) {
    checks.manual_review_needed = 'WARN';
    reasons.push('source_ref missing and multiple metadata fields missing');
  } else {
    checks.manual_review_needed = 'PASS';
  }

  // Overall status
  let status;
  const hasFail = Object.values(checks).some(v => v === 'FAIL');
  const hasWarn = Object.values(checks).some(v => v === 'WARN');
  if (hasFail) {
    status = 'FAIL';
  } else if (hasWarn) {
    status = 'WARN';
  } else {
    status = 'PASS';
  }

  return {
    id: q.id,
    categoryId: q._categoryId,
    status,
    checks,
    reasons,
    note: 'Heuristic audit cannot determine factual accuracy or exam-likeness.',
  };
}

// Run audit
const results = allQuestions.map(auditQuestion);

// Write audit-results.json
const jsonPath = path.join(outputDir, 'audit-results.json');
fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2), 'utf8');
process.stdout.write(`Wrote ${jsonPath}\n`);

// Compute summary statistics
const totalCount = results.length;
const passCount = results.filter(r => r.status === 'PASS').length;
const warnCount = results.filter(r => r.status === 'WARN').length;
const failCount = results.filter(r => r.status === 'FAIL').length;

const missingSourceRef = results.filter(r => r.checks.has_source_ref === 'WARN').length;
const missingLO = results.filter(r => r.checks.has_learningObjective === 'WARN').length;
const missingCL = results.filter(r => r.checks.has_cognitiveLevel === 'WARN').length;
const missingOR = results.filter(r => r.checks.has_optionRationales === 'WARN').length;
const missingMT = results.filter(r => r.checks.has_misconceptionTarget === 'WARN').length;
const absExpr = results.filter(r => r.checks.absolute_expression === 'WARN').length;
const specSkew = results.filter(r => r.checks.correct_specificity_skew === 'WARN').length;
const defType = results.filter(r => r.checks.definition_type === 'WARN').length;
const manualReview = results.filter(r => r.checks.manual_review_needed === 'WARN').length;

// cognitiveLevel distribution
const clCounts = { recall: 0, understand: 0, apply: 0, compare: 0 };
let clTotal = 0;
for (const r of results) {
  const q = allQuestions.find(q => q.id === r.id);
  if (q && q.cognitiveLevel && clCounts[q.cognitiveLevel] !== undefined) {
    clCounts[q.cognitiveLevel]++;
    clTotal++;
  }
}

// Category stats
const categoryStats = {};
for (const [catId, questions] of Object.entries(questionsByCategory)) {
  const catResults = results.filter(r => r.categoryId === catId);
  categoryStats[catId] = {
    total: catResults.length,
    pass: catResults.filter(r => r.status === 'PASS').length,
    warn: catResults.filter(r => r.status === 'WARN').length,
    fail: catResults.filter(r => r.status === 'FAIL').length,
    missingSourceRef: catResults.filter(r => r.checks.has_source_ref === 'WARN').length,
    missingLO: catResults.filter(r => r.checks.has_learningObjective === 'WARN').length,
    missingCL: catResults.filter(r => r.checks.has_cognitiveLevel === 'WARN').length,
  };
}

// Priority classification
const highPriority = results.filter(r =>
  r.checks.has_source_ref === 'WARN' && r.checks.manual_review_needed === 'WARN'
);
const mediumPriority = results.filter(r => {
  if (highPriority.includes(r)) return false;
  const warnChecks = Object.values(r.checks).filter(v => v === 'WARN').length;
  return warnChecks >= 3 ||
    r.checks.absolute_expression === 'WARN' ||
    r.checks.definition_type === 'WARN';
});
const lowPriority = results.filter(r => {
  if (r.status !== 'WARN') return false;
  if (highPriority.includes(r)) return false;
  if (mediumPriority.includes(r)) return false;
  return true;
});

// Build audit-summary.md
const today = new Date().toISOString().slice(0, 10);

const catTableRows = Object.entries(categoryStats)
  .map(([catId, s]) =>
    `| ${catId} | ${s.total} | ${s.pass} | ${s.warn} | ${s.fail} | ${s.missingSourceRef} | ${s.missingLO} | ${s.missingCL} |`
  )
  .join('\n');

const highRows = highPriority.length > 0
  ? highPriority.map(r => `- ${r.id}: ${r.reasons.join('; ')}`).join('\n')
  : '（該当なし）';

const mediumRows = mediumPriority.length > 0
  ? mediumPriority.map(r => `- ${r.id}: ${r.reasons.join('; ')}`).join('\n')
  : '（該当なし）';

const lowRows = lowPriority.length > 0
  ? lowPriority.map(r => `- ${r.id}: ${r.reasons.join('; ')}`).join('\n')
  : '（該当なし）';

const summary = `# クイズ問題品質監査レポート（0031）

実行日: ${today}

## 全体サマリ

| 項目 | 件数 |
|---|---|
| 総問題数 | ${totalCount} |
| PASS | ${passCount} |
| WARN | ${warnCount} |
| FAIL | ${failCount} |
| source_ref 未設定 | ${missingSourceRef} |
| learningObjective 未設定 | ${missingLO} |
| cognitiveLevel 未設定 | ${missingCL} |
| optionRationales 未設定 | ${missingOR} |
| misconceptionTarget 未設定 | ${missingMT} |
| 絶対表現含む選択肢あり | ${absExpr} |
| 正答専門語密度スキューあり | ${specSkew} |
| 用語定義型問題 | ${defType} |
| 要手動レビュー | ${manualReview} |

cognitiveLevel 設定済み問題: ${clTotal} 件
（分布: recall=${clCounts.recall}, understand=${clCounts.understand}, apply=${clCounts.apply}, compare=${clCounts.compare}）

## カテゴリ別集計

| カテゴリ | 総問 | PASS | WARN | FAIL | source_ref欠落 | LO欠落 | CL欠落 |
|---|---|---|---|---|---|---|---|
${catTableRows}

## 修正優先度分類

### high priority（即時対応推奨）
条件: source_ref 未設定、かつ manual_review_needed が WARN

${highRows}

### medium priority（0032 での対応対象）
条件: WARN チェック数 >= 3、または絶対表現を含む選択肢あり、または定義型問題

${mediumRows}

### low priority（余力があれば対応）
条件: 上記以外の WARN

${lowRows}

---
*このレポートはヒューリスティック自動監査の結果です。事実の正確性・G検定への適合性は人手によるレビューが必要です。*
`;

const mdPath = path.join(outputDir, 'audit-summary.md');
fs.writeFileSync(mdPath, summary, 'utf8');
process.stdout.write(`Wrote ${mdPath}\n`);
process.stdout.write(`Audit complete: ${totalCount} questions processed (PASS=${passCount}, WARN=${warnCount}, FAIL=${failCount})\n`);
process.exit(0);
