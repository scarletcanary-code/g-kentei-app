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

/**
 * sections フィールドを解析して、各 section の heading, body, termIds を返す
 */
function extractSections(content) {
  // sections: [ ... ] ブロックを取り出す
  const sectionsIdx = content.indexOf('sections:');
  if (sectionsIdx === -1) return [];
  const arrStart = content.indexOf('[', sectionsIdx);
  if (arrStart === -1) return [];

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

  // 各 section オブジェクト { ... } を分割する
  const sections = [];
  let objDepth = 0;
  let objStart = -1;
  for (let i = 0; i < arrContent.length; i++) {
    if (arrContent[i] === '{') {
      if (objDepth === 0) objStart = i;
      objDepth++;
    } else if (arrContent[i] === '}') {
      objDepth--;
      if (objDepth === 0 && objStart !== -1) {
        const objStr = arrContent.slice(objStart + 1, i);
        sections.push(parseSection(objStr));
        objStart = -1;
      }
    }
  }
  return sections;
}

function parseSection(objStr) {
  // heading を抽出
  let heading = null;
  const headingMatch = objStr.match(/heading:\s*['"`]([\s\S]*?)['"`],/);
  if (headingMatch) heading = headingMatch[1];

  // body を抽出（複数行対応）
  let body = null;
  const bodyMatch = objStr.match(/body:\s*['"`]([\s\S]*?)['"`],/);
  if (bodyMatch) body = bodyMatch[1];

  // termIds を抽出
  const termIdsMatch = objStr.match(/termIds:\s*\[([^\]]*)\]/);
  let termIds = [];
  if (termIdsMatch) {
    const itemRegex = /['"`]([^'"`\n]+)['"`]/g;
    let m;
    while ((m = itemRegex.exec(termIdsMatch[1])) !== null) {
      termIds.push(m[1]);
    }
  }

  return { heading, body, termIds };
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

const validChapterIds = new Set(['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8']);

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
    const m = content.match(/overview:\s*([\s\S]*?),\s*\n\s+(?:prerequisites|keyTermIds|sections)/);
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
  const sourceRefSupplements = extractArrayField(content, 'source_ref_supplements');
  const prerequisites = extractArrayField(content, 'prerequisites');
  const relatedChapters = extractArrayField(content, 'relatedChapters');
  const sections = extractSections(content);

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
        if (line.includes('keyTermIds:') || line.includes('prerequisites:') || line.includes('sections:')) break;
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
    sourceRefSupplements,
    prerequisites,
    relatedChapters,
    sections,
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

  // 新規追加チェック

  // 9. sections.length >= 3 && sections.length <= 5
  if (ch.sections.length >= 3 && ch.sections.length <= 5) {
    pass(`${label}: sections.length = ${ch.sections.length} (3〜5)`);
  } else {
    fail(`${label}: sections.length = ${ch.sections.length} (expected 3〜5)`);
  }

  // 10. 各 section.heading が 10〜60 文字
  for (let si = 0; si < ch.sections.length; si++) {
    const section = ch.sections[si];
    if (section.heading === null) {
      fail(`${label}: sections[${si}].heading is null`);
    } else {
      const hLen = section.heading.length;
      if (hLen >= 10 && hLen <= 60) {
        pass(`${label}: sections[${si}].heading.length = ${hLen} (10〜60)`);
      } else {
        fail(`${label}: sections[${si}].heading.length = ${hLen} (expected 10〜60) heading="${section.heading}"`);
      }
    }

    // 11. 各 section.body が 200〜500 文字
    if (section.body === null) {
      fail(`${label}: sections[${si}].body is null`);
    } else {
      const bLen = section.body.length;
      if (bLen >= 200 && bLen <= 500) {
        pass(`${label}: sections[${si}].body.length = ${bLen} (200〜500)`);
      } else {
        fail(`${label}: sections[${si}].body.length = ${bLen} (expected 200〜500)`);
      }
    }

    // 12. section.termIds の全 ID が terms.json に実在（termIds が存在する場合のみ）
    for (const tid of section.termIds) {
      if (termIds.has(tid)) {
        pass(`${label}: sections[${si}].termId "${tid}" found in terms.json`);
      } else {
        fail(`${label}: sections[${si}].termId "${tid}" NOT found in terms.json`);
      }
    }
  }

  // 13. prerequisites の全 ID が ch1〜ch8 に実在し、自章 ID を含まない
  for (const prereqId of ch.prerequisites) {
    if (!validChapterIds.has(prereqId)) {
      fail(`${label}: prerequisites "${prereqId}" is not a valid chapter ID (ch1〜ch8)`);
    } else if (prereqId === ch.categoryId) {
      fail(`${label}: prerequisites contains self chapter ID "${prereqId}"`);
    } else {
      pass(`${label}: prerequisites "${prereqId}" is valid`);
    }
  }

  // 14. relatedChapters の全 ID が ch1〜ch8 に実在し、自章 ID を含まない
  for (const relId of ch.relatedChapters) {
    if (!validChapterIds.has(relId)) {
      fail(`${label}: relatedChapters "${relId}" is not a valid chapter ID (ch1〜ch8)`);
    } else if (relId === ch.categoryId) {
      fail(`${label}: relatedChapters contains self chapter ID "${relId}"`);
    } else {
      pass(`${label}: relatedChapters "${relId}" is valid`);
    }
  }

  // 15. source_ref_supplements が存在する場合、各要素が 5 文字以上
  for (const sup of ch.sourceRefSupplements) {
    if (sup.length >= 5) {
      pass(`${label}: source_ref_supplement length = ${sup.length} >= 5`);
    } else {
      fail(`${label}: source_ref_supplement "${sup}" length = ${sup.length} < 5`);
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
