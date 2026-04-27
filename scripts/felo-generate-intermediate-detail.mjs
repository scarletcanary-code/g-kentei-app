#!/usr/bin/env node
/**
 * felo-generate-intermediate-detail.mjs
 * Felo API を使って用語集の「中級解説」（intermediateDetail）を生成するスクリプト
 *
 * 使用方法:
 *   node --env-file=.env scripts/felo-generate-intermediate-detail.mjs --all
 *   node --env-file=.env scripts/felo-generate-intermediate-detail.mjs --id <termId>
 *   node --env-file=.env scripts/felo-generate-intermediate-detail.mjs --all --dry-run
 *   node --env-file=.env scripts/felo-generate-intermediate-detail.mjs --id <termId> --dry-run
 *
 * 環境変数:
 *   FELO_API_KEY: Felo API キー（.env ファイルに設定）--dry-run 時は不要
 *
 * 出力:
 *   stdout: JSON 形式 { results: [{ id, term, intermediateDetail, charCount, citations }] }
 *   stderr: 進捗ログ [N/129] term=<term>
 *
 * --write オプション追加時は terms.json を直接上書きする
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// コマンドライン引数のパース
const args = process.argv.slice(2);
const allFlag = args.includes('--all');
const dryRun = args.includes('--dry-run');
const writeFlag = args.includes('--write');
const idArgIdx = args.indexOf('--id');
const termId = (idArgIdx !== -1 && idArgIdx + 1 < args.length) ? args[idArgIdx + 1] : null;

// --all / --id のどちらも指定されていない場合
if (!allFlag && termId === null) {
  process.stderr.write('エラー: --all または --id <termId> のいずれかが必要です。\n');
  process.stderr.write('使用方法: node scripts/felo-generate-intermediate-detail.mjs --all\n');
  process.stderr.write('         node scripts/felo-generate-intermediate-detail.mjs --id <termId>\n');
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

// terms.json を読み込む
const termsPath = join(projectRoot, 'src/data/glossary/terms.json');
const termsRaw = readFileSync(termsPath, 'utf-8');
const terms = JSON.parse(termsRaw);

// 処理対象の用語を決定
let targetTerms;
if (allFlag) {
  targetTerms = terms;
} else {
  const found = terms.find((t) => t.id === termId);
  if (!found) {
    process.stderr.write(`エラー: id "${termId}" の用語が terms.json に見つかりません。\n`);
    process.exit(1);
  }
  targetTerms = [found];
}

const totalTerms = targetTerms.length;
const totalAll = terms.length;

function buildPrompt(term) {
  let prompt = `以下は G検定の用語「${term.term}（${term.termEn}）」の解説情報です。\n\n`;
  prompt += `【定義（1〜2文の簡潔な説明）】\n${term.definition}\n\n`;
  prompt += `【上級解説（専門的・試験本番レベル）】\n${term.detail}\n`;
  if (term.beginnerDetail) {
    prompt += `\n【初級解説（やさしい言葉、比喩を用いた説明）】\n${term.beginnerDetail}\n`;
  }
  prompt += `\n上記を参考に、G検定合格に必要な専門用語を使いながらも初学者にも理解しやすい「中級解説」を日本語で作成してください。\n`;
  prompt += `Felo の自然な出力量で構いません。`;
  return prompt;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// citations 抽出ロジック（felo-generate-intermediate-body.mjs から流用）
function extractCitations(data) {
  if (data && data.data && data.data.resources && Array.isArray(data.data.resources)) {
    return data.data.resources
      .map((s) => s.link || s.url || s.source)
      .filter(Boolean);
  } else if (data && data.data && data.data.sources) {
    return data.data.sources
      .map((s) => s.url || s.link || s.source)
      .filter(Boolean);
  } else if (data && data.sources) {
    return data.sources
      .map((s) => s.url || s.link || s.source)
      .filter(Boolean);
  } else if (data && data.citations) {
    return data.citations.filter((c) => typeof c === 'string');
  } else if (data && data.data && data.data.citations) {
    return data.data.citations.filter((c) => typeof c === 'string');
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

// dry-run: プロンプトを stdout に出力して終了
if (dryRun) {
  for (let i = 0; i < totalTerms; i++) {
    const term = targetTerms[i];
    const prompt = buildPrompt(term);
    process.stdout.write(`=== [${i + 1}/${totalAll}] term=${term.term} ===\n`);
    process.stdout.write(prompt);
    process.stdout.write('\n\n');
  }
  process.exit(0);
}

// 全用語を順次処理
const results = [];

for (let i = 0; i < totalTerms; i++) {
  const term = targetTerms[i];

  // 進捗ログ（stderr）
  process.stderr.write(`[${i + 1}/${totalAll}] term=${term.term}\n`);

  const prompt = buildPrompt(term);

  // 1秒ペーシング（最初の用語以外）
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
    const intermediateDetail = extractAnswer(data).trim();
    const citations = extractCitations(data);

    results.push({
      id: term.id,
      term: term.term,
      intermediateDetail,
      charCount: intermediateDetail.length,
      citations,
    });

  } catch (error) {
    process.stderr.write(`エラー: Felo API の呼び出しに失敗しました。\n`);
    process.stderr.write(`詳細: ${error.message}\n`);
    process.exit(1);
  }
}

// --write オプション: terms.json を直接更新
if (writeFlag) {
  const termMap = {};
  for (const r of results) {
    termMap[r.id] = r;
  }
  const updatedTerms = terms.map((t) => {
    if (termMap[t.id]) {
      const r = termMap[t.id];
      const updated = { ...t, intermediateDetail: r.intermediateDetail };
      if (r.citations && r.citations.length > 0) {
        const existingSupplements = Array.isArray(t.source_ref_supplements) ? t.source_ref_supplements : [];
        const newSupplements = [...new Set([...existingSupplements, ...r.citations])];
        updated.source_ref_supplements = newSupplements;
      }
      return updated;
    }
    return t;
  });
  writeFileSync(termsPath, JSON.stringify(updatedTerms, null, 2), 'utf-8');
  process.stderr.write(`terms.json を更新しました（${results.length} 件）\n`);
}

// JSON 出力
const output = {
  results,
};

process.stdout.write(JSON.stringify(output, null, 2));
process.stdout.write('\n');
process.exit(0);
