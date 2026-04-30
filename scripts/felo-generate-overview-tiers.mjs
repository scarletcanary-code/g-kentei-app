#!/usr/bin/env node
/**
 * felo-generate-overview-tiers.mjs
 * Felo API を使って各章の「初級概要」（beginnerOverview）と
 * 「中級概要」（intermediateOverview）を生成・書き戻しするスクリプト
 *
 * 使用方法:
 *   node --env-file=.env scripts/felo-generate-overview-tiers.mjs --chapter chN
 *   node --env-file=.env scripts/felo-generate-overview-tiers.mjs --all
 *   node --env-file=.env scripts/felo-generate-overview-tiers.mjs --all --dry-run
 *
 * 環境変数:
 *   FELO_API_KEY: Felo API キー（.env ファイルに設定）--dry-run 時は不要
 *
 * 出力:
 *   .harness/runs/0047/raw-felo-responses.json  生レスポンス JSON 配列
 *   .harness/runs/0047/run.log                  実行ログ
 */

import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const harnessRoot = join(projectRoot, '..', '.harness');
const outputDir = join(harnessRoot, 'runs', '0047');
const rawResponsesPath = join(outputDir, 'raw-felo-responses.json');
const runLogPath = join(outputDir, 'run.log');

// 章タイトルのハードコードマッピング
const CHAPTER_TITLES = {
  ch1: '人工知能（AI）とは',
  ch2: 'AI研究の歴史と動向',
  ch3: '機械学習の基礎',
  ch4: 'ディープラーニングの概要',
  ch5: 'ディープラーニングの要素技術',
  ch6: 'ディープラーニングの応用',
  ch7: 'AIの社会実装',
  ch8: 'AI・法律・倫理',
};

const VALID_CHAPTER_IDS = Object.keys(CHAPTER_TITLES);

// コマンドライン引数のパース
const args = process.argv.slice(2);
const chapterArgIdx = args.indexOf('--chapter');
const dryRun = args.includes('--dry-run');
const allMode = args.includes('--all');

// --all と --chapter が同時指定された場合はエラー
if (allMode && chapterArgIdx !== -1) {
  process.stderr.write('エラー: --all と --chapter を同時に指定できません。\n');
  process.exit(1);
}

// --all でも --chapter でもない場合はエラー
if (!allMode && (chapterArgIdx === -1 || chapterArgIdx + 1 >= args.length)) {
  process.stderr.write('エラー: --chapter <chN> または --all が必要です（例: --chapter ch1 または --all）\n');
  process.exit(1);
}

// FELO_API_KEY バリデーション（dry-run 以外）
const FELO_API_KEY = process.env.FELO_API_KEY;
if (!dryRun) {
  if (!FELO_API_KEY || FELO_API_KEY.trim() === '') {
    process.stderr.write('エラー: FELO_API_KEY が設定されていません。.env ファイルに FELO_API_KEY=<your-key> を設定してください。\n');
    process.exit(1);
  }
}

// 処理する章ID一覧
const targetChapterIds = allMode
  ? VALID_CHAPTER_IDS
  : [args[chapterArgIdx + 1]];

// --chapter の場合、章IDの検証
if (!allMode) {
  const chapterId = targetChapterIds[0];
  if (!VALID_CHAPTER_IDS.includes(chapterId)) {
    process.stderr.write(`エラー: 無効な章 ID "${chapterId}" です。ch1〜ch8 の形式で指定してください。\n`);
    process.exit(1);
  }
}

// --- ユーティリティ関数 ---

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function appendLog(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  process.stderr.write(line);
  try {
    appendFileSync(runLogPath, line, 'utf-8');
  } catch {
    // log ディレクトリがなければ無視（後で作成）
  }
}

