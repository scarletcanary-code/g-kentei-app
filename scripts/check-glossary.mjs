#!/usr/bin/env node
/**
 * check-glossary.mjs
 * 用語集データ（terms.json）の整合性を検証するスクリプト
 * exit 0: 全検証通過
 * exit 1: 1件以上の失敗（チェック1〜3, 5 のみ）
 * チェック4（サニティ境界）は警告のみで exit 1 にしない
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// terms.json を読み込む
const termsRaw = readFileSync(join(projectRoot, 'src/data/glossary/terms.json'), 'utf-8');
const terms = JSON.parse(termsRaw);

let failures = 0;
let warnings = 0;

function fail(msg) {
  process.stderr.write(`FAIL: ${msg}\n`);
  failures++;
}

function warn(msg) {
  process.stdout.write(`WARN: ${msg}\n`);
  warnings++;
}

function pass(msg) {
  process.stdout.write(`PASS: ${msg}\n`);
}

// チェック1: エントリ数が 129 件
if (terms.length === 129) {
  pass(`エントリ数 = ${terms.length} (expected 129)`);
} else {
  fail(`エントリ数 = ${terms.length} (expected 129)`);
}

// チェック2: 全129語に intermediateDetail が存在し空文字列でないこと
const missingIntermediate = terms.filter(
  (t) => !t.intermediateDetail || t.intermediateDetail === ''
);
if (missingIntermediate.length === 0) {
  pass(`intermediateDetail 未設定: 0 件`);
} else {
  fail(
    `intermediateDetail 未設定: ${missingIntermediate.length} 件 — ${missingIntermediate
      .map((t) => t.id)
      .join(', ')}`
  );
}

// チェック3: intermediateDetail が definition と完全一致しないこと
const sameAsDefinition = terms.filter(
  (t) => t.intermediateDetail && t.intermediateDetail === t.definition
);
if (sameAsDefinition.length === 0) {
  pass(`intermediateDetail と definition の完全一致: 0 件`);
} else {
  fail(
    `intermediateDetail が definition と完全一致している件数: ${sameAsDefinition.length} — ${sameAsDefinition
      .map((t) => t.id)
      .join(', ')}`
  );
}

// チェック4: サニティチェック（緩い境界 30〜600 字）— 警告のみ、exit 1 にしない
const sanityOutOfRange = terms.filter(
  (t) => t.intermediateDetail && (t.intermediateDetail.length < 30 || t.intermediateDetail.length > 600)
);
if (sanityOutOfRange.length === 0) {
  pass(`intermediateDetail 字数境界逸脱（30〜600字）: 0 件`);
} else {
  warn(
    `intermediateDetail 字数境界逸脱（30〜600字）: ${sanityOutOfRange.length} 件 — ${sanityOutOfRange
      .map((t) => `${t.id}(${t.intermediateDetail.length}字)`)
      .join(', ')}`
  );
}

// チェック5: 既存フィールド整合性
const REQUIRED_FIELDS = ['id', 'term', 'termEn', 'categoryId', 'definition', 'detail', 'relatedTermIds', 'importance'];

const missingFields = [];
for (const t of terms) {
  for (const f of REQUIRED_FIELDS) {
    if (t[f] === undefined || t[f] === null) {
      missingFields.push(`${t.id}: missing field "${f}"`);
    }
  }
}
if (missingFields.length === 0) {
  pass(`全エントリの必須フィールド存在確認: OK`);
} else {
  for (const msg of missingFields) {
    fail(msg);
  }
}

// チェック5b: id のグローバル一意性
const idCounts = {};
for (const t of terms) {
  idCounts[t.id] = (idCounts[t.id] || 0) + 1;
}
const duplicateIds = Object.entries(idCounts).filter(([, count]) => count > 1);
if (duplicateIds.length === 0) {
  pass(`id グローバル一意: OK`);
} else {
  for (const [id, count] of duplicateIds) {
    fail(`id "${id}" が ${count} 件重複している`);
  }
}

// チェック5c: relatedTermIds の全値が同 JSON 内の id として実在すること
const allIds = new Set(terms.map((t) => t.id));
const orphanRefs = [];
for (const t of terms) {
  if (!Array.isArray(t.relatedTermIds)) continue;
  for (const rid of t.relatedTermIds) {
    if (!allIds.has(rid)) {
      orphanRefs.push(`${t.id}: relatedTermId "${rid}" は存在しない`);
    }
  }
}
if (orphanRefs.length === 0) {
  pass(`relatedTermIds 孤立参照: 0 件`);
} else {
  for (const msg of orphanRefs) {
    fail(msg);
  }
}

// 集計
process.stdout.write(`\n`);
process.stdout.write(`--- 結果サマリ ---\n`);
process.stdout.write(`失敗: ${failures} 件\n`);
process.stdout.write(`警告: ${warnings} 件\n`);
process.stdout.write(`missing intermediateDetail: ${missingIntermediate.length}\n`);

if (failures === 0) {
  process.stdout.write('All checks passed.\n');
  process.exit(0);
} else {
  process.stderr.write(`${failures} check(s) failed.\n`);
  process.exit(1);
}
