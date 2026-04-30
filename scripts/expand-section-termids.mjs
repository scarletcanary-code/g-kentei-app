#!/usr/bin/env node
/**
 * expand-section-termids.mjs
 * 各章 (ch1-ch8) の LearnSection.termIds をヒューリスティックなgrep で拡充する。
 * Usage:
 *   node scripts/expand-section-termids.mjs            # 実行
 *   node scripts/expand-section-termids.mjs --dry-run  # ドライラン（書き戻しなし）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const HARNESS_RUNS = path.resolve(ROOT, '..', '.harness', 'runs', '0048');

const isDryRun = process.argv.includes('--dry-run');
const MAX_TERM_IDS = 6;

// ──────────────────────────────────────────────
// 1. 用語集ロード
// ──────────────────────────────────────────────
const termsPath = path.join(ROOT, 'src', 'data', 'glossary', 'terms.json');
const ALL_TERMS = JSON.parse(fs.readFileSync(termsPath, 'utf8'));

// ──────────────────────────────────────────────
// 2. 章ファイルから termIds を正規表現で抽出・更新するユーティリティ
// ──────────────────────────────────────────────

/**
 * TypeScript ファイルから各セクションの termIds を抽出する。
 * 戻り値: Array<{ start: number, end: number, ids: string[] }>
 *   start/end はそのマッチのインデックス（ファイル文字列上）
 */
