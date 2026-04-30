/**
 * compare-heuristic-vs-llm.mjs
 *
 * ヒューリスティック audit と Felo LLM 監査の乖離分析スクリプト
 *
 * 実行方法: cd g-kentei-app && node scripts/compare-heuristic-vs-llm.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- 入力パス定数 ---
// cwd = g-kentei-app/, __dirname = g-kentei-app/scripts/
// .harness/ は g-kentei-app/ の一段上 (gkenteiv1_app/.harness/)
const HEURISTIC_JSON = path.resolve(__dirname, '../../.harness/runs/0031-audit/audit-results.json');
const LLM_JSON       = path.resolve(__dirname, '../../.harness/runs/0033-full/audit-llm-results.json');
const OUT_DIR        = path.resolve(__dirname, '../../.harness/runs/0039');

// --- LLM 11 項目 ---
const LLM_ITEMS = [
  'fact_accuracy',
  'syllabus_alignment',
  'one_best_answer',
  'distractor_quality',
  'explanation_quality',
  'ambiguity_risk',
  'exam_likeness',
  'readability',
  'option_naturalness',
  'explanation_resolves_misconception',
  'unexplained_jargon',
];

// --- ヒューリスティックルール一覧 ---
const HEURISTIC_RULES = {
  has_source_ref:          'source_ref が非空かチェック',
  has_learningObjective:   'learningObjective が非空かチェック',
  has_cognitiveLevel:      'cognitiveLevel が非空かチェック',
  has_optionRationales:    'optionRationales が存在・長さ4かチェック',
  has_misconceptionTarget: 'misconceptionTarget が非空かチェック',
  absolute_expression:     '選択肢中の絶対表現検出',
  correct_specificity_skew:'正答の専門語密度が誤答より高いかチェック',
  definition_type:         '問題文が定義型かチェック',
  manual_review_needed:    'manual_review_needed フラグ',
};

function main() {
  // --- 読み込み ---
  let heuristicData, llmData;
  try {
    heuristicData = JSON.parse(fs.readFileSync(HEURISTIC_JSON, 'utf8'));
    llmData       = JSON.parse(fs.readFileSync(LLM_JSON, 'utf8'));
  } catch (e) {
    console.error('入力ファイル読み込みエラー:', e.message);
    process.exit(1);
  }

  // --- ID マップ作成 ---
  // heuristic: key = id
  const hMap = new Map(heuristicData.map(item => [item.id, item]));
  // llm: key = questionId
  const lMap = new Map(llmData.map(item => [item.questionId, item]));

  // --- 突合 ---
  const matched = [];
  for (const [id, h] of hMap.entries()) {
    if (lMap.has(id)) {
      matched.push({ id, h, l: lMap.get(id) });
    } else {
      console.error(`[WARN] heuristic id=${id} が LLM 側に存在しない。除外。`);
    }
  }
  for (const [qid] of lMap.entries()) {
    if (!hMap.has(qid)) {
      console.error(`[WARN] llm questionId=${qid} が heuristic 側に存在しない。除外。`);
    }
  }

  console.log(`突合完了: ${matched.length} 件`);

  // --- 4 カテゴリ分類 ---
  // heuristic: PASS / WARN
  // llm.overall: PASS / FAIL
  const categories = {
    both_pass:                    [],
    heuristic_warn_llm_pass:      [],
    heuristic_pass_llm_warn_fail: [],
    both_problem:                 [],
  };

  for (const item of matched) {
    const hStatus = item.h.status;         // 'PASS' or 'WARN'
    const lOverall = item.l.overall;        // 'PASS' or 'FAIL'

    if (hStatus === 'PASS' && lOverall === 'PASS') {
      categories.both_pass.push(item);
    } else if (hStatus === 'WARN' && lOverall === 'PASS') {
      categories.heuristic_warn_llm_pass.push(item);
    } else if (hStatus === 'PASS' && lOverall !== 'PASS') {
      categories.heuristic_pass_llm_warn_fail.push(item);
    } else {
      // hStatus !== 'PASS' && lOverall !== 'PASS'
      categories.both_problem.push(item);
    }
  }

  const catCounts = {
    both_pass:                    categories.both_pass.length,
    heuristic_warn_llm_pass:      categories.heuristic_warn_llm_pass.length,
    heuristic_pass_llm_warn_fail: categories.heuristic_pass_llm_warn_fail.length,
    both_problem:                 categories.both_problem.length,
  };
  console.log('カテゴリ件数:', catCounts);
  const totalCount = Object.values(catCounts).reduce((a, b) => a + b, 0);
  console.log('合計:', totalCount);

  // --- 代表例生成 ---
  function makeLlmFailItems(lEntry) {
    const items = [];
    for (const [key, val] of Object.entries(lEntry.review || {})) {
      if (val.status !== 'PASS') {
        items.push({ item: key, status: val.status, reason: val.reason });
      }
    }
    return items.slice(0, 3);
  }

  function makeExamples(list, max = 5) {
    return list.slice(0, max).map(item => ({
      questionId:   item.id,
      categoryId:   item.h.categoryId,
      hStatus:      item.h.status,
      hReasons:     item.h.reasons || [],
      lOverall:     item.l.overall,
      lFailItems:   makeLlmFailItems(item.l),
    }));
  }

  // --- 乖離スコア上位10件 ---
  // heuristic WARN チェック数と LLM FAIL 項目数の差の絶対値
  function hWarnCount(item) {
    return Object.values(item.h.checks || {}).filter(v => v !== 'PASS').length;
  }
  function lFailCount(item) {
    return Object.values(item.l.review || {}).filter(v => v.status !== 'PASS').length;
  }

  const topDivergent = [...matched]
    .map(item => ({
      questionId:  item.id,
      categoryId:  item.h.categoryId,
      hWarnCount:  hWarnCount(item),
      lFailCount:  lFailCount(item),
      divergence:  Math.abs(hWarnCount(item) - lFailCount(item)),
    }))
    .sort((a, b) => b.divergence - a.divergence)
    .slice(0, 10);

  // --- heuristic ルール別 LLM-PASS 率 ---
  const heuristicRuleStats = [];
  for (const [ruleId, ruleName] of Object.entries(HEURISTIC_RULES)) {
    // そのルールが WARN/FAIL の問題集合
    const warnItems = matched.filter(item => {
      const val = (item.h.checks || {})[ruleId];
      return val && val !== 'PASS';
    });
    const warnCount = warnItems.length;
    const llmPassCount = warnItems.filter(item => item.l.overall === 'PASS').length;
    const llmPassRate = warnCount > 0 ? llmPassCount / warnCount : null;

    let recommendation;
    if (llmPassRate === null) {
      recommendation = 'データなし';
    } else if (llmPassRate >= 0.7) {
      recommendation = '緩和候補';
    } else if (llmPassRate <= 0.3) {
      recommendation = '厳格化候補';
    } else {
      recommendation = '妥当';
    }

    heuristicRuleStats.push({
      rule_id:              ruleId,
      rule_name:            ruleName,
      heuristic_warn_count: warnCount,
      llm_pass_count:       llmPassCount,
      llm_pass_rate:        llmPassRate,
      recommendation,
    });
  }

  // --- LLM 項目別の heuristic 検出率 ---
  const llmItemStats = [];
  for (const itemKey of LLM_ITEMS) {
    // その LLM 項目が WARN/FAIL の問題集合
    const failItems = matched.filter(item => {
      const rv = (item.l.review || {})[itemKey];
      return rv && rv.status !== 'PASS';
    });
    const llmWarnFailCount = failItems.length;
    const hDetectedCount = failItems.filter(item => item.h.status !== 'PASS').length;
    const hDetectRate = llmWarnFailCount > 0 ? hDetectedCount / llmWarnFailCount : null;

    let note;
    if (hDetectRate === null) {
      note = 'データなし';
    } else if (hDetectRate >= 0.5) {
      note = 'heuristicで検出可';
    } else if (hDetectRate <= 0.2) {
      note = '要LLM/人手';
    } else {
      note = '境界';
    }

    llmItemStats.push({
      llm_item:                 itemKey,
      llm_warn_fail_count:      llmWarnFailCount,
      heuristic_detected_count: hDetectedCount,
      heuristic_detect_rate:    hDetectRate,
      note,
    });
  }

  // --- OUT_DIR 作成 ---
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // --- comparison.json 出力 ---
  const comparisonData = {
    generated:     new Date().toISOString(),
    total_matched: matched.length,
    categories: {
      both_pass: {
        count:    catCounts.both_pass,
        examples: makeExamples(categories.both_pass),
      },
      heuristic_warn_llm_pass: {
        count:    catCounts.heuristic_warn_llm_pass,
        examples: makeExamples(categories.heuristic_warn_llm_pass),
      },
      heuristic_pass_llm_warn_fail: {
        count:    catCounts.heuristic_pass_llm_warn_fail,
        examples: makeExamples(categories.heuristic_pass_llm_warn_fail),
      },
      both_problem: {
        count:    catCounts.both_problem,
        examples: makeExamples(categories.both_problem),
      },
    },
    top_divergent:       topDivergent,
    heuristic_rule_stats: heuristicRuleStats,
    llm_item_stats:       llmItemStats,
  };

  fs.writeFileSync(
    path.join(OUT_DIR, 'comparison.json'),
    JSON.stringify(comparisonData, null, 2),
    'utf8'
  );
  console.log('comparison.json 書き込み完了');

  // --- heuristic-rule-stats.csv 出力 ---
  const hCsvLines = [
    'rule_id,rule_name,heuristic_warn_count,llm_pass_count,llm_pass_rate,recommendation',
    ...heuristicRuleStats.map(r =>
      [
        r.rule_id,
        `"${r.rule_name}"`,
        r.heuristic_warn_count,
        r.llm_pass_count,
        r.llm_pass_rate === null ? '' : r.llm_pass_rate.toFixed(3),
        r.recommendation,
      ].join(',')
    ),
  ];
  fs.writeFileSync(path.join(OUT_DIR, 'heuristic-rule-stats.csv'), hCsvLines.join('\n') + '\n', 'utf8');
  console.log('heuristic-rule-stats.csv 書き込み完了');

  // --- llm-item-stats.csv 出力 ---
  const lCsvLines = [
    'llm_item,llm_warn_fail_count,heuristic_detected_count,heuristic_detect_rate,note',
    ...llmItemStats.map(r =>
      [
        r.llm_item,
        r.llm_warn_fail_count,
        r.heuristic_detected_count,
        r.heuristic_detect_rate === null ? '' : r.heuristic_detect_rate.toFixed(3),
        `"${r.note}"`,
      ].join(',')
    ),
  ];
  fs.writeFileSync(path.join(OUT_DIR, 'llm-item-stats.csv'), lCsvLines.join('\n') + '\n', 'utf8');
  console.log('llm-item-stats.csv 書き込み完了');

  // --- summary.md 出力 ---
  // 緩和候補・厳格化候補の上位
  const relaxCandidates = heuristicRuleStats
    .filter(r => r.recommendation === '緩和候補')
    .sort((a, b) => (b.llm_pass_rate ?? 0) - (a.llm_pass_rate ?? 0))
    .slice(0, 5);
  const strictCandidates = heuristicRuleStats
    .filter(r => r.recommendation === '厳格化候補')
    .sort((a, b) => (a.llm_pass_rate ?? 1) - (b.llm_pass_rate ?? 1))
    .slice(0, 5);
  // LLM 過信すべきでない項目 (heuristic_detect_rate >= 0.5)
  const llmOvertrustItems = llmItemStats.filter(r => r.note === 'heuristicで検出可');
  // LLM に頼るべき項目 (heuristic_detect_rate <= 0.2)
  const llmRelyItems = llmItemStats.filter(r => r.note === '要LLM/人手');

  const hExamples5 = makeExamples(categories.heuristic_warn_llm_pass);
  const bpExamples5 = makeExamples(categories.both_problem);

  function fmtExample(ex) {
    const lines = [
      `- **${ex.questionId}** (${ex.categoryId})`,
      `  - heuristic: ${ex.hStatus}${ex.hReasons.length > 0 ? ' / reasons: ' + ex.hReasons.join('; ') : ''}`,
      `  - LLM overall: ${ex.lOverall}`,
    ];
    if (ex.lFailItems.length > 0) {
      lines.push(`  - LLM 問題項目: ${ex.lFailItems.map(x => x.item + '(' + x.status + ')').join(', ')}`);
    }
    return lines.join('\n');
  }

  const summaryLines = [
    '# ヒューリスティック audit vs Felo LLM 監査 乖離分析レポート',
    '',
    `生成日時: ${new Date().toISOString()}`,
    '',
    '## 概況',
    '',
    '| カテゴリ | 件数 |',
    '|---|---|',
    `| both_pass（両方 PASS） | ${catCounts.both_pass} |`,
    `| heuristic_warn_llm_pass（heuristic WARN かつ LLM PASS） | ${catCounts.heuristic_warn_llm_pass} |`,
    `| heuristic_pass_llm_warn_fail（heuristic PASS かつ LLM FAIL） | ${catCounts.heuristic_pass_llm_warn_fail} |`,
    `| both_problem（両方で問題あり） | ${catCounts.both_problem} |`,
    `| **合計** | **${totalCount}** |`,
    '',
    '## heuristic WARN かつ LLM PASS（代表例）',
    '',
    `heuristic が WARN を出したが LLM は PASS と判定した乖離ケース。合計 **${catCounts.heuristic_warn_llm_pass}** 件。`,
    '',
    ...(hExamples5.length > 0 ? hExamples5.map(fmtExample) : ['（該当なし）']),
    '',
    '## 両方で問題あり',
    '',
    `heuristic も LLM も問題ありと判定。合計 **${catCounts.both_problem}** 件。`,
    '',
    ...(bpExamples5.length > 0 ? bpExamples5.map(fmtExample) : ['（該当なし）']),
    '',
    '## 判断材料',
    '',
    '### heuristic 緩和候補ルール（LLM PASS 率が高い → heuristic が過剰反応している可能性）',
    '',
    relaxCandidates.length > 0
      ? relaxCandidates.map(r =>
          `- **${r.rule_id}**: LLM PASS 率 ${(r.llm_pass_rate * 100).toFixed(1)}%（WARN 件数 ${r.heuristic_warn_count}）`
        ).join('\n')
      : '（該当なし）',
    '',
    '### heuristic 厳格化候補ルール（LLM PASS 率が低い → 両方で問題として一致）',
    '',
    strictCandidates.length > 0
      ? strictCandidates.map(r =>
          `- **${r.rule_id}**: LLM PASS 率 ${(r.llm_pass_rate * 100).toFixed(1)}%（WARN 件数 ${r.heuristic_warn_count}）`
        ).join('\n')
      : '（該当なし）',
    '',
    '### LLM 過信すべきでない項目（heuristic でも検出できる → heuristic_detect_rate >= 0.5）',
    '',
    llmOvertrustItems.length > 0
      ? llmOvertrustItems.map(r =>
          `- **${r.llm_item}**: heuristic 検出率 ${(r.heuristic_detect_rate * 100).toFixed(1)}%（LLM FAIL 件数 ${r.llm_warn_fail_count}）`
        ).join('\n')
      : '（該当なし）',
    '',
    '### LLM に頼るべき項目（heuristic では検出困難 → heuristic_detect_rate <= 0.2）',
    '',
    llmRelyItems.length > 0
      ? llmRelyItems.map(r =>
          `- **${r.llm_item}**: heuristic 検出率 ${(r.heuristic_detect_rate * 100).toFixed(1)}%（LLM FAIL 件数 ${r.llm_warn_fail_count}）`
        ).join('\n')
      : '（該当なし）',
    '',
    '## 乖離スコア上位 10 件',
    '',
    '| questionId | categoryId | heuristic WARN 数 | LLM FAIL 項目数 | 乖離スコア |',
    '|---|---|---|---|---|',
    ...topDivergent.map(item =>
      `| ${item.questionId} | ${item.categoryId} | ${item.hWarnCount} | ${item.lFailCount} | ${item.divergence} |`
    ),
    '',
  ];

  fs.writeFileSync(path.join(OUT_DIR, 'summary.md'), summaryLines.join('\n'), 'utf8');
  console.log('summary.md 書き込み完了');

  console.log('\n--- 完了 ---');
  console.log(`出力先: ${OUT_DIR}`);
  process.exit(0);
}

main();
