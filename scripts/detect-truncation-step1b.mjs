/**
 * detect-truncation-step1b.mjs
 * Step1b: 途中切れ・禁止文末・正答テキスト不一致を検出し tmp/step1b-candidates.json に出力する。
 *
 * 使い方:
 *   node scripts/detect-truncation-step1b.mjs
 *
 * 入力:
 *   ../.harness/exports/questions-2026-05-02-step1.csv
 *
 * 出力:
 *   tmp/step1b-candidates.json  - 検出結果の配列
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const repoRoot = join(projectRoot, '..');
const csvPath = join(repoRoot, '.harness/exports/questions-2026-05-02-step1.csv');
const outPath = join(projectRoot, 'tmp/step1b-candidates.json');

mkdirSync(join(projectRoot, 'tmp'), { recursive: true });

// ---- CSV parser (BOM-aware, RFC 4180 準拠) ----
function splitLines(text) {
  const lines = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuote && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuote = !inQuote;
        cur += ch;
      }
    } else if ((ch === '\r' || ch === '\n') && !inQuote) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      lines.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.length > 0) lines.push(cur);
  return lines;
}

function splitRow(line) {
  const fields = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === ',' && !inQuote) {
      fields.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

function parseCsv(text) {
  const raw = text.startsWith('﻿') ? text.slice(1) : text;
  const lines = splitLines(raw).filter(l => l.trim() !== '');
  return lines.map(splitRow);
}

// ---- Load CSV ----
const rawText = readFileSync(csvPath, 'utf8');
const allRows = parseCsv(rawText);

const headers = allRows[0];
const dataRows = allRows.slice(1).filter(r => r.some(c => c.trim() !== ''));

const colIdx = {};
for (let i = 0; i < headers.length; i++) {
  colIdx[headers[i]] = i;
}

// ---- 重点 13 ID ----
const FOCUS_IDS = new Set([
  'ch2-026', 'ch3-031', 'ch3-045', 'ch4-015', 'ch4-018', 'ch4-024',
  'ch5-017', 'ch5-024', 'ch6-027', 'ch6-034', 'ch7-008', 'ch7-020', 'ch7-028',
]);

// ---- 禁止文末パターン ----
const FORBIDDEN_ENDINGS = [
  '回答を生成させ、',
  'ため、',
  '新タ',
  '、',
  '必',
  '勾',
  '均',
  '生',
];

function hasForbiddenEnding(value) {
  for (const pat of FORBIDDEN_ENDINGS) {
    if (value.endsWith(pat)) return pat;
  }
  return null;
}

// ---- Detection ----
const candidates = [];

const CHOICE_COLS = ['choice0', 'choice1', 'choice2', 'choice3'];
const SEIKAI_COL = '正答テキスト';
const TARGET_7_COLS = [...CHOICE_COLS, SEIKAI_COL, 'explanation', 'optionRationales'];

for (const row of dataRows) {
  const id = row[colIdx['id']] || '';
  if (!id) continue;

  const correctIndex = parseInt(row[colIdx['correctIndex']] || '0');
  const seikai = row[colIdx[SEIKAI_COL]] || '';
  const correctChoice = row[colIdx[CHOICE_COLS[correctIndex]]] || '';

  // (1) 重点 13 ID の途中切れ疑いセル
  if (FOCUS_IDS.has(id)) {
    for (const col of TARGET_7_COLS) {
      const ci = colIdx[col];
      if (ci === undefined) continue;
      const val = row[ci] || '';
      const pat = hasForbiddenEnding(val.trim());
      if (pat) {
        candidates.push({
          type: 'focus_forbidden_ending',
          id,
          column: col,
          pattern: pat,
          value: val.trim(),
        });
      }
    }
  }

  // (2) 禁止文末パターン全 292 問 (choice0-3 / 正答テキスト)
  for (const col of [...CHOICE_COLS, SEIKAI_COL]) {
    const ci = colIdx[col];
    if (ci === undefined) continue;
    const val = row[ci] || '';
    const pat = hasForbiddenEnding(val.trim());
    if (pat) {
      // 重点IDは既に上で検出済みだが、ここでも記録（重複可）
      if (!FOCUS_IDS.has(id)) {
        candidates.push({
          type: 'forbidden_ending',
          id,
          column: col,
          pattern: pat,
          value: val.trim(),
        });
      }
    }
  }

  // (3) correctIndex が指す choice と 正答テキスト が不一致
  if (correctChoice !== seikai) {
    candidates.push({
      type: 'seikai_mismatch',
      id,
      column: SEIKAI_COL,
      correctIndex,
      correctChoice: correctChoice.slice(0, 100),
      seikaiValue: seikai.slice(0, 100),
    });
  }
}

writeFileSync(outPath, JSON.stringify(candidates, null, 2), 'utf8');
console.log(`Detected ${candidates.length} issues.`);
console.log(`  - focus_forbidden_ending: ${candidates.filter(c => c.type === 'focus_forbidden_ending').length}`);
console.log(`  - forbidden_ending: ${candidates.filter(c => c.type === 'forbidden_ending').length}`);
console.log(`  - seikai_mismatch: ${candidates.filter(c => c.type === 'seikai_mismatch').length}`);
console.log(`Output: ${outPath}`);
