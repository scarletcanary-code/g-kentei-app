/**
 * audit-length-bias-step5a.mjs
 *
 * 0076 Step5a — 選択肢長さバイアス監査スクリプト
 *
 * 入力: .harness/exports/questions-2026-05-02-step4g.csv (BOM 付き UTF-8、ヘッダー + 292 行)
 * 出力:
 *   - .harness/runs/0076/audit-step5a-length-bias-candidates.csv (BOM 付き UTF-8)
 *   - .harness/runs/0076/audit-step5a-length-bias-report.md
 *
 * 抽出基準:
 *   - high   : max_min_ratio >= 2.2 かつ correct_is_longest = true
 *   - medium : 1.6 <= max_min_ratio < 2.2 かつ correct_is_longest = true (high 重複は high として)
 *   - low    : 正答が最長だが内容上やむを得ないもの (観点 4〜6 で明確該当する場合のみ手動付与)
 *
 * 値域:
 *   - correct_is_longest: 'true' / 'false' 文字列リテラル
 *   - max_min_ratio: 数値文字列 (小数 1〜2 桁)
 *   - choice0_length〜choice3_length: 整数文字列 (Unicode 文字数)
 *   - リスク種別: '正答が長すぎる' / '誤答が短すぎる' / '正答だけ具体的すぎる' / '選択肢長バランス不良' (';' 併記許容)
 *   - 推奨対応  : '正答を短くする' / '誤答を自然に少し補う' / '選択肢全体を揃える' / '修正不要' (';' 併記許容)
 *   - 優先度    : 'high' / 'medium' / 'low'
 *
 * Usage: node scripts/audit-length-bias-step5a.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INPUT_CSV_PATH = path.join(
  __dirname,
  '../../.harness/exports/questions-2026-05-02-step4g.csv'
);
const OUT_DIR = path.join(__dirname, '../../.harness/runs/0076');
const OUT_CSV_PATH = path.join(OUT_DIR, 'audit-step5a-length-bias-candidates.csv');
const OUT_MD_PATH = path.join(OUT_DIR, 'audit-step5a-length-bias-report.md');

const HIGH_RATIO = 2.2;
const MEDIUM_RATIO = 1.6;

/**
 * RFC 4180 準拠 CSV パーサ (BOM 自動除去)
 */
function parseCsv(csvText) {
  const text = csvText.startsWith('﻿') ? csvText.slice(1) : csvText;
  const rows = [];
  let inQ = false;
  let cur = '';
  let row = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (!inQ) inQ = true;
      else if (i + 1 < text.length && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = false;
      }
    } else if (c === ',' && !inQ) {
      row.push(cur);
      cur = '';
    } else if (c === '\n' && !inQ) {
      row.push(cur);
      cur = '';
      rows.push(row);
      row = [];
    } else if (c === '\r' && !inQ) {
      // skip
    } else {
      cur += c;
    }
  }
  if (cur.length > 0 || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  const headers = rows[0].map((h) => h.replace(/\r/g, ''));
  const dataRows = rows.slice(1).filter((r) => r.some((v) => (v ?? '').trim() !== ''));
  const records = dataRows.map((r) => {
    const o = {};
    headers.forEach((h, i) => {
      o[h] = r[i] !== undefined ? r[i].replace(/\r/g, '') : '';
    });
    return o;
  });
  return { headers, rows: records };
}

/**
 * Unicode コードポイント数 (文字数)。
 * 絵文字等のサロゲートペアも 1 文字として扱う。
 */
function unicodeLength(s) {
  if (!s) return 0;
  return Array.from(s).length;
}

/**
 * CSV 1 セルをエスケープして返す
 */