function extractOverviewFromTs(content) {
  // バックティック
  const btMatch = content.match(/overview:\s*`([\s\S]*?)`/);
  if (btMatch) return btMatch[1];
  // シングルクォート1行
  const sqMatch = content.match(/overview:\s*'([^']*)'/);
  if (sqMatch) return sqMatch[1];
  // ダブルクォート1行
  const dqMatch = content.match(/overview:\s*"([^"]*)"/);
  if (dqMatch) return dqMatch[1];
  // 複数行シングルクォート連結パターン
  const multiSqMatch = content.match(/overview:\n([\s\S]*?)(?:,\s*\n\s*(?:beginnerOverview|intermediateOverview|prerequisites|keyTermIds|sections))/);
  if (multiSqMatch) {
    return multiSqMatch[1]
      .replace(/^\s*'/m, '')
      .replace(/'\s*\+\s*\n\s*'/gm, '')
      .replace(/'\s*,?\s*$/m, '')
      .trim();
  }
  return '';
}

function extractAnswer(data) {
  if (data && data.data && data.data.answer) return data.data.answer;
  if (data && data.answer) return data.answer;
  if (data && data.result) return data.result;
  if (data && data.text) return data.text;
  if (data && data.content) return data.content;
  return JSON.stringify(data);
}

const FELO_API_URL = 'https://openapi.felo.ai/v2/chat';

async function feloRequest(prompt) {
  const response = await fetch(FELO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${FELO_API_KEY}`,
    },
    body: JSON.stringify({ query: prompt }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '(レスポンスボディ取得失敗)');
    throw new Error(`Felo API エラー: status=${response.status} body=${errorText}`);
  }

  return await response.json();
}

function buildBeginnerPrompt(chapterNumber, chapterTitle, overview) {
  return `あなたはG検定対策コンテンツの編集者です。

第${chapterNumber}章「${chapterTitle}」の章概要（上級版）を以下に示します：

【上級概要】
${overview}

この章概要を元に、「初級者向け概要」を作成してください。

要件：
- 文字数: 150〜250字（日本語文字数）
- 対象読者: AIについてほとんど知識がない初学者・文系社会人
- 平易な日本語で書く
- 専門用語が出てきたら括弧内でルビや言い換えを付ける（例：「ニューラルネットワーク（神経回路を模したモデル）」）
- 具体例を1つ含める
- フィラー文（「重要なスキルとなるでしょう」「ますます重要です」など中身ゼロの総括）は書かない
- 初学者が「何を学ぶのか」が直感的にわかる内容にする

初級者向け概要のテキストのみ出力してください（説明文や「初級者向け：」などのラベルは不要）。`;
}

function buildIntermediatePrompt(chapterNumber, chapterTitle, overview) {
  return `あなたはG検定対策コンテンツの編集者です。

第${chapterNumber}章「${chapterTitle}」の章概要（上級版）を以下に示します：

【上級概要】
${overview}

この章概要を元に、「中級者向け概要」を作成してください。

要件：
- 文字数: 300〜450字（日本語文字数）
- 対象読者: AIや機械学習に多少触れたことがある社会人・学生
- 専門用語は使用可（ただし主要な用語には簡単な説明を括弧で添える）
- 章全体の流れと重要なポイントを示す
- フィラー文（「重要なスキルとなるでしょう」「ますます重要です」など中身ゼロの総括）は書かない
- G検定の出題範囲・難所を意識した内容にする

中級者向け概要のテキストのみ出力してください（説明文や「中級者向け：」などのラベルは不要）。`;
}

// TS ファイルへの beginnerOverview / intermediateOverview 書き戻し
// overview: フィールドの直後に挿入する
function writeBackOverviewTiers(filePath, beginnerText, intermediateText) {
  let content = readFileSync(filePath, 'utf-8');

  // 既存の beginnerOverview / intermediateOverview があれば上書き
  const hasBeginner = /beginnerOverview\s*:/.test(content);
  const hasIntermediate = /intermediateOverview\s*:/.test(content);

  const escapedBeginner = beginnerText.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${');
  const escapedIntermediate = intermediateText.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${');

  if (hasBeginner) {
    // 既存の beginnerOverview を置換
    content = content.replace(
      /beginnerOverview:\s*`[\s\S]*?`/,
      `beginnerOverview: \`${escapedBeginner}\``
    );
  }

  if (hasIntermediate) {
    // 既存の intermediateOverview を置換
    content = content.replace(
      /intermediateOverview:\s*`[\s\S]*?`/,
      `intermediateOverview: \`${escapedIntermediate}\``
    );
  }

  if (!hasBeginner || !hasIntermediate) {
    // overview フィールドの末尾（シングルクォートまたはバックティックが閉じる部分）を探し、その直後に挿入
    // パターン: "overview:\n    '...'" または "overview: `...`"

    // シングルクォート複数行の場合: overview:\n    '....',\n の , の前に挿入
    // シングルクォート1行の場合:  overview:\n    '....', の , の前に挿入
    // バックティックの場合:       overview: `....`, の , の前に挿入

    // overview: フィールド全体を見つける
    const overviewBtMatch = content.match(/overview:\s*`[\s\S]*?`/);
    const overviewSqMatch = content.match(/overview:\s*\n\s*'[^']*'/);

    let overviewEnd = -1;
    let insertPos = -1;

    if (overviewBtMatch) {
      overviewEnd = content.indexOf(overviewBtMatch[0]) + overviewBtMatch[0].length;
    } else if (overviewSqMatch) {
      overviewEnd = content.indexOf(overviewSqMatch[0]) + overviewSqMatch[0].length;
    }

    if (overviewEnd !== -1) {
      // overviewEnd の直後が , か確認
      const afterOverview = content.slice(overviewEnd);
      if (afterOverview.startsWith(',')) {
        insertPos = overviewEnd + 1;
      } else {
        insertPos = overviewEnd;
      }

      let insertText = '';
      if (!hasBeginner) {
        insertText += `\n  beginnerOverview: \`${escapedBeginner}\`,`;
      }
      if (!hasIntermediate) {
        insertText += `\n  intermediateOverview: \`${escapedIntermediate}\`,`;
      }

      content = content.slice(0, insertPos) + insertText + content.slice(insertPos);
    } else {
      throw new Error('overview フィールドの挿入位置が見つかりません');
    }
  }

  writeFileSync(filePath, content, 'utf-8');
}

