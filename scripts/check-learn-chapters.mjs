#!/usr/bin/env node
/**
 * check-learn-chapters.mjs
 * 学習モードデータの整合性を検証するスクリプト
 * exit 0: 全検証通過
 * exit 1: 1件以上の失敗
 */

import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const require = createRequire(import.meta.url);

// terms.json を読み込む
const termsRaw = readFileSync(join(projectRoot, 'src/data/glossary/terms.json'), 'utf-8');
const terms = JSON.parse(termsRaw);
const termIds = new Set(terms.map(t => t.id));

// 各章の questions JSON を読み込む
const chapterQuestionIds = {};
for (let i = 1; i <= 8; i++) {
  const raw = readFileSync(join(projectRoot, `src/data/questions/ch${i}.json`), 'utf-8');
  const questions = JSON.parse(raw);
  chapterQuestionIds[`ch${i}`] = new Set(questions.map(q => q.id));
}

// learnデータをtypeスクリプトから直接読み込む（TS実行なし）
// TSをそのまま解析するのは難しいためJSに変換せずに専用の簡易パーサーで読む
// 代わりに各chN.tsを動的importするが、.tsはNode.jsで直接importできないため
// データを再定義して検証する方式を採用する

// 各chN.tsのデータをハードコードして検証
// （データファイルの内容を直接ここで持つのではなく、ファイルを読み込んでregexpで解析する）

function extractStringField(content, fieldName) {
  // 'fieldName: '...' または "fieldName: "..." をマッチ
  const regex = new RegExp(`${fieldName}:\\s*[\`'"]([\\s\\S]*?)[\`'"],?\\s*\\n`);
  const m = content.match(regex);
  if (m) return m[1];
  // バックティックの場合
  const regex2 = new RegExp(`${fieldName}:\\s*\`([\\s\\S]*?)\`,`);
  const m2 = content.match(regex2);
  if (m2) return m2[1];
  return null;
}

