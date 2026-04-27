#!/usr/bin/env node
/**
 * felo-generate-intermediate-body.mjs
 * Felo API を使って各章セクションの「中級本文」（intermediateBody）を生成・書き戻しするスクリプト
 *
 * 使用方法:
 *   node --env-file=.env scripts/felo-generate-intermediate-body.mjs --chapter chN
 *   node --env-file=.env scripts/felo-generate-intermediate-body.mjs --chapter chN --section "<heading>"
 *   node --env-file=.env scripts/felo-generate-intermediate-body.mjs --chapter chN --dry-run
 *   node --env-file=.env scripts/felo-generate-intermediate-body.mjs --all
 *
 * 環境変数:
 *   FELO_API_KEY: Felo API キー（.env ファイルに設定）--dry-run 時は不要
 *
 * 出力:
 *   stdout: dry-run時はプロンプト文字列
 *   stderr: 進捗ログ [chN / batch M/T] sections i〜j
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const harnessRoot = join(projectRoot, '..', '.harness');
const backupDir = join(harnessRoot, 'runs', '0028-backup');
const rejectedPath = join(harnessRoot, 'runs', '0028-rejected.json');

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
const sectionArgIdx = args.indexOf('--section');
const dryRun = args.includes('--dry-run');
const allMode = args.includes('--all');

// --all と --chapter が同時指定された場合はエラー
if (allMode && chapterArgIdx !== -1) {
  process.stderr.write('エラー: --all と --chapter を同時に指定できません。どちらか一方を使用してください。\n');
  process.exit(1);
}

// --all でも --chapter でもない場合はエラー
if (!allMode && (chapterArgIdx === -1 || chapterArgIdx + 1 >= args.length)) {
  process.stderr.write('エラー: --chapter <chN> または --all が必要です（例: --chapter ch1 または --all）\n');
  process.exit(1);
}

// FELO_API_KEY バリデーション（dry-run 以外）
const apiKey = process.env.FELO_API_KEY;
if (!dryRun) {
  if (!apiKey || apiKey.trim() === '') {
    process.stderr.write('エラー: FELO_API_KEY が設定されていません。.env ファイルに FELO_API_KEY=<your-key> を設定してください。\n');
    process.exit(1);
  }
}

// --section フィルタ
const sectionFilter = (sectionArgIdx !== -1 && sectionArgIdx + 1 < args.length)
  ? args[sectionArgIdx + 1]
  : null;

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

function extractBacktickOrQuote(objStr, fieldName) {
  // バックティック
  const btRegex = new RegExp(`${fieldName}:\\s*\`([\\s\\S]*?)\``);
  const btMatch = objStr.match(btRegex);
  if (btMatch) return btMatch[1];
  // シングルクォート（複数行なし）
  const sqRegex = new RegExp(`${fieldName}:\\s*'([^']*)'`);
  const sqMatch = objStr.match(sqRegex);
  if (sqMatch) return sqMatch[1];
  // ダブルクォート
  const dqRegex = new RegExp(`${fieldName}:\\s*"([^"]*)"`);
  const dqMatch = objStr.match(dqRegex);
  if (dqMatch) return dqMatch[1];
  return null;
}

function extractSectionsFromTs(content) {
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
        sections.push(parseSectionObj(objStr));
        objStart = -1;
      }
    }
  }
  return sections;
}

function parseSectionObj(objStr) {
  const heading = extractBacktickOrQuote(objStr, 'heading');
  const body = extractBacktickOrQuote(objStr, 'body');
  const beginnerBody = extractBacktickOrQuote(objStr, 'beginnerBody');
  return { heading, body, beginnerBody };
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
  // 複数行シングルクォート連結パターン対応
  const multiMatch = content.match(/overview:\s*\n([\s\S]*?)(?:,\s*\n\s*(?:prerequisites|keyTermIds|sections))/);
  if (multiMatch) {
    return multiMatch[1]
      .replace(/^\s*'/m, '')
      .replace(/'\s*\+\s*\n\s*'/gm, '')
      .replace(/'\s*$/m, '')
      .trim();
  }
  return '';
}

// citations 抽出ロジック
function extractCitations(data) {
  if (data && data.data && data.data.resources && Array.isArray(data.data.resources)) {
    return data.data.resources.map(s => s.link || s.url || s.source || '').filter(Boolean);
  } else if (data && data.data && data.data.sources) {
    return data.data.sources.map(s => s.url || s.link || s.source || '').filter(Boolean);
  } else if (data && data.sources) {
    return data.sources.map(s => s.url || s.link || s.source || '').filter(Boolean);
  } else if (data && data.citations) {
    return Array.isArray(data.citations) ? data.citations : [];
  } else if (data && data.data && data.data.citations) {
    return Array.isArray(data.data.citations) ? data.data.citations : [];
  }
  return [];
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

// バッチプロンプト構築
function buildBatchPrompt(chapterNumber, chapterTitle, sections) {
  const inputData = sections.map(s => ({
    id: s.heading,
    advanced: s.body || '',
    beginner: s.beginnerBody || '',
  }));

  let prompt = `あなたは G検定対策コンテンツの編集者です。\n\n`;
  prompt += `【対象読者】「中級」レベル\n`;
  prompt += `- 機械学習やAIに多少触れたことがある社会人・学生\n`;
  prompt += `- 専門用語は前提知識として使ってよい（厳密な定義は不要）\n`;
  prompt += `- 初級（AIリテラシーゼロ）と上級（G検定合格レベル）の中間\n`;
  prompt += `- フィラー文禁止: 「重要なスキルとなるでしょう」「ますます重要です」「ビジネスや日常生活で活用」「必要なスキルです」「日常生活で活用」など中身ゼロの総括は書かない\n`;
  prompt += `- 各セクションで異なる表現・構成にする（テンプレ化を避ける）\n\n`;
  prompt += `第${chapterNumber}章「${chapterTitle}」について、以下の ${sections.length} 件のセクションそれぞれの「中級解説」を JSON 配列で出力してください。\n`;
  prompt += `80字以上で、フィラー文なしで、具体的かつ簡潔に書いてください。\n\n`;
  prompt += `入力データ:\n${JSON.stringify(inputData, null, 2)}\n\n`;
  prompt += `出力フォーマット（他のテキストを一切含めずこのJSONのみ出力）:\n`;
  prompt += `\`\`\`json\n`;
  prompt += `[\n`;
  prompt += `  {"id": "<section.heading>", "intermediate": "<中級解説テキスト>"},\n`;
  prompt += `  ...\n`;
  prompt += `]\n`;
  prompt += `\`\`\``;

  return prompt;
}

// 単問プロンプト構築（フォールバック用）
function buildSinglePrompt(chapterNumber, chapterTitle, chapterOverview, section) {
  let prompt = `以下は G検定 第${chapterNumber}章「${chapterTitle}」のセクション「${section.heading}」の解説です。\n\n`;
  prompt += `【章概要】\n${chapterOverview}\n\n`;
  prompt += `【上級解説（200〜500字、試験本番レベル）】\n${section.body}\n`;
  if (section.beginnerBody) {
    prompt += `\n【初級解説（150〜250字、用語噛み砕き）】\n${section.beginnerBody}\n`;
  }
  prompt += `\n【対象読者】「中級」レベル\n`;
  prompt += `- 機械学習やAIに多少触れたことがある社会人・学生\n`;
  prompt += `- 専門用語は前提知識として使ってよい\n`;
  prompt += `- フィラー文禁止: 「重要なスキルとなるでしょう」「ますます重要です」「ビジネスや日常生活で活用」「必要なスキルです」など中身ゼロの総括は書かない\n\n`;
  prompt += `上記を参考に、G検定合格に必要な深度で専門用語を使いながらも過度な細部を省いた「中級解説」を100〜500字で作成してください。\n`;
  prompt += `日本語で出力し、フィラー文なしで具体的かつ簡潔に書いてください。`;
  return prompt;
}

// Felo APIリクエスト
async function feloRequest(prompt) {
  const response = await fetch(FELO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query: prompt }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '(レスポンスボディ取得失敗)');
    throw new Error(`Felo API エラー: status=${response.status} body=${errorText}`);
  }

  return await response.json();
}

// バッチレスポンスから JSON 配列を抽出してパース
function parseBatchResponse(responseText, expectedSections) {
  // ```json ... ``` ブロックを抽出
  const jsonBlockMatch = responseText.match(/```json\s*([\s\S]*?)```/);
  let jsonStr = null;
  if (jsonBlockMatch) {
    jsonStr = jsonBlockMatch[1].trim();
  } else {
    // コードブロックなしの場合、全体をJSONとして試みる
    jsonStr = responseText.trim();
    // 先頭と末尾の [ ] を探す
    const startIdx = jsonStr.indexOf('[');
    const endIdx = jsonStr.lastIndexOf(']');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      jsonStr = jsonStr.slice(startIdx, endIdx + 1);
    }
  }

  if (!jsonStr) {
    throw new Error('JSONブロックが見つかりません');
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error(`JSON パース失敗: ${e.message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error('パース結果が配列ではありません');
  }

  if (parsed.length !== expectedSections.length) {
    throw new Error(`配列長不一致: expected=${expectedSections.length} actual=${parsed.length}`);
  }

  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];
    if (!item || typeof item !== 'object') {
      throw new Error(`要素[${i}]がオブジェクトではありません`);
    }
    if (!item.id) {
      throw new Error(`要素[${i}]に id フィールドがありません`);
    }
    // IDが入力セクション見出しと一致するか確認
    if (!expectedSections.some(s => s.heading === item.id)) {
      throw new Error(`要素[${i}] id="${item.id}" が入力セクション見出しに一致しません`);
    }
  }

  return parsed;
}

// TS ファイルへの intermediateBody 書き戻し
function writeBackIntermediateBody(filePath, heading, intermediateText) {
  let content = readFileSync(filePath, 'utf-8');

  // heading の位置を特定してそのセクションの intermediateBody を置換する
  const headingPatterns = [
    `heading: \`${heading}\``,
    `heading: '${heading}'`,
    `heading: "${heading}"`,
  ];

  let headingPos = -1;
  for (const pattern of headingPatterns) {
    const pos = content.indexOf(pattern);
    if (pos !== -1) {
      headingPos = pos;
      break;
    }
  }

  if (headingPos === -1) {
    throw new Error(`heading "${heading}" がファイル内に見つかりません`);
  }

  // heading より後の intermediateBody を対象セクション内で置換
  // セクションの終端（次の { か、sections: 配列の ] か）を探す
  // heading 以降のテキストを取得
  const afterHeading = content.slice(headingPos);

  // バックティック形式
  const btPattern = /intermediateBody:\s*`[^`]*`/;
  // シングルクォート形式
  const sqPattern = /intermediateBody:\s*'(?:[^'\\]|\\.)*'/;

  const escapedText = intermediateText.replace(/`/g, '\\`');
  const newValue = `intermediateBody: \`${escapedText}\``;

  let newAfterHeading;
  if (btPattern.test(afterHeading)) {
    newAfterHeading = afterHeading.replace(btPattern, newValue);
  } else if (sqPattern.test(afterHeading)) {
    newAfterHeading = afterHeading.replace(sqPattern, newValue);
  } else {
    throw new Error(`heading "${heading}" のセクション内に intermediateBody フィールドが見つかりません`);
  }

  const newContent = content.slice(0, headingPos) + newAfterHeading;
  writeFileSync(filePath, newContent, 'utf-8');
}

// TS ファイルへの source_ref_supplements 書き戻し
function writeBackSourceRefSupplements(filePath, newUrls) {
  if (!newUrls || newUrls.length === 0) return;

  let content = readFileSync(filePath, 'utf-8');

  // 既存の source_ref_supplements を抽出
  const existingPattern = /source_ref_supplements:\s*\[[\s\S]*?\]/;
  const existingMatch = content.match(existingPattern);

  // 既存URLを収集
  let existingUrls = [];
  if (existingMatch) {
    const arrContent = existingMatch[0];
    const urlRegex = /['"`]([^'"`\n]+)['"`]/g;
    let m;
    while ((m = urlRegex.exec(arrContent)) !== null) {
      if (m[1].startsWith('http')) {
        existingUrls.push(m[1]);
      }
    }
  }

  // 重複排除してマージ
  const mergedUrls = [...new Set([...existingUrls, ...newUrls.filter(u => typeof u === 'string' && u.startsWith('http'))])];

  if (mergedUrls.length === 0) return;

  // 新しい source_ref_supplements の値を構築
  const urlLines = mergedUrls.map(u => `    '${u}',`).join('\n');
  const newSupplements = `source_ref_supplements: [\n${urlLines}\n  ]`;

  if (existingMatch) {
    // 既存の配列を置換
    content = content.replace(existingPattern, newSupplements);
  } else {
    // チャプターオブジェクトの末尾（最後の } の直前）に追加
    const lastBraceIdx = content.lastIndexOf('\n};');
    if (lastBraceIdx !== -1) {
      content = content.slice(0, lastBraceIdx) + `\n  ${newSupplements},` + content.slice(lastBraceIdx);
    } else {
      process.stderr.write(`WARN: ${filePath} に source_ref_supplements 挿入位置が見つかりません\n`);
      return;
    }
  }

  writeFileSync(filePath, content, 'utf-8');
}

// rejected セクションを記録
function appendRejected(entry) {
  let existing = [];
  if (existsSync(rejectedPath)) {
    try {
      existing = JSON.parse(readFileSync(rejectedPath, 'utf-8'));
    } catch {
      existing = [];
    }
  }
  existing.push(entry);
  writeFileSync(rejectedPath, JSON.stringify(existing, null, 2), 'utf-8');
}

// 章を処理する
async function processChapter(chapterId) {
  const chapterNumber = parseInt(chapterId.replace('ch', ''), 10);
  const chapterTitle = CHAPTER_TITLES[chapterId];
  const filePath = join(projectRoot, `src/data/learn/${chapterId}.ts`);

  let content;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch (e) {
    process.stderr.write(`エラー: ファイルが見つかりません: ${filePath}\n`);
    process.exit(1);
  }

  const overview = extractOverviewFromTs(content);
  const allSections = extractSectionsFromTs(content);

  // --section フィルタを適用
  const targetSections = sectionFilter
    ? allSections.filter(s => s.heading === sectionFilter)
    : allSections;

  if (targetSections.length === 0) {
    if (sectionFilter) {
      process.stderr.write(`エラー: セクション "${sectionFilter}" が ${chapterId}.ts に見つかりません。\n`);
    } else {
      process.stderr.write(`エラー: ${chapterId}.ts にセクションが見つかりません。\n`);
    }
    process.exit(1);
  }

  // dry-run: プロンプトを stdout に出力して終了（章単位バッチプロンプトを表示）
  if (dryRun) {
    const BATCH_SIZE = 5;
    const totalSections = targetSections.length;
    const numBatches = Math.ceil(totalSections / BATCH_SIZE);

    for (let b = 0; b < numBatches; b++) {
      const batchSections = targetSections.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
      const prompt = buildBatchPrompt(chapterNumber, chapterTitle, batchSections);
      const i = b * BATCH_SIZE;
      const j = Math.min((b + 1) * BATCH_SIZE, totalSections) - 1;
      process.stdout.write(`=== [${chapterId} / batch ${b + 1}/${numBatches}] sections ${i + 1}〜${j + 1} ===\n`);
      process.stdout.write(prompt);
      process.stdout.write('\n\n');
    }
    return { successCount: 0, rejectedCount: 0 };
  }

  // バックアップ（dry-run 以外）
  try {
    mkdirSync(backupDir, { recursive: true });
    writeFileSync(
      join(backupDir, `learn-${chapterId}.ts.bak`),
      content,
      'utf-8'
    );
    process.stderr.write(`[BACKUP] ${chapterId} → .harness/runs/0028-backup/learn-${chapterId}.ts.bak\n`);
  } catch (e) {
    process.stderr.write(`エラー: バックアップ作成失敗: ${e.message}\n`);
    process.exit(1);
  }

  // バッチ処理
  const BATCH_SIZE = 5;
  const totalSections = targetSections.length;
  const numBatches = Math.ceil(totalSections / BATCH_SIZE);

  let successCount = 0;
  let rejectedCount = 0;
  const allCitations = [];

  for (let b = 0; b < numBatches; b++) {
    if (b > 0) {
      await sleep(1000);
    }

    const batchStart = b * BATCH_SIZE;
    const batchEnd = Math.min((b + 1) * BATCH_SIZE, totalSections);
    const batchSections = targetSections.slice(batchStart, batchEnd);

    process.stderr.write(`[${chapterId} / batch ${b + 1}/${numBatches}] sections ${batchStart + 1}〜${batchEnd}\n`);

    const prompt = buildBatchPrompt(chapterNumber, chapterTitle, batchSections);

    // バッチリクエスト（最大2回）
    let batchResult = null;
    let batchError = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) {
        process.stderr.write(`[${chapterId} / batch ${b + 1}] 再試行 (${attempt + 1}/2)...\n`);
        await sleep(1000);
      }

      try {
        const data = await feloRequest(prompt);
        const responseText = extractAnswer(data);
        const citations = extractCitations(data);
        allCitations.push(...citations);

        const parsed = parseBatchResponse(responseText, batchSections);
        batchResult = parsed;
        break;
      } catch (e) {
        batchError = e;
        process.stderr.write(`[${chapterId} / batch ${b + 1}] 試行${attempt + 1}失敗: ${e.message}\n`);
      }
    }

    if (batchResult !== null) {
      // バッチ成功 → 各セクションに書き戻し
      for (const item of batchResult) {
        const intermediateText = item.intermediate || '';
        try {
          writeBackIntermediateBody(filePath, item.id, intermediateText);
          process.stderr.write(`[OK] ${chapterId} / ${item.id}\n`);
          successCount++;
        } catch (e) {
          process.stderr.write(`[REJECTED] ${chapterId} / ${item.id}: 書き戻し失敗: ${e.message}\n`);
          appendRejected({
            chapterId,
            heading: item.id,
            batchAttempts: 2,
            singleAttempt: 0,
            error: e.message,
          });
          rejectedCount++;
        }
      }
    } else {
      // バッチ失敗 → 単問フォールバック
      process.stderr.write(`[${chapterId} / batch ${b + 1}] バッチ2回失敗。単問フォールバックを開始します。\n`);

      for (let si = 0; si < batchSections.length; si++) {
        if (si > 0) {
          await sleep(1000);
        }

        const section = batchSections[si];
        const singlePrompt = buildSinglePrompt(chapterNumber, chapterTitle, overview, section);

        let singleSuccess = false;
        let singleError = null;

        try {
          const data = await feloRequest(singlePrompt);
          const intermediateText = extractAnswer(data).trim();
          const citations = extractCitations(data);
          allCitations.push(...citations);

          writeBackIntermediateBody(filePath, section.heading, intermediateText);
          process.stderr.write(`[OK] ${chapterId} / ${section.heading} (single fallback)\n`);
          successCount++;
          singleSuccess = true;
        } catch (e) {
          singleError = e;
          process.stderr.write(`[REJECTED] ${chapterId} / ${section.heading}: ${e.message}\n`);
        }

        if (!singleSuccess) {
          appendRejected({
            chapterId,
            heading: section.heading,
            batchAttempts: 2,
            singleAttempt: 1,
            error: singleError ? singleError.message : '不明なエラー',
          });
          rejectedCount++;
        }
      }
    }
  }

  // source_ref_supplements 書き戻し
  if (allCitations.length > 0) {
    try {
      writeBackSourceRefSupplements(filePath, allCitations);
      process.stderr.write(`[source_ref_supplements] ${chapterId}: ${allCitations.length} URL を追加\n`);
    } catch (e) {
      process.stderr.write(`WARN: source_ref_supplements 書き戻し失敗 (${chapterId}): ${e.message}\n`);
    }
  }

  return { successCount, rejectedCount };
}

// --- メイン処理 ---

if (dryRun) {
  // dry-run モード: 最初の章のバッチプロンプトだけ出力して終了
  const chapterId = targetChapterIds[0];
  await processChapter(chapterId);
  process.exit(0);
}

let totalSuccess = 0;
let totalRejected = 0;

for (let ci = 0; ci < targetChapterIds.length; ci++) {
  const chapterId = targetChapterIds[ci];

  if (ci > 0 && allMode) {
    // 章間の1秒ペーシング
    await sleep(1000);
  }

  const { successCount, rejectedCount } = await processChapter(chapterId);
  totalSuccess += successCount;
  totalRejected += rejectedCount;

  if (allMode) {
    process.stderr.write(`=== ${chapterId} 完了 (${successCount}/${successCount + rejectedCount} 成功) ===\n`);
  }
}

if (totalRejected > 0) {
  process.stderr.write(`\n合計 rejected: ${totalRejected} セクション\n`);
}

if (totalRejected > 5) {
  process.stderr.write(`エラー: rejected セクション数 (${totalRejected}) が 5 を超えています。\n`);
  process.exit(1);
}

process.exit(0);