// --- 生レスポンス記録 ---
const rawResponses = [];

function saveRawResponses() {
  try {
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(rawResponsesPath, JSON.stringify(rawResponses, null, 2), 'utf-8');
  } catch (e) {
    process.stderr.write(`WARN: raw-felo-responses.json 保存失敗: ${e.message}\n`);
  }
}

// --- 章処理 ---

async function processChapter(chapterId) {
  const chapterNumber = parseInt(chapterId.replace('ch', ''), 10);
  const chapterTitle = CHAPTER_TITLES[chapterId];
  const filePath = join(projectRoot, `src/data/learn/${chapterId}.ts`);

  let content;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch (e) {
    appendLog(`エラー: ファイルが見つかりません: ${filePath}`);
    process.exit(1);
  }

  const overview = extractOverviewFromTs(content);
  if (!overview) {
    appendLog(`エラー: ${chapterId}.ts の overview が取得できませんでした`);
    process.exit(1);
  }

  appendLog(`[${chapterId}] overview 取得完了 (${overview.length}字)`);

  // dry-run: プロンプトを stdout に出力して終了
  if (dryRun) {
    const beginnerPrompt = buildBeginnerPrompt(chapterNumber, chapterTitle, overview);
    const intermediatePrompt = buildIntermediatePrompt(chapterNumber, chapterTitle, overview);
    process.stdout.write(`=== [${chapterId}] beginnerOverview プロンプト ===\n`);
    process.stdout.write(beginnerPrompt);
    process.stdout.write('\n\n');
    process.stdout.write(`=== [${chapterId}] intermediateOverview プロンプト ===\n`);
    process.stdout.write(intermediatePrompt);
    process.stdout.write('\n\n');
    return { success: true, beginnerLen: 0, intermediateLen: 0 };
  }

  // --- beginnerOverview 生成 ---
  let beginnerText = null;
  let beginnerError = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    if (attempt > 1) {
      appendLog(`[${chapterId}] beginnerOverview 再試行 (${attempt}/3)...`);
      await sleep(1500);
    }
    try {
      const prompt = buildBeginnerPrompt(chapterNumber, chapterTitle, overview);
      const data = await feloRequest(prompt);
      const answer = extractAnswer(data).trim();
      rawResponses.push({ chapterId, tier: 'beginner', attempt, response: data });
      saveRawResponses();

      if (answer.length < 50) {
        throw new Error(`生成テキストが短すぎます (${answer.length}字)`);
      }
      beginnerText = answer;
      appendLog(`[${chapterId}] beginnerOverview 生成完了 (${answer.length}字)`);
      break;
    } catch (e) {
      beginnerError = e;
      appendLog(`[${chapterId}] beginnerOverview 試行${attempt}失敗: ${e.message}`);
    }
  }

  if (!beginnerText) {
    appendLog(`[${chapterId}] ERROR: beginnerOverview 3回失敗: ${beginnerError?.message}`);
    return { success: false, beginnerLen: 0, intermediateLen: 0 };
  }

  // ペーシング
  await sleep(1000 + Math.random() * 1000);

  // --- intermediateOverview 生成 ---
  let intermediateText = null;
  let intermediateError = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    if (attempt > 1) {
      appendLog(`[${chapterId}] intermediateOverview 再試行 (${attempt}/3)...`);
      await sleep(1500);
    }
    try {
      const prompt = buildIntermediatePrompt(chapterNumber, chapterTitle, overview);
      const data = await feloRequest(prompt);
      const answer = extractAnswer(data).trim();
      rawResponses.push({ chapterId, tier: 'intermediate', attempt, response: data });
      saveRawResponses();

      if (answer.length < 100) {
        throw new Error(`生成テキストが短すぎます (${answer.length}字)`);
      }
      intermediateText = answer;
      appendLog(`[${chapterId}] intermediateOverview 生成完了 (${answer.length}字)`);
      break;
    } catch (e) {
      intermediateError = e;
      appendLog(`[${chapterId}] intermediateOverview 試行${attempt}失敗: ${e.message}`);
    }
  }

  if (!intermediateText) {
    appendLog(`[${chapterId}] ERROR: intermediateOverview 3回失敗: ${intermediateError?.message}`);
    // beginnerOverview だけでも確定させる
    try {
      writeBackOverviewTiers(filePath, beginnerText, '（生成失敗）');
      appendLog(`[${chapterId}] beginnerOverview のみ書き戻し`);
    } catch (e) {
      appendLog(`[${chapterId}] 書き戻し失敗: ${e.message}`);
    }
    return { success: false, beginnerLen: beginnerText.length, intermediateLen: 0 };
  }

  // --- ファイル書き戻し ---
  try {
    writeBackOverviewTiers(filePath, beginnerText, intermediateText);
    appendLog(`[${chapterId}] 書き戻し完了 beginner=${beginnerText.length}字 intermediate=${intermediateText.length}字`);
  } catch (e) {
    appendLog(`[${chapterId}] 書き戻し失敗: ${e.message}`);
    return { success: false, beginnerLen: beginnerText.length, intermediateLen: intermediateText.length };
  }

  return { success: true, beginnerLen: beginnerText.length, intermediateLen: intermediateText.length };
}