function extractArrayField(content, fieldName) {
  // fieldName: [ ... ] を取り出す
  const startIdx = content.indexOf(`${fieldName}:`);
  if (startIdx === -1) return [];
  const arrStart = content.indexOf('[', startIdx);
  if (arrStart === -1) return [];
  // 対応する ] を探す
  let depth = 0;
  let arrEnd = -1;
  for (let i = arrStart; i < content.length; i++) {
    if (content[i] === '[') depth++;
    else if (content[i] === ']') {
      depth--;
      if (depth === 0) { arrEnd = i; break; }
    }
  }
  if (arrEnd === -1) return [];
  const arrContent = content.slice(arrStart + 1, arrEnd);
  // 各要素を抽出（文字列のみ）
  const items = [];
  const itemRegex = /['"`]([^'"`\n]+)['"`]/g;
  let match;
  while ((match = itemRegex.exec(arrContent)) !== null) {
    items.push(match[1]);
  }
  return items;
}

let failures = 0;

function fail(msg) {
  process.stderr.write(`FAIL: ${msg}\n`);
  failures++;
}

function pass(msg) {
  process.stdout.write(`PASS: ${msg}\n`);
}

const chapters = [];

for (let i = 1; i <= 8; i++) {
  const filePath = join(projectRoot, `src/data/learn/ch${i}.ts`);
  const content = readFileSync(filePath, 'utf-8');

  // overview を抽出（バックティック文字列に対応）
  let overview = null;
  const btMatch = content.match(/overview:\s*\n?\s*'([^']*(?:\s*\+\s*'[^']*)*)'|overview:\s*"([^"]*)"|overview:\s*`([\s\S]*?)`/);
  if (btMatch) {
    overview = btMatch[1] || btMatch[2] || btMatch[3];
  }

  // overviewをより確実に取り出す
  // 'overview:\n    ...' パターン
  const ovIdx = content.indexOf('overview:');
  if (ovIdx !== -1 && overview === null) {
    const after = content.slice(ovIdx + 'overview:'.length).trimStart();
    if (after[0] === "'") {
      // シングルクォート
      const end = after.indexOf("',");
      if (end !== -1) overview = after.slice(1, end);
    } else if (after[0] === '"') {
      const end = after.indexOf('",');
      if (end !== -1) overview = after.slice(1, end);
    }
  }

  // より確実な取り出し: ファイルからoverviewブロックを直接スライス
  if (overview === null) {
    const m = content.match(/overview:\s*\n\s+'([\s\S]*?)',\s*\n\s+keyTermIds/);
    if (m) overview = m[1].replace(/'\s*\+\s*'/g, '').replace(/\s+/g, ' ');
  }

  // TSの文字列連結パターンに対応
  if (overview === null) {
    // 複数行にわたる文字列
    const m = content.match(/overview:\s*([\s\S]*?),\s*\n\s+keyTermIds/);
    if (m) {
      const raw = m[1];
      // シングルクォートを連結しているケースを解除
      const cleaned = raw
        .replace(/^\s*'/m, '')
        .replace(/'\s*\+\s*\n\s*'/gm, '')
        .replace(/'\s*$/m, '')
        .trim();
      overview = cleaned;
    }
  }

  const keyTermIds = extractArrayField(content, 'keyTermIds');
  const keyPoints = extractArrayField(content, 'keyPoints');
  const exampleQuestionIds = extractArrayField(content, 'exampleQuestionIds');
  const sourceRefs = extractArrayField(content, 'source_refs');

  // overviewの文字数カウント
  // ファイルの実際のoverview文字列長を確実に取得するための別アプローチ
  // overviewフィールドの文字列を直接抽出
  let overviewLength = 0;
  if (overview) {
    overviewLength = overview.length;
  } else {
    // フォールバック: ファイルを行単位で解析
    const lines = content.split('\n');
    let inOverview = false;
    let overviewLines = [];
    for (const line of lines) {
      if (line.includes('overview:')) {
        inOverview = true;
        const startQ = line.indexOf("'");
        if (startQ !== -1) overviewLines.push(line.slice(startQ + 1));
      } else if (inOverview) {
        if (line.includes('keyTermIds:')) break;
        overviewLines.push(line.replace(/^\s*'/, '').replace(/'\s*\+?\s*$/, '').replace(/,\s*$/, '').trimEnd());
      }
    }
    overview = overviewLines.join('');
    overviewLength = overview.length;
  }

  chapters.push({
    categoryId: `ch${i}`,
    overview,
    overviewLength,
    keyTermIds,
    keyPoints,
    exampleQuestionIds,
    sourceRefs,
  });
}

// --- 検証 ---

// 1. length === 8
if (chapters.length === 8) {
  pass('ALL_LEARN_CHAPTERS.length === 8');
} else {
  fail(`ALL_LEARN_CHAPTERS.length === ${chapters.length} (expected 8)`);
}

for (const ch of chapters) {
  const label = ch.categoryId;

  // 2. overview.length >= 200
  if (ch.overviewLength >= 200) {
    pass(`${label}: overview.length = ${ch.overviewLength} >= 200`);
  } else {
    fail(`${label}: overview.length = ${ch.overviewLength} < 200`);
  }

  // 3. keyPoints.length >= 5
  if (ch.keyPoints.length >= 5) {
    pass(`${label}: keyPoints.length = ${ch.keyPoints.length} >= 5`);
  } else {
    fail(`${label}: keyPoints.length = ${ch.keyPoints.length} < 5`);
  }

  // 4. keyTermIds.length >= 5 かつ <= 10
  if (ch.keyTermIds.length >= 5 && ch.keyTermIds.length <= 10) {
    pass(`${label}: keyTermIds.length = ${ch.keyTermIds.length} (5〜10)`);
  } else {
    fail(`${label}: keyTermIds.length = ${ch.keyTermIds.length} (expected 5〜10)`);
  }

  // 5. 全 keyTermIds が terms.json に存在する
  for (const tid of ch.keyTermIds) {
    if (termIds.has(tid)) {
      pass(`${label}: keyTermId "${tid}" found in terms.json`);
    } else {
      fail(`${label}: keyTermId "${tid}" NOT found in terms.json`);
    }
  }

  // 6. exampleQuestionIds.length === 3
  if (ch.exampleQuestionIds.length === 3) {
    pass(`${label}: exampleQuestionIds.length === 3`);
  } else {
    fail(`${label}: exampleQuestionIds.length = ${ch.exampleQuestionIds.length} (expected 3)`);
  }

  // 7. 全 exampleQuestionIds が対応章の questions JSON に存在する
  const qIds = chapterQuestionIds[ch.categoryId];
  for (const qid of ch.exampleQuestionIds) {
    if (qIds && qIds.has(qid)) {
      pass(`${label}: exampleQuestionId "${qid}" found in questions/${ch.categoryId}.json`);
    } else {
      fail(`${label}: exampleQuestionId "${qid}" NOT found in questions/${ch.categoryId}.json`);
    }
  }

  // 8. source_refs.length >= 1 かつ各要素 .length >= 5
  if (ch.sourceRefs.length >= 1) {
    pass(`${label}: source_refs.length = ${ch.sourceRefs.length} >= 1`);
  } else {
    fail(`${label}: source_refs.length = ${ch.sourceRefs.length} < 1`);
  }
  for (const ref of ch.sourceRefs) {
    if (ref.length >= 5) {
      pass(`${label}: source_ref length = ${ref.length} >= 5`);
    } else {
      fail(`${label}: source_ref "${ref}" length = ${ref.length} < 5`);
    }
  }
}

if (failures === 0) {
  process.stdout.write('\nAll checks passed.\n');
  process.exit(0);
} else {
  process.stderr.write(`\n${failures} check(s) failed.\n`);
  process.exit(1);
}
