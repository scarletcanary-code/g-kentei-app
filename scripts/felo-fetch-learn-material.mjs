#!/usr/bin/env node
/**
 * felo-fetch-learn-material.mjs
 * Felo API を使って章の初学者向け解説素材を取得する補助スクリプト
 *
 * 使用方法:
 *   node --env-file=.env scripts/felo-fetch-learn-material.mjs --chapter chN
 *
 * 例:
 *   node --env-file=.env scripts/felo-fetch-learn-material.mjs --chapter ch1
 *
 * 環境変数:
 *   FELO_API_KEY: Felo API キー（.env ファイルに設定）
 *
 * 注意:
 *   - このスクリプトはローカル開発者が手動実行するツールです
 *   - 取得結果は source_ref_supplements フィールドへの記録に使います
 *   - Node.js 20.6+ の --env-file オプション前提（dotenv パッケージ不使用）
 */

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

// FELO_API_KEY 未設定または空文字列の場合
const apiKey = process.env.FELO_API_KEY;
if (!apiKey || apiKey.trim() === '') {
  process.stderr.write('エラー: FELO_API_KEY が設定されていません。.env ファイルに FELO_API_KEY=<your-key> を設定してください。\n');
  process.exit(1);
}

// 章番号を取得（ch1 → 1, ch8 → 8）
const chapterNumber = parseInt(chapterId.replace('ch', ''), 10);
const chapterTitle = CHAPTER_TITLES[chapterId];

// クエリ文字列を構築
const query = `G検定 第${chapterNumber}章 ${chapterTitle} を初学者向けに 300 文字で解説してください`;

// Felo API を呼び出す
const FELO_API_URL = 'https://openapi.felo.ai/v2/chat';

try {
  const response = await fetch(FELO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '(レスポンスボディ取得失敗)');
    process.stderr.write(`エラー: Felo API がエラーレスポンスを返しました。ステータス: ${response.status}\n`);
    process.stderr.write(`レスポンス: ${errorText}\n`);
    process.exit(1);
  }

  const data = await response.json();

  // レスポンスのテキストを抽出
  // Felo API のレスポンス形式に応じてフィールドを調整
  let resultText = null;
  if (data && data.data && data.data.answer) {
    resultText = data.data.answer;
  } else if (data && data.answer) {
    resultText = data.answer;
  } else if (data && data.result) {
    resultText = data.result;
  } else if (data && data.text) {
    resultText = data.text;
  } else if (data && data.content) {
    resultText = data.content;
  } else {
    resultText = JSON.stringify(data);
  }

  process.stdout.write(resultText);
  process.stdout.write('\n');
  process.exit(0);

} catch (error) {
  process.stderr.write(`エラー: Felo API の呼び出しに失敗しました。\n`);
  process.stderr.write(`詳細: ${error.message}\n`);
  process.exit(1);
}