// --- メイン処理 ---

// 出力ディレクトリ作成
try {
  mkdirSync(outputDir, { recursive: true });
} catch {
  // ignore
}

appendLog(`=== felo-generate-overview-tiers 開始 dryRun=${dryRun} chapters=${targetChapterIds.join(',')} ===`);

if (dryRun) {
  for (const chapterId of targetChapterIds) {
    await processChapter(chapterId);
  }
  process.exit(0);
}

let totalSuccess = 0;
let totalFail = 0;

for (let ci = 0; ci < targetChapterIds.length; ci++) {
  const chapterId = targetChapterIds[ci];

  if (ci > 0) {
    // 章間ペーシング 1〜2 秒
    await sleep(1000 + Math.random() * 1000);
  }

  const { success, beginnerLen, intermediateLen } = await processChapter(chapterId);

  if (success) {
    totalSuccess++;
    appendLog(`=== ${chapterId} 完了 beginner=${beginnerLen}字 intermediate=${intermediateLen}字 ===`);
  } else {
    totalFail++;
    appendLog(`=== ${chapterId} 失敗 ===`);
  }
}

saveRawResponses();
appendLog(`=== 完了 成功=${totalSuccess} 失敗=${totalFail} ===`);

if (totalFail > 0) {
  process.stderr.write(`\n${totalFail} 章の生成に失敗しました。.harness/runs/0047/run.log を確認してください。\n`);
  process.exit(1);
}

process.exit(0);
