/**
 * felo-generate-choices.mjs
 *
 * 使い方:
 *   node --env-file=.env scripts/felo-generate-choices.mjs --qid ch1-001
 *   node --env-file=.env scripts/felo-generate-choices.mjs --chapter ch1
 *
 * 環境変数:
 *   FELO_API_KEY: Felo Open Platform の API キー（.env ファイルを --env-file で渡す）
 *
 * 出力 (stdout):
 *   {"qid":"<id>","candidates":["誤答A","誤答B","誤答C"],"felo_resources":["url1","url2"]}
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// FELO_API_KEY チェック (process.env.FELO_API_KEY を参照)
const FELO_API_KEY = process.env.FELO_API_KEY;
if (!FELO_API_KEY || FELO_API_KEY.trim() === '') {
  process.stderr.write(
    'Error: FELO_API_KEY is not set. Create g-kentei-app/.env from .env.example.\n'
  );
  process.exit(1);
}

// 引数パース
const args = process.argv.slice(2);
let qidArg = null;
let chapterArg = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--qid' && args[i + 1]) {
    qidArg = args[++i];
  } else if (args[i] === '--chapter' && args[i + 1]) {
    chapterArg = args[++i];
  }
}

if (!qidArg && !chapterArg) {
  process.stderr.write('Usage: --qid <question-id> | --chapter <chN>\n');
  process.exit(1);
}

/**
 * Felo API を呼び出して誤答候補を取得する
 * @param {string} qid - 問題 ID
 * @param {string} questionText - 問題文
 * @returns {Promise<{candidates: string[], felo_resources: string[]}>}
 */
async function fetchCandidates(qid, questionText) {
  const prompt = `G検定の問題『${questionText}』に対し、もっともらしい誤答選択肢を3つ、それぞれ40〜60文字程度で日本語で作成してください。`;

  const response = await fetch('https://openapi.felo.ai/v2/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${FELO_API_KEY}`,
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Felo API HTTP ${response.status}: ${errText}`);
  }

  const data = await response.json();

  // answer フィールドから候補を抽出 (番号付きリスト形式を想定)
  const answer = data.answer || data.message || data.content || '';
  const lines = answer.split('\n').map(l => l.trim()).filter(Boolean);
  const candidates = lines
    .filter(l => /^[1-3][\.\)、]/.test(l))
    .map(l => l.replace(/^[1-3][\.\)、]\s*/, '').trim())
    .slice(0, 3);

  // フォールバック: 行全体から最初の3行を使う
  const finalCandidates = candidates.length >= 1 ? candidates : lines.slice(0, 3);

  // resources 抽出
  const resources = (data.resources || []).map(r => r.url || r).filter(Boolean);

  return { candidates: finalCandidates, felo_resources: resources };
}

async function main() {
  const questionsDir = path.resolve(__dirname, '../src/data/questions');

  if (qidArg) {
    // 単一問題モード
    let found = null;
    for (const file of fs.readdirSync(questionsDir).filter(f => f.endsWith('.json'))) {
      const data = JSON.parse(fs.readFileSync(path.join(questionsDir, file), 'utf8'));
      const q = data.find(q => q.id === qidArg);
      if (q) { found = q; break; }
    }
    if (!found) {
      process.stderr.write(`Error: question id "${qidArg}" not found.\n`);
      process.exit(1);
    }
    try {
      const result = await fetchCandidates(found.id, found.question);
      process.stdout.write(JSON.stringify({ qid: found.id, ...result }) + '\n');
    } catch (e) {
      process.stderr.write(`Error fetching Felo for ${found.id}: ${e.message}\n`);
      process.exit(1);
    }
  } else if (chapterArg) {
    // 章モード
    const filePath = path.join(questionsDir, `${chapterArg}.json`);
    if (!fs.existsSync(filePath)) {
      process.stderr.write(`Error: file not found: ${filePath}\n`);
      process.exit(1);
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    for (const q of data) {
      try {
        const result = await fetchCandidates(q.id, q.question);
        process.stdout.write(JSON.stringify({ qid: q.id, ...result }) + '\n');
        // レートリミット対策: 1秒待機
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        process.stderr.write(`Error fetching Felo for ${q.id}: ${e.message}\n`);
      }
    }
  }
}

main().catch(e => {
  process.stderr.write(`Unexpected error: ${e.message}\n`);
  process.exit(1);
});
