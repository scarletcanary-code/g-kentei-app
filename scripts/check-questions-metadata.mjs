#!/usr/bin/env node
/**
 * check-questions-metadata.mjs
 * 問題データのメタデータ（learningObjective / cognitiveLevel /
 * misconceptionTarget / optionRationales）の充足状況を検証する
 *
 * 使用方法:
 *   node scripts/check-questions-metadata.mjs
 *   node scripts/check-questions-metadata.mjs --strict
 *
 * 終了コード:
 *   0: FAIL なし
 *   1: FAIL あり
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const questionsDir = path.resolve(__dirname, '../src/data/questions');
const isStrict = process.argv.includes('--strict');

// 全 ch1〜ch8 を読み込む
const CHAPTERS = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8'];
const allQuestions = [];

for (const ch of CHAPTERS) {
  const filePath = path.join(questionsDir, `${ch}.json`);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    process.stderr.write(`[FAIL PARSE] ${ch}.json: JSON parse error: ${e.message}\n`);
    process.exit(1);
  }
  allQuestions.push(...data);
}

let failCount = 0;
let warnCount = 0;

const VALID_COGNITIVE_LEVELS = ['recall', 'understand', 'apply', 'compare'];

for (const q of allQuestions) {
  // C1: cognitiveLevel 4値チェック
  if (q.cognitiveLevel !== undefined) {
    if (!VALID_COGNITIVE_LEVELS.includes(q.cognitiveLevel)) {
      process.stderr.write(`[FAIL C1] ${q.id}: cognitiveLevel が無効な値 "${q.cognitiveLevel}"\n`);
      failCount++;
    }
  } else {
    process.stderr.write(`[WARN C1] ${q.id}: cognitiveLevel が未設定\n`);
    warnCount++;
  }

  // C2: optionRationales 長さチェック
  if (q.optionRationales !== undefined) {
    if (q.optionRationales.length !== q.choices.length) {
      process.stderr.write(`[FAIL C2] ${q.id}: optionRationales 長さ (${q.optionRationales.length}) が choices (${q.choices.length}) と不一致\n`);
      failCount++;
    }
  } else {
    process.stderr.write(`[WARN C2] ${q.id}: optionRationales が未設定\n`);
    warnCount++;
  }

  // C3: misconceptionTarget 必須チェック（cognitiveLevel が recall 以外）
  if (q.cognitiveLevel !== undefined && q.cognitiveLevel !== 'recall') {
    if (q.misconceptionTarget === undefined || q.misconceptionTarget === null) {
      if (isStrict) {
        process.stderr.write(`[FAIL C3] ${q.id}: misconceptionTarget が未設定 (cognitiveLevel=${q.cognitiveLevel})\n`);
        failCount++;
      } else {
        process.stderr.write(`[WARN C3] ${q.id}: misconceptionTarget が未設定 (cognitiveLevel=${q.cognitiveLevel})\n`);
        warnCount++;
      }
    }
  }

  // C4: learningObjective 文字数チェック
  if (q.learningObjective !== undefined) {
    const len = q.learningObjective.length;
    if (len < 30 || len > 200) {
      process.stderr.write(`[FAIL C4] ${q.id}: learningObjective 文字数 ${len} が範囲外 (30〜200字)\n`);
      failCount++;
    }
  } else {
    process.stderr.write(`[WARN C4] ${q.id}: learningObjective が未設定\n`);
    warnCount++;
  }

  // C5: optionRationales 個別文字数チェック
  if (q.optionRationales !== undefined && Array.isArray(q.optionRationales)) {
    q.optionRationales.forEach((rationale, idx) => {
      const len = rationale.length;
      if (len < 20 || len > 200) {
        process.stderr.write(`[FAIL C5] ${q.id}: optionRationales[${idx}] 文字数 ${len} が範囲外 (20〜200字)\n`);
        failCount++;
      }
    });
  }
}

const totalIssues = failCount + warnCount;
process.stderr.write(`${totalIssues} issues found (${failCount} FAIL, ${warnCount} WARN).\n`);

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
