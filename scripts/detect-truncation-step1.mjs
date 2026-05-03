/**
 * detect-truncation-step1.mjs
 * CSV を読み込み「途中切れ疑い」セルを検出して tmp/step1-candidates.json に書き出す。
 *
 * 使い方:
 *   node scripts/detect-truncation-step1.mjs
 *
 * 出力:
 *   tmp/step1-candidates.json  - { id, column, original, reason }[] の配列
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const repoRoot = join(projectRoot, '..');
const csvPath = join(repoRoot, '.harness/exports/questions-2026-04-30.csv');
const outPath = join(projectRoot, 'tmp/step1-candidates.json');

mkdirSync(join(projectRoot, 'tmp'), { recursive: true });

// ---- CSV parser (BOM-aware, quoted-field handling) ----
function parseCsv(text) {
  // Strip BOM
  const raw = text.startsWith('﻿') ? text.slice(1) : text;
  const lines = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') {
      if (inQuote && raw[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if ((ch === '\r' || ch === '\n') && !inQuote) {
      if (ch === '\r' && raw[i + 1] === '\n') i++;
      if (cur.length > 0) lines.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim().length > 0) lines.push(cur);

  // Split each line into fields (simple comma split — fields already unquoted above)
  // Actually we need to split on commas respecting quotes in original
  // Re-parse properly
  const result = [];
  for (const line of splitLines(raw)) {
    if (line.trim() === '') continue;
    result.push(splitRow(line));
  }
  return result;
}

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

const rawText = readFileSync(csvPath, 'utf8');
const allRows = parseCsv(rawText.startsWith('﻿') ? rawText.slice(1) : rawText);

const headers = allRows[0];
const dataRows = allRows.slice(1).filter(r => r.some(c => c.trim() !== ''));

const colIdx = {};
for (let i = 0; i < headers.length; i++) {
  colIdx[headers[i]] = i;
}

// ---- Detection rules ----

// Sentence-ending columns: these should end with 。or ！ or ？ or 」 or similar sentence terminators
const SENTENCE_COLS = ['explanation', 'learningObjective', 'misconceptionTarget'];
// Choice columns
const CHOICE_COLS = ['choice0', 'choice1', 'choice2', 'choice3'];
// All target columns
const TARGET_COLS = ['question', ...CHOICE_COLS, ...SENTENCE_COLS, 'optionRationales'];

// Particles that suggest truncation at end
const PARTICLE_SUFFIX_RE = /[はがをにでとからまでよりへも]$/;
// Connective forms at end
const CONNECTIVE_SUFFIX_RE = /[てでしに]$/;
// 「など」「等」followed by end of text
const NADO_RE = /(?:など|等)$/;
// Full-width space at end
const FULLWIDTH_SPACE_RE = /　$/;
// Ellipsis at end
const ELLIPSIS_RE = /[…]+$/;
// Sentence terminator
const SENTENCE_TERMINATOR_RE = /[。！？」）\]！？…]$/;

function detectTruncation(id, colName, value) {
  if (!value || value.trim() === '') return null;
  const v = value.trim();

  // optionRationales: split by ' || ' and check each block
  if (colName === 'optionRationales') {
    const blocks = v.split(' || ');
    const issues = [];
    for (const block of blocks) {
      const b = block.trim();
      if (!b) continue;
      const blockIssue = checkBlock(b);
      if (blockIssue) {
        issues.push(`block "${b.slice(0, 30)}...": ${blockIssue}`);
      }
    }
    if (issues.length > 0) {
      return `optionRationales ブロック途中切れ疑い: ${issues.join('; ')}`;
    }
    return null;
  }

  // choice columns: check for very short values
  if (CHOICE_COLS.includes(colName)) {
    if (v.length < 3) {
      return `choice 3文字未満 (${v.length}文字)`;
    }
    // Check for particle/connective suffix suggesting truncation
    if (PARTICLE_SUFFIX_RE.test(v)) {
      return `助詞末尾 (末尾: "${v.slice(-3)}")`;
    }
    if (CONNECTIVE_SUFFIX_RE.test(v) && v.length < 15) {
      return `連用形末尾かつ短い (末尾: "${v.slice(-3)}")`;
    }
    if (NADO_RE.test(v)) {
      return `「など」「等」で終了 (末尾: "${v.slice(-5)}")`;
    }
    if (FULLWIDTH_SPACE_RE.test(v)) {
      return `全角空白末尾`;
    }
    if (ELLIPSIS_RE.test(v)) {
      return `「…」末尾`;
    }
    return null;
  }

  // question column: should end with か。 or か？
  if (colName === 'question') {
    if (!v.endsWith('。') && !v.endsWith('？') && !v.endsWith('か。') && !v.endsWith('か？') && !v.endsWith('か') && !v.endsWith('？\n')) {
      if (PARTICLE_SUFFIX_RE.test(v)) {
        return `question 助詞末尾 (末尾: "${v.slice(-3)}")`;
      }
      if (CONNECTIVE_SUFFIX_RE.test(v)) {
        return `question 連用形末尾 (末尾: "${v.slice(-3)}")`;
      }
      if (NADO_RE.test(v)) {
        return `question「など」「等」で終了`;
      }
      if (FULLWIDTH_SPACE_RE.test(v)) {
        return `question 全角空白末尾`;
      }
      if (ELLIPSIS_RE.test(v)) {
        return `question「…」末尾`;
      }
    }
    return null;
  }

  // Sentence columns: explanation, learningObjective, misconceptionTarget
  if (SENTENCE_COLS.includes(colName)) {
    // These should end with 。or sentence terminator
    if (!SENTENCE_TERMINATOR_RE.test(v)) {
      if (PARTICLE_SUFFIX_RE.test(v)) {
        return `助詞末尾 (末尾: "${v.slice(-3)}")`;
      }
      if (CONNECTIVE_SUFFIX_RE.test(v)) {
        return `連用形末尾 (末尾: "${v.slice(-3)}")`;
      }
      if (NADO_RE.test(v)) {
        return `「など」「等」で終了 (末尾: "${v.slice(-5)}")`;
      }
      if (FULLWIDTH_SPACE_RE.test(v)) {
        return `全角空白末尾`;
      }
      if (ELLIPSIS_RE.test(v)) {
        return `「…」末尾`;
      }
    }
    return null;
  }

  return null;
}

function checkBlock(b) {
  if (!b) return null;
  // Block should end with 。or similar
  if (!SENTENCE_TERMINATOR_RE.test(b)) {
    if (PARTICLE_SUFFIX_RE.test(b)) {
      return `助詞末尾 "${b.slice(-3)}"`;
    }
    if (CONNECTIVE_SUFFIX_RE.test(b)) {
      return `連用形末尾 "${b.slice(-3)}"`;
    }
    if (NADO_RE.test(b)) {
      return `「など」「等」末尾`;
    }
    if (FULLWIDTH_SPACE_RE.test(b)) {
      return `全角空白末尾`;
    }
    if (ELLIPSIS_RE.test(b)) {
      return `「…」末尾`;
    }
  }
  return null;
}

// ---- Run detection ----
const candidates = [];

for (const row of dataRows) {
  const id = row[colIdx['id']] || '';
  if (!id) continue;

  for (const colName of TARGET_COLS) {
    const ci = colIdx[colName];
    if (ci === undefined) continue;
    const value = row[ci] || '';
    const reason = detectTruncation(id, colName, value);
    if (reason) {
      candidates.push({ id, column: colName, original: value.trim(), reason });
    }
  }
}

writeFileSync(outPath, JSON.stringify(candidates, null, 2), 'utf8');
console.log(`Detected ${candidates.length} truncation candidates.`);
console.log(`Output: ${outPath}`);