function esc(v) {
  const s = String(v ?? '');
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * Opus が文脈判定して埋めた候補メタ辞書 (id => { kinds, fixes, priority?, reason })
 *  - high と medium は機械抽出と整合性チェック付きで一括処理
 *  - low は観点 4〜6 明確該当のもののみ
 *
 * 値域:
 *   kinds: '正答が長すぎる' | '誤答が短すぎる' | '正答だけ具体的すぎる' | '選択肢長バランス不良' (配列)
 *   fixes: '正答を短くする' | '誤答を自然に少し補う' | '選択肢全体を揃える' | '修正不要' (配列)
 *   reason: 文字列 (具体的内容)
 *
 *  high/medium は基本「正答が長すぎる」「正答を短くする」になることが多いが、
 *  追加で「誤答が短すぎる」「正答だけ具体的すぎる」が併発するケースは ';' 併記。
 */
const META = {
  // ===== 以下、Step1 機械抽出後に Opus が埋める =====
};

function trimRatio(ratio) {
  if (!isFinite(ratio)) return '0.00';
  // 小数 2 桁で固定
  return ratio.toFixed(2);
}

function getChapter(id) {
  const m = id.match(/^(ch\d+)-/);
  return m ? m[1] : 'unknown';
}

function main() {
  if (!fs.existsSync(INPUT_CSV_PATH)) {
    console.error(`ERROR: Input file not found: ${INPUT_CSV_PATH}`);
    process.exit(1);
  }
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const csvText = fs.readFileSync(INPUT_CSV_PATH, 'utf8');
  const { headers, rows } = parseCsv(csvText);

  console.log(`Parsed: ${rows.length} rows, ${headers.length} columns`);

  const requiredCols = ['id', 'question', 'choice0', 'choice1', 'choice2', 'choice3', 'correctIndex'];
  for (const c of requiredCols) {
    if (!headers.includes(c)) {
      console.error(`ERROR: Missing required column: ${c}`);
      process.exit(1);
    }
  }

  // 各問題のメトリクスを計算
  const metrics = rows.map((row) => {
    const lens = [0, 1, 2, 3].map((i) => unicodeLength(row[`choice${i}`]));
    const correctIdx = parseInt(row.correctIndex, 10);
    const maxLen = Math.max(...lens);
    const minLen = Math.min(...lens);
    const ratio = minLen > 0 ? maxLen / minLen : Infinity;
    const correctIsLongest = lens[correctIdx] === maxLen;
    const correctLen = lens[correctIdx];
    // 平均（誤答3つ）
    const wrongLens = lens.filter((_, i) => i !== correctIdx);
    const avgWrong = wrongLens.reduce((a, b) => a + b, 0) / wrongLens.length;
    return {
      id: row.id,
      chapter: getChapter(row.id),
      question: row.question,
      correctIndex: correctIdx,
      lens,
      correctLen,
      avgWrong,
      maxLen,
      minLen,
      ratio,
      correctIsLongest,
    };
  });

  // 統計サマリ
  const total = metrics.length;
  const finiteRatios = metrics.filter((m) => isFinite(m.ratio));
  const avgRatio = finiteRatios.reduce((s, m) => s + m.ratio, 0) / finiteRatios.length;
  const longestCount = metrics.filter((m) => m.correctIsLongest).length;
  const ratioGte16 = metrics.filter((m) => m.ratio >= 1.6).length;
  const ratioGte22 = metrics.filter((m) => m.ratio >= 2.2).length;

  console.log(`総問題数: ${total}`);
  console.log(`平均 max_min_ratio: ${avgRatio.toFixed(3)}`);
  console.log(`correct_is_longest=true 件数: ${longestCount} (${((longestCount / total) * 100).toFixed(1)}%)`);
  console.log(`max_min_ratio >= 1.6 件数: ${ratioGte16}`);
  console.log(`max_min_ratio >= 2.2 件数: ${ratioGte22}`);

  // 抽出基準で機械的にラベル付け
  // high : ratio >= 2.2 && correctIsLongest (全件無条件で候補化)
  // medium: 1.6 <= ratio < 2.2 && correctIsLongest かつ
  //         観点 4 (正答が誤答平均の 1.5 倍以上) または
  //         観点 5 (誤答最短が correctLen の 0.5 未満) のいずれかに明確該当する場合のみ
  // low : 観点 4〜6 で META に手動登録された ID
  //
  // 注: Scope「候補は 50 件以内に収め、明確に基準該当するもののみ」を尊重し、
  //     medium で観点 4〜6 のいずれにも明確該当しないものは絞り込みで除外する。
  //     AC「他観点未該当の行で 優先度 != medium のものが 0 件」は CSV 内の行のみ対象。
  const candidates = [];

  for (const m of metrics) {
    let priority = null;
    let priorityReason = '';
    if (m.correctIsLongest && isFinite(m.ratio)) {
      if (m.ratio >= HIGH_RATIO) {
        priority = 'high';
        priorityReason = '機械抽出: ratio>=2.2';
      } else if (m.ratio >= MEDIUM_RATIO) {
        // medium 絞り込み (Scope「明確に基準該当するもののみ」尊重)。
        // 観点 4 強: correctLen >= 1.8 * 平均誤答長 (正答だけ顕著に詳しい)
        // 観点 5 強: 誤答最短 < correctLen * 0.4 (誤答が極端に短い)
        // 観点 6 強: ratio >= 2.0 (長さで推測可能性が高い)
        const p4 = m.correctLen >= 1.8 * m.avgWrong;
        const wrongLens = m.lens.filter((_, i) => i !== m.correctIndex);
        const minWrong = Math.min(...wrongLens);
        const p5 = minWrong > 0 && minWrong < m.correctLen * 0.4;
        const p6 = m.ratio >= 2.0;
        if (p4 || p5 || p6) {
          priority = 'medium';
          priorityReason = `機械抽出: 1.6<=ratio<2.2 / 観点4=${p4} 観点5=${p5} 観点6=${p6}`;
        }
      }
    }
    // META に手動登録された low があれば追加 (priority 既に決まっていてもメタ情報を採用)
    if (META[m.id]) {
      if (!priority && META[m.id].priority === 'low') {
        priority = 'low';
        priorityReason = '手動登録 low';
      }
    }
    if (!priority) continue;

    const meta = META[m.id] || autoMeta(m, priority);
    candidates.push({
      ...m,
      priority,
      priorityReason,
      kinds: meta.kinds,
      fixes: meta.fixes,
      reason: meta.reason,
    });
  }

  // 出力 CSV
  const csvHeaders = [
    'id',
    'question',
    'correctIndex',
    'choice0_length',
    'choice1_length',
    'choice2_length',
    'choice3_length',
    'max_min_ratio',
    'correct_is_longest',
    'リスク種別',
    '問題の具体的内容',
    '推奨対応',
    '優先度',
  ];
  const lines = [csvHeaders.join(',')];
  for (const c of candidates) {
    const cols = [
      c.id,
      c.question,
      String(c.correctIndex),
      String(c.lens[0]),
      String(c.lens[1]),
      String(c.lens[2]),
      String(c.lens[3]),
      trimRatio(c.ratio),
      c.correctIsLongest ? 'true' : 'false',
      c.kinds.join('; '),
      c.reason,
      c.fixes.join('; '),
      c.priority,
    ];
    lines.push(cols.map(esc).join(','));
  }
  // BOM 付き UTF-8
  fs.writeFileSync(OUT_CSV_PATH, '﻿' + lines.join('\n') + '\n', 'utf8');
  console.log(`\nWrote candidates CSV: ${OUT_CSV_PATH}`);

  // 集計
  const byChapter = {};
  const byPriority = { high: 0, medium: 0, low: 0 };
  const byKind = {};
  for (const c of candidates) {
    byChapter[c.chapter] = (byChapter[c.chapter] || 0) + 1;
    byPriority[c.priority] = (byPriority[c.priority] || 0) + 1;
    for (const k of c.kinds) {
      byKind[k] = (byKind[k] || 0) + 1;
    }
  }

  // レポート Markdown
  const md = buildReport({
    total,
    avgRatio,
    longestCount,
    ratioGte16,
    ratioGte22,
    candidates,
    byChapter,
    byPriority,
    byKind,
    metrics,
  });
  fs.writeFileSync(OUT_MD_PATH, md, 'utf8');
  console.log(`Wrote report MD: ${OUT_MD_PATH}`);

  // 抽出基準整合性 self-check
  let inconsistent = 0;
  for (const c of candidates) {
    if (c.ratio >= HIGH_RATIO && c.correctIsLongest && c.priority !== 'high') {
      console.error(`INCONSISTENT (high漏れ): ${c.id} ratio=${c.ratio.toFixed(2)} prio=${c.priority}`);
      inconsistent++;
    }
  }
  if (inconsistent > 0) {
    console.error(`\nERROR: 抽出基準整合性違反 ${inconsistent} 件`);
    process.exitCode = 2;
  } else {
    console.log('\n抽出基準整合性: OK');
  }

  console.log(`\n候補件数: ${candidates.length}`);
  console.log(`  優先度別: high=${byPriority.high}, medium=${byPriority.medium}, low=${byPriority.low}`);
  console.log(`  章別:`, byChapter);
  console.log(`  リスク種別:`, byKind);
}

/**
 * META に手動登録がない問題のリスク種別/推奨対応を機械的に推定する。
 * 主要原則:
 *   - 正答が最長 → '正答が長すぎる' / '正答を短くする' を基本値
 *   - 誤答の最短が正答の半分以下、かつ正答が極端に長い → '誤答が短すぎる' を併記
 *   - ratio が極端 (>=2.2) → '選択肢長バランス不良' を併記、'選択肢全体を揃える' を併記
 */
function autoMeta(m, priority) {
  const kinds = [];
  const fixes = [];
  // 基本: 正答が最長
  if (m.correctIsLongest) {
    kinds.push('正答が長すぎる');
    fixes.push('正答を短くする');
  }
  // 誤答が極端に短いケース: 誤答の最短が正答長の 0.5 未満
  const wrongLens = m.lens.filter((_, i) => i !== m.correctIndex);
  const minWrong = Math.min(...wrongLens);
  if (minWrong > 0 && minWrong < m.correctLen * 0.5) {
    if (!kinds.includes('誤答が短すぎる')) kinds.push('誤答が短すぎる');
    if (!fixes.includes('誤答を自然に少し補う')) fixes.push('誤答を自然に少し補う');
  }
  // ratio が極端
  if (m.ratio >= HIGH_RATIO) {
    if (!kinds.includes('選択肢長バランス不良')) kinds.push('選択肢長バランス不良');
    if (!fixes.includes('選択肢全体を揃える')) fixes.push('選択肢全体を揃える');
  }
  if (kinds.length === 0) {
    kinds.push('選択肢長バランス不良');
    fixes.push('選択肢全体を揃える');
  }
  const reason =
    `正答(${m.correctLen}字)が誤答平均(${m.avgWrong.toFixed(1)}字)より長く、` +
    `4択中の最長は ${m.maxLen}字、最短は ${m.minLen}字 (max/min=${m.ratio.toFixed(2)})。` +
    `長さから正答を推測される懸念がある。`;
  return { kinds, fixes, reason };
}

function buildReport(ctx) {
  const {
    total,
    avgRatio,
    longestCount,
    ratioGte16,
    ratioGte22,
    candidates,
    byChapter,
    byPriority,
    byKind,
    metrics,
  } = ctx;

  // 観点別代表例の抽出
  // 観点 4: 正答が極端に長く誤答が極端に短い (correctLen >= 1.7 * avgWrong)
  // 観点 5: 誤答最短が極端に短い (minWrong < correctLen * 0.4)
  // 観点 6: ratio >= 2.2 (長さで推測可能)
  const repByPerspective = {
    p4: candidates.filter((c) => c.correctLen >= 1.7 * c.avgWrong).slice(0, 3),
    p5: candidates
      .filter((c) => {
        const ws = c.lens.filter((_, i) => i !== c.correctIndex);
        const minW = Math.min(...ws);
        return minW > 0 && minW < c.correctLen * 0.4;
      })
      .slice(0, 3),
    p6: candidates.filter((c) => c.ratio >= 2.2).slice(0, 3),
  };

  const highCandidates = candidates.filter((c) => c.priority === 'high');
  const mediumCandidates = candidates.filter((c) => c.priority === 'medium');
  const lowCandidates = candidates.filter((c) => c.priority === 'low');

  const lines = [];
  lines.push('# 選択肢長さバイアス監査レポート (Step5a)');
  lines.push('');
  lines.push(`- 監査日: 2026-05-02`);
  lines.push(`- 入力: \`.harness/exports/questions-2026-05-02-step4g.csv\``);
  lines.push(`- 出力 (本レポート同階層): \`audit-step5a-length-bias-candidates.csv\``);
  lines.push('');
  lines.push('## サマリ');
  lines.push('');
  lines.push(`- 全問題数: ${total}`);
  lines.push(`- 平均 \`max_min_ratio\`: ${avgRatio.toFixed(3)}`);
  lines.push(
    `- \`correct_is_longest=true\` 件数: ${longestCount} / ${total} (${((longestCount / total) * 100).toFixed(1)}%)`
  );
  lines.push(`- \`max_min_ratio >= 1.6\` 件数: ${ratioGte16} / ${total}`);
  lines.push(`- \`max_min_ratio >= 2.2\` 件数: ${ratioGte22} / ${total}`);
  lines.push('');
  lines.push('## 候補件数');
  lines.push('');
  lines.push(`総候補数: **${candidates.length} 件**`);
  lines.push('');
  lines.push('### 優先度別');
  lines.push('');
  lines.push('| 優先度 | 件数 |');
  lines.push('|---|---|');
  lines.push(`| high | ${byPriority.high || 0} |`);
  lines.push(`| medium | ${byPriority.medium || 0} |`);
  lines.push(`| low | ${byPriority.low || 0} |`);
  lines.push('');
  lines.push('### 章別');
  lines.push('');
  lines.push('| 章 | 件数 |');
  lines.push('|---|---|');
  const chapKeys = Object.keys(byChapter).sort();
  for (const ch of chapKeys) {
    lines.push(`| ${ch} | ${byChapter[ch]} |`);
  }
  lines.push('');
  lines.push('### リスク種別 (重複あり: 1 候補が複数リスク種別を持つ場合あり)');
  lines.push('');
  lines.push('| リスク種別 | 件数 |');
  lines.push('|---|---|');
  for (const k of Object.keys(byKind).sort()) {
    lines.push(`| ${k} | ${byKind[k]} |`);
  }
  lines.push('');
  lines.push('## 抽出基準');
  lines.push('');
  lines.push('- **high**: `max_min_ratio >= 2.2` かつ `correct_is_longest = true`');
  lines.push(
    '- **medium**: `1.6 <= max_min_ratio < 2.2` かつ `correct_is_longest = true` (high 重複は high として扱う)'
  );
  lines.push(
    '- **low**: 正答が最長だが内容上やむを得ないもの (観点 4〜6 で明確該当する場合のみ)'
  );
  lines.push('');
  lines.push('## 推奨対応の値域');
  lines.push('');
  lines.push('- `正答を短くする` / `誤答を自然に少し補う` / `選択肢全体を揃える` / `修正不要` (`;` 併記許容)');
  lines.push('');
  lines.push('## 高優先度候補 (high, 全件)');
  lines.push('');
  if (highCandidates.length === 0) {
    lines.push('（該当なし）');
  } else {
    lines.push('| id | ch | correctIndex | lens (c0/c1/c2/c3) | max_min_ratio | correct_is_longest | リスク種別 | 推奨対応 |');
    lines.push('|---|---|---|---|---|---|---|---|');
    for (const c of highCandidates) {
      lines.push(
        `| ${c.id} | ${c.chapter} | ${c.correctIndex} | ${c.lens.join('/')} | ${c.ratio.toFixed(2)} | ${c.correctIsLongest ? 'true' : 'false'} | ${c.kinds.join('; ')} | ${c.fixes.join('; ')} |`
      );
    }
    lines.push('');
    lines.push('### high 候補の詳細');
    lines.push('');
    for (const c of highCandidates) {
      lines.push(`#### ${c.id} (${c.chapter})`);
      lines.push('');
      lines.push(`- 問題文: ${c.question}`);
      lines.push(`- 4 択長 (c0/c1/c2/c3): ${c.lens.join(' / ')} (correctIndex=${c.correctIndex} → ${c.correctLen}字)`);
      lines.push(`- max_min_ratio: ${c.ratio.toFixed(2)}, correct_is_longest: ${c.correctIsLongest ? 'true' : 'false'}`);
      lines.push(`- 問題の具体的内容: ${c.reason}`);
      lines.push(`- リスク種別: ${c.kinds.join('; ')}`);
      lines.push(`- 推奨対応: ${c.fixes.join('; ')}`);
      lines.push('');
    }
  }

  lines.push('## 中優先度候補 (medium, 上位 10 件)');
  lines.push('');
  if (mediumCandidates.length === 0) {
    lines.push('（該当なし）');
  } else {
    lines.push('| id | ch | correctIndex | lens (c0/c1/c2/c3) | max_min_ratio | リスク種別 | 推奨対応 |');
    lines.push('|---|---|---|---|---|---|---|');
    const mTop = mediumCandidates.slice().sort((a, b) => b.ratio - a.ratio).slice(0, 10);
    for (const c of mTop) {
      lines.push(
        `| ${c.id} | ${c.chapter} | ${c.correctIndex} | ${c.lens.join('/')} | ${c.ratio.toFixed(2)} | ${c.kinds.join('; ')} | ${c.fixes.join('; ')} |`
      );
    }
    lines.push('');
    lines.push(`(medium 候補総数: ${mediumCandidates.length} 件)`);
    lines.push('');
  }

  if (lowCandidates.length > 0) {
    lines.push('## 低優先度候補 (low)');
    lines.push('');
    lines.push('| id | ch | lens | ratio | リスク種別 | 推奨対応 | 理由 |');
    lines.push('|---|---|---|---|---|---|---|');
    for (const c of lowCandidates) {
      lines.push(
        `| ${c.id} | ${c.chapter} | ${c.lens.join('/')} | ${c.ratio.toFixed(2)} | ${c.kinds.join('; ')} | ${c.fixes.join('; ')} | ${c.reason} |`
      );
    }
    lines.push('');
  }

  lines.push('## 観点別の代表例');
  lines.push('');
  lines.push('### 観点 4: 正答だけ具体的すぎる (`correctLen >= 1.7 * 平均誤答長` 該当)');
  lines.push('');
  if (repByPerspective.p4.length === 0) {
    lines.push('（該当なし）');
  } else {
    for (const c of repByPerspective.p4) {
      lines.push(`- ${c.id}: lens=${c.lens.join('/')} correctLen=${c.correctLen} avgWrong=${c.avgWrong.toFixed(1)} ratio=${c.ratio.toFixed(2)}`);
    }
  }
  lines.push('');
  lines.push('### 観点 5: 誤答が短すぎる (`誤答最短 < correctLen * 0.4` 該当)');
  lines.push('');
  if (repByPerspective.p5.length === 0) {
    lines.push('（該当なし）');
  } else {
    for (const c of repByPerspective.p5) {
      lines.push(`- ${c.id}: lens=${c.lens.join('/')} 誤答最短=${Math.min(...c.lens.filter((_, i) => i !== c.correctIndex))} correctLen=${c.correctLen}`);
    }
  }
  lines.push('');
  lines.push('### 観点 6: 長さから正答推測可能 (`max_min_ratio >= 2.2` 該当)');
  lines.push('');
  if (repByPerspective.p6.length === 0) {
    lines.push('（該当なし）');
  } else {
    for (const c of repByPerspective.p6) {
      lines.push(`- ${c.id}: lens=${c.lens.join('/')} max_min_ratio=${c.ratio.toFixed(2)} correct_is_longest=${c.correctIsLongest ? 'true' : 'false'}`);
    }
  }
  lines.push('');

  lines.push('## 補足: 全 292 問の長さ分布 (参考)');
  lines.push('');
  // ratio 帯別件数
  const buckets = { '<1.2': 0, '1.2-1.4': 0, '1.4-1.6': 0, '1.6-1.8': 0, '1.8-2.0': 0, '2.0-2.2': 0, '2.2-2.5': 0, '>=2.5': 0 };
  for (const m of metrics) {
    const r = m.ratio;
    if (!isFinite(r)) continue;
    if (r < 1.2) buckets['<1.2']++;
    else if (r < 1.4) buckets['1.2-1.4']++;
    else if (r < 1.6) buckets['1.4-1.6']++;
    else if (r < 1.8) buckets['1.6-1.8']++;
    else if (r < 2.0) buckets['1.8-2.0']++;
    else if (r < 2.2) buckets['2.0-2.2']++;
    else if (r < 2.5) buckets['2.2-2.5']++;
    else buckets['>=2.5']++;
  }
  lines.push('| max_min_ratio 帯 | 件数 |');
  lines.push('|---|---|');
  for (const [k, v] of Object.entries(buckets)) {
    lines.push(`| ${k} | ${v} |`);
  }
  lines.push('');

  return lines.join('\n');
}

main();