function extractTermIdBlocks(src) {
  const blocks = [];
  // termIds: ['a', 'b'] または termIds: [] にマッチ
  const re = /termIds:\s*\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const raw = m[1];
    const ids = raw
      .split(',')
      .map((s) => s.trim().replace(/^['"`]|['"`]$/g, ''))
      .filter(Boolean);
    blocks.push({ start: m.index, end: m.index + m[0].length, ids });
  }
  return blocks;
}

/**
 * セクションのbody テキストを抽出する（termIds ブロックに対応するセクション）。
 * 各 termIds ブロックの手前から直近の heading: まで遡って body/beginnerBody/intermediateBody を収集する。
 */
function extractBodyTextsForBlock(src, blockStart) {
  // blockStart より前の部分を対象に、直近のセクション開始位置を探す
  // セクション区切り: `{` + heading: が始まる箇所（簡易）
  const before = src.slice(0, blockStart);
  // 直近のセクション開始を探す：`{` で囲まれたオブジェクト内の heading:
  const lastBrace = before.lastIndexOf('{');
  const sectionSrc = src.slice(lastBrace, blockStart);

  const bodyRe = /(?:beginnerBody|intermediateBody|body)\s*:\s*[`'"]([^`'"]*(?:[`'"]{3}[\s\S]*?[`'"]{3})?[^`'"]*)[`'"]/g;
  const bodies = [];

  // bodyフィールドを全て取得（バックティックテンプレートリテラルも考慮）
  // シンプルに sectionSrc から body テキストを得る
  // テンプレートリテラル: body: `...`
  const templateRe = /(?:beginnerBody|intermediateBody|body)\s*:\s*`([\s\S]*?)`/g;
  let tm;
  while ((tm = templateRe.exec(sectionSrc)) !== null) {
    bodies.push(tm[1]);
  }

  // 通常の文字列: body: '...' or body: "..."
  const stringRe = /(?:beginnerBody|intermediateBody|body)\s*:\s*['"]([^'"]*)['"]/g;
  let sm;
  while ((sm = stringRe.exec(sectionSrc)) !== null) {
    bodies.push(sm[1]);
  }

  return bodies.join(' ');
}

// ──────────────────────────────────────────────
// 3. 用語マッチング
// ──────────────────────────────────────────────

function findMatchingTermIds(bodyText, existingIds) {
  const candidates = [];
  for (const t of ALL_TERMS) {
    if (existingIds.includes(t.id)) continue;

    let matched = false;
    // 日本語 term: 完全部分文字列一致
    if (t.term && bodyText.includes(t.term)) {
      matched = true;
    }
    // 英語 termEn: 3文字以上かつ大文字小文字無視
    if (!matched && t.termEn && t.termEn.length >= 3) {
      if (bodyText.toLowerCase().includes(t.termEn.toLowerCase())) {
        matched = true;
      }
    }

    if (matched) {
      candidates.push(t.id);
    }
  }
  return candidates;
}

// ──────────────────────────────────────────────
// 4. メイン処理
// ──────────────────────────────────────────────

const chapters = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8'];

const report = {
  totalBefore: 0,
  totalAfter: 0,
  chapters: [],
};

for (const ch of chapters) {
  const filePath = path.join(ROOT, 'src', 'data', 'learn', `${ch}.ts`);
  let src = fs.readFileSync(filePath, 'utf8');

  const blocks = extractTermIdBlocks(src);
  let chBefore = 0;
  let chAfter = 0;
  const sectionReports = [];

  // 後ろから書き換えると前のインデックスがずれないため reverse
  const blocksReversed = [...blocks].reverse();

  for (const block of blocksReversed) {
    const existingCount = block.ids.length;
    chBefore += existingCount;

    if (existingCount >= MAX_TERM_IDS) {
      // すでに上限に達している
      chAfter += existingCount;
      sectionReports.unshift({
        existingCount,
        added: 0,
        addedTerms: [],
        note: 'skip (already at max)',
      });
      continue;
    }

    const bodyText = extractBodyTextsForBlock(src, block.start);
    const candidates = findMatchingTermIds(bodyText, block.ids);

    const slots = MAX_TERM_IDS - existingCount;
    const toAdd = candidates.slice(0, slots);
    const newIds = [...block.ids, ...toAdd];

    chAfter += newIds.length;
    sectionReports.unshift({
      existingCount,
      added: toAdd.length,
      addedTerms: toAdd,
    });

    if (toAdd.length > 0 && !isDryRun) {
      // TS リテラルを更新
      const newArrayLiteral = newIds.map((id) => `'${id}'`).join(', ');
      const replacement = `termIds: [${newArrayLiteral}]`;
      src = src.slice(0, block.start) + replacement + src.slice(block.end);
    }
  }

  report.totalBefore += chBefore;
  report.totalAfter += isDryRun ? chBefore + sectionReports.reduce((a, r) => a + r.added, 0) : chAfter;
  report.chapters.push({
    ch,
    before: chBefore,
    after: isDryRun ? chBefore + sectionReports.reduce((a, r) => a + r.added, 0) : chAfter,
    sections: sectionReports,
  });

  if (!isDryRun) {
    fs.writeFileSync(filePath, src, 'utf8');
    console.log(`[${ch}] written. before=${chBefore} after=${chAfter} (+${chAfter - chBefore})`);
  } else {
    const addedTotal = sectionReports.reduce((a, r) => a + r.added, 0);
    console.log(`[DRY-RUN][${ch}] before=${chBefore} would_add=${addedTotal}`);
    for (const sr of sectionReports) {
      if (sr.added > 0) {
        console.log(`  + ${sr.addedTerms.join(', ')}`);
      }
    }
  }
}

// ──────────────────────────────────────────────
// 5. レポート生成
// ──────────────────────────────────────────────

const increase = report.totalAfter - report.totalBefore;

let md = `# expand-section-termids 実行レポート

実行日時: ${new Date().toISOString()}
モード: ${isDryRun ? 'DRY-RUN（書き戻しなし）' : '本実行'}

## サマリー

| 項目 | 件数 |
|------|------|
| 着手前 termIds 合計 | ${report.totalBefore} |
| 着手後 termIds 合計 | ${report.totalAfter} |
| 増加数 | ${increase} |

## 章別詳細

| 章 | 着手前 | 着手後 | 増加 |
|----|--------|--------|------|
`;

for (const c of report.chapters) {
  md += `| ${c.ch} | ${c.before} | ${c.after} | +${c.after - c.before} |\n`;
}

md += `
## セクション別追加用語

`;

for (const c of report.chapters) {
  const addedSections = c.sections.filter((s) => s.added > 0);
  if (addedSections.length === 0) {
    md += `### ${c.ch}\n追加なし\n\n`;
    continue;
  }
  md += `### ${c.ch}\n`;
  for (const s of addedSections) {
    md += `- 追加 ${s.added} 件: ${s.addedTerms.join(', ')}\n`;
  }
  md += '\n';
}

if (!isDryRun) {
  // runsディレクトリが存在しない場合は作成
  if (!fs.existsSync(HARNESS_RUNS)) {
    fs.mkdirSync(HARNESS_RUNS, { recursive: true });
  }
  const reportPath = path.join(HARNESS_RUNS, 'expansion-report.md');
  fs.writeFileSync(reportPath, md, 'utf8');
  console.log(`\nReport written to: ${reportPath}`);
}

console.log(`\n=== SUMMARY ===`);
console.log(`Before: ${report.totalBefore}, After: ${report.totalAfter}, Increase: +${increase}`);

if (isDryRun) {
  console.log('\n[DRY-RUN] No files were modified.');
}
