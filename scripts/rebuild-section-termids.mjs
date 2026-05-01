#!/usr/bin/env node
/**
 * rebuild-section-termids.mjs
 * 各章 (ch1-ch8) の LearnSection.termIds を新本文（body/beginnerBody/intermediateBody）から
 * 再抽出して置換する。既存 termIds はリセットして上書きする。
 * Usage:
 *   node scripts/rebuild-section-termids.mjs            # 本実行
 *   node scripts/rebuild-section-termids.mjs --dry-run  # ドライラン（書き戻しなし）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const HARNESS_RUNS_DIR = path.resolve(ROOT, '..', '.harness', 'runs', '0058');

const isDryRun = process.argv.includes('--dry-run');
const MAX_TERM_IDS = 6;

// ──────────────────────────────────────────────
// 1. 用語集ロード
// ──────────────────────────────────────────────
const termsPath = path.join(ROOT, 'src', 'data', 'glossary', 'terms.json');
const ALL_TERMS = JSON.parse(fs.readFileSync(termsPath, 'utf8'));

// ──────────────────────────────────────────────
// 2. 章ファイルのパース（loadChapter）
// ──────────────────────────────────────────────

function loadChapter(filePath, chId) {
  let src = fs.readFileSync(filePath, 'utf8');
  src = src.replace(/^import\s+type\s+.*$/gm, '');
  src = src.replace(/:\s*LearnChapter\b/g, '');
  src = src.replace(/:\s*CategoryId(\[\])?\b/g, '');
  src = src.replace(/^export\s+const\s+/gm, 'const ');
  const varName = 'learnCh' + chId.replace('ch', '');
  src += `\nreturn ${varName};`;
  return new Function(src)();
}

// ──────────────────────────────────────────────
// 3. termIds ブロック抽出（正規表現ベース）
//    セクション単位ではなく全 termIds ブロックを順番に返す
//    expand-section-termids.mjs と同じアプローチ
// ──────────────────────────────────────────────

function extractTermIdBlocks(src) {
  const blocks = [];
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

// ──────────────────────────────────────────────
// 4. 用語マッチング（置換モード：既存リセット）
// ──────────────────────────────────────────────

function findMatchingTermIds(bodyText) {
  const candidates = [];
  for (const t of ALL_TERMS) {
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
  // 重複除去、先頭から最大 MAX_TERM_IDS 個
  const unique = [...new Set(candidates)];
  return unique.slice(0, MAX_TERM_IDS);
}

// ──────────────────────────────────────────────
// 5. セクション本文を loadChapter の結果から取得する
//    blocks[i] に対応するセクション idx を追跡するために
//    loadChapter の sections と blocks を対応させる
//    各章のセクション数と blocks 数（termIds の数）が一致するか確認して対応付ける
//    ※ keyTermIds などのフィールドも termIds を含むことがあるため
//      sections.length と blocks.length が一致しない場合は
//      sections 分の blocks だけを対象にする
// ──────────────────────────────────────────────

// ──────────────────────────────────────────────
// 6. メイン処理
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

  // 章オブジェクトをパースして sections の body テキストを取得
  const chObj = loadChapter(filePath, ch);
  const sections = chObj.sections;

  const allBlocks = extractTermIdBlocks(src);

  // sections に対応する termIds ブロックのみを対象とする
  // ブロック数 >= セクション数 の場合、先頭 sections.length 個が sections 対応と想定
  // （keyTermIds 等の後続ブロックは無視）
  if (allBlocks.length < sections.length) {
    console.error(`[${ch}] ERROR: termIds blocks (${allBlocks.length}) < sections (${sections.length})`);
    process.exit(1);
  }

  const sectionBlocks = allBlocks.slice(0, sections.length);
  let chBefore = 0;
  let chAdded = 0;
  let chRemoved = 0;
  let chKept = 0;
  const sectionReports = [];

  // 後ろから書き換えると前のインデックスがずれないため reverse
  const blocksReversed = [...sectionBlocks].reverse();
  const sectionsReversed = [...sections].reverse();

  for (let i = 0; i < blocksReversed.length; i++) {
    const block = blocksReversed[i];
    const section = sectionsReversed[i];

    const oldIds = block.ids;
    chBefore += oldIds.length;

    // セクション本文を結合
    const bodyText = [
      section.body ?? '',
      section.beginnerBody ?? '',
      section.intermediateBody ?? '',
    ].join(' ');

    const newIds = findMatchingTermIds(bodyText);

    // 差分計算
    const oldSet = new Set(oldIds);
    const newSet = new Set(newIds);
    const added = newIds.filter((id) => !oldSet.has(id));
    const removed = oldIds.filter((id) => !newSet.has(id));
    const kept = oldIds.filter((id) => newSet.has(id));

    chAdded += added.length;
    chRemoved += removed.length;
    chKept += kept.length;

    sectionReports.unshift({
      heading: section.heading,
      before: oldIds,
      after: newIds,
      added: added.length,
      removed: removed.length,
      kept: kept.length,
    });

    if (!isDryRun) {
      const newArrayLiteral = newIds.map((id) => `'${id}'`).join(', ');
      const replacement = `termIds: [${newArrayLiteral}]`;
      src = src.slice(0, block.start) + replacement + src.slice(block.end);
    }
  }

  const chAfter = sectionReports.reduce((a, r) => a + r.after.length, 0);
  report.totalBefore += chBefore;
  report.totalAfter += chAfter;
  report.chapters.push({
    ch,
    before: chBefore,
    after: chAfter,
    added: chAdded,
    removed: chRemoved,
    kept: chKept,
    sections: sectionReports,
  });

  if (!isDryRun) {
    fs.writeFileSync(filePath, src, 'utf8');
    console.log(
      `[${ch}] written. before=${chBefore} after=${chAfter} added=${chAdded} removed=${chRemoved} kept=${chKept}`
    );
  } else {
    console.log(
      `[DRY-RUN][${ch}] before=${chBefore} after(predicted)=${chAfter} added=${chAdded} removed=${chRemoved} kept=${chKept}`
    );
    for (const sr of sectionReports) {
      if (sr.added > 0 || sr.removed > 0) {
        console.log(`  section: ${sr.heading.slice(0, 40)}`);
        if (sr.added > 0) console.log(`    + ${sr.after.filter((id) => !new Set(sr.before).has(id)).join(', ')}`);
        if (sr.removed > 0) console.log(`    - ${sr.before.filter((id) => !new Set(sr.after).has(id)).join(', ')}`);
      }
    }
  }
}

// ──────────────────────────────────────────────
// 7. レポート生成
// ──────────────────────────────────────────────

const totalChange = report.totalAfter - report.totalBefore;

let md = `# rebuild-section-termids 実行レポート

実行日時: ${new Date().toISOString()}
モード: ${isDryRun ? 'DRY-RUN（書き戻しなし）' : '本実行'}

## サマリー

| 項目 | 件数 |
|------|------|
| 着手前 (before) termIds 合計 | ${report.totalBefore} |
| 着手後 (after) termIds 合計 | ${report.totalAfter} |
| 変化数 | ${totalChange >= 0 ? '+' : ''}${totalChange} |

## 章別詳細

| 章 | 着手前 (before) | 着手後 (after) | 追加 | 削除 | 維持 |
|----|---------|---------|------|------|------|
`;

for (const c of report.chapters) {
  md += `| ${c.ch} | ${c.before} | ${c.after} | +${c.added} | -${c.removed} | ${c.kept} |\n`;
}

md += `
## セクション別 termIds 前後比較

`;

for (const c of report.chapters) {
  md += `### ${c.ch}\n\n`;
  for (const s of c.sections) {
    md += `#### ${s.heading}\n`;
    md += `- before: [${s.before.join(', ')}]\n`;
    md += `- after:  [${s.after.join(', ')}]\n`;
    md += `- 追加 ${s.added} / 削除 ${s.removed} / 維持 ${s.kept}\n\n`;
  }
}

if (!isDryRun) {
  if (!fs.existsSync(HARNESS_RUNS_DIR)) {
    fs.mkdirSync(HARNESS_RUNS_DIR, { recursive: true });
  }
  const reportPath = path.join(HARNESS_RUNS_DIR, 'rebuild-report.md');
  fs.writeFileSync(reportPath, md, 'utf8');
  console.log(`\nReport written to: ${reportPath}`);
}

console.log(`\n=== SUMMARY ===`);
console.log(`Before: ${report.totalBefore}, After: ${report.totalAfter}, Change: ${totalChange >= 0 ? '+' : ''}${totalChange}`);

if (isDryRun) {
  console.log('\n[DRY-RUN] No files were modified.');
}
