#!/usr/bin/env node
/**
 * felo-generate-intermediate-body.mjs
 * Felo API を使って各章セクションの「中級本文」（intermediateBody）を生成するスクリプト
 *
 * 使用方法:
 *   node --env-file=.env scripts/felo-generate-intermediate-body.mjs --chapter chN
 *   node --env-file=.env scripts/felo-generate-intermediate-body.mjs --chapter chN --section "<heading>"
 *   node --env-file=.env scripts/felo-generate-intermediate-body.mjs --chapter chN --dry-run
 *
 * 環境変数:
 *   FELO_API_KEY: Felo API キー（.env ファイルに設定）--dry-run 時は不要
 *
 * 出力:
 *   stdout: JSON 形式 { chapterId, results: [{ heading, intermediateBody, charCount, citations }] }
 *   stderr: 進捗ログ [chN / section M/T] <heading>
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

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

// --chapter 未指定時
if (chapterArgIdx === -1 || chapterArgIdx + 1 >= args.length) {
  process.stderr.write('エラー: --chapter <chN> が必要です（例: --chapter ch1）\n');
  process.exit(1);
}

const chapterId = args[chapterArgIdx + 1];

// --chapter が ch1〜ch8 以外の場合
if (!VALID_CHAPTER_IDS.includes(chapterId)) {
  process.stderr.write(`エラー: 無効な章 ID "${chapterId}" です。ch1〜ch8 の形式で指定してください。\n`);
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

// 章番号を取得
const chapterNumber = parseInt(chapterId.replace('ch', ''), 10);
const chapterTitle = CHAPTER_TITLES[chapterId];

// chN.ts からセクションと overview を抽出する簡易パーサー
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
  return '';
}

// チャプターファイルを読み込む
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

const totalSections = targetSections.length;

// dry-run: プロンプトを stdout に出力して終了
if (dryRun) {
  for (let i = 0; i < totalSections; i++) {
    const section = targetSections[i];
    const prompt = buildPrompt(chapterNumber, chapterTitle, overview, section);
    process.stdout.write(`=== [${chapterId} / section ${i + 1}/${totalSections}] ${section.heading} ===\n`);
    process.stdout.write(prompt);
    process.stdout.write('\n\n');
  }
  process.exit(0);
}

function buildPrompt(chapterNum, chTitle, chOverview, section) {
  let prompt = `以下は G検定 第${chapterNum}章「${chTitle}」のセクション「${section.heading}」の解説です。\n\n`;
  prompt += `【章概要】\n${chOverview}\n\n`;
  prompt += `【上級解説（200〜500字、試験本番レベル）】\n${section.body}\n`;
  if (section.beginnerBody) {
    prompt += `\n【初級解説（150〜250字、用語噛み砕き）】\n${section.beginnerBody}\n`;
  }
  prompt += `\n上記を参考に、G検定合格に必要な深度で専門用語を使いながらも過度な細部を省いた「中級解説」を300〜450字で作成してください。\n`;
  prompt += `日本語で出力し、文字数を300字以上450字以下に収めてください。`;
  return prompt;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// citations 抽出ロジック（felo-fetch-learn-material.mjs から流用）
function extractCitations(data) {
  if (data && data.data && data.data.resources && Array.isArray(data.data.resources)) {
    return data.data.resources.map(s => s.link || s.url || s.source || JSON.stringify(s)).filter(Boolean);
  } else if (data && data.data && data.data.sources) {
    return data.data.sources.map(s => s.url || s.link || s.source || JSON.stringify(s)).filter(Boolean);
  } else if (data && data.sources) {
    return data.sources.map(s => s.url || s.link || s.source || JSON.stringify(s)).filter(Boolean);
  } else if (data && data.citations) {
    return data.citations;
  } else if (data && data.data && data.data.citations) {
    return data.data.citations;
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

// 全セクションを順次処理
const results = [];

for (let i = 0; i < totalSections; i++) {
  const section = targetSections[i];

  // 進捗ログ
  process.stderr.write(`[${chapterId} / section ${i + 1}/${totalSections}] ${section.heading}\n`);

  const prompt = buildPrompt(chapterNumber, chapterTitle, overview, section);

  // 1秒ペーシング（最初のセクション以外）
  if (i > 0) {
    await sleep(1000);
  }

  try {
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
      process.stderr.write(`エラー: Felo API がエラーレスポンスを返しました。ステータス: ${response.status}\n`);
      process.stderr.write(`レスポンス: ${errorText}\n`);
      process.exit(1);
    }

    const data = await response.json();
    const intermediateBody = extractAnswer(data).trim();
    const citations = extractCitations(data);

    results.push({
      heading: section.heading,
      intermediateBody,
      charCount: intermediateBody.length,
      citations,
    });

  } catch (error) {
    process.stderr.write(`エラー: Felo API の呼び出しに失敗しました。\n`);
    process.stderr.write(`詳細: ${error.message}\n`);
    process.exit(1);
  }
}

// JSON 出力
const output = {
  chapterId,
  results,
};

process.stdout.write(JSON.stringify(output, null, 2));
process.stdout.write('\n');
process.exit(0);
