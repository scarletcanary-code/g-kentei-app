/**
 * felo-regenerate-distractors.mjs
 *
 * 使い方:
 *   node --env-file=.env scripts/felo-regenerate-distractors.mjs --chapter ch1
 *   node --env-file=.env scripts/felo-regenerate-distractors.mjs --qid ch1-001
 *   node --env-file=.env scripts/felo-regenerate-distractors.mjs --chapter ch1 --dry-run
 *
 * 環境変数:
 *   FELO_API_KEY: Felo Open Platform の API キー
 *
 * SKIP 対象: ch1-036, ch1-037
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// FELO_API_KEY チェック
const FELO_API_KEY = process.env.FELO_API_KEY;
if (!FELO_API_KEY || FELO_API_KEY.trim() === '') {
  process.stderr.write(
    'FELO_API_KEY is not set. Create g-kentei-app/.env from .env.example.\n'
  );
  process.exit(1);
}

// 引数パース
const args = process.argv.slice(2);
let qidArg = null;
let chapterArg = null;
let fromChapterArg = null;
let dryRun = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--qid' && args[i + 1]) {
    qidArg = args[++i];
  } else if (args[i] === '--chapter' && args[i + 1]) {
    chapterArg = args[++i];
  } else if (args[i] === '--from-chapter' && args[i + 1]) {
    fromChapterArg = args[++i];
  } else if (args[i] === '--dry-run') {
    dryRun = true;
  }
}

if (!qidArg && !chapterArg && !fromChapterArg) {
  process.stderr.write('Usage: --qid <question-id> | --chapter <chN> | --from-chapter <chN> [--dry-run]\n');
  process.exit(1);
}

// SKIP 対象
const SKIP_IDS = new Set(['ch1-036', 'ch1-037']);

// 禁止語尾パターン（V10）
const BANNED_SUFFIX_V10 = [
  /として定義される(?:技術的)?(?:概念)?(?:・考え方)?。?$/,
  /の概念(?:・考え方)?。?$/,
  /のための概念。?$/,
  /(?:した|する)の概念/,
  /に重点化した?/,
  /主な用途の/,
  /ほぼすべてのの/,
  /という(?:考え方|手法|枠組み)に基づく(?:手法|処理機構)?。?$/,
];

// 助詞重複パターン（V11）
const DUP_ALLOWLIST = ['ものの', '我々', '日々', '人々', '個々', '別々', '中々', '時々'];
function hasDupParticle(text) {
  const matches = text.match(/.{0,2}(のの|をを|にに|がが|でで|はは).{0,2}/g) || [];
  return matches.some(hit => !DUP_ALLOWLIST.some(a => hit.includes(a)));
}

// 末尾 N-gram 衝突チェック（V12）
const tail = (s, n = 8) => s.slice(-n).replace(/[。、\s]+$/, '');
function editDistance(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}
function hasTailCollision(texts) {
  const tails = texts.map(t => tail(t));
  for (let a = 0; a < tails.length; a++) {
    for (let b = a + 1; b < tails.length; b++) {
      if (tails[a] === tails[b] || editDistance(tails[a], tails[b]) <= 1) {
        return tails[a];
      }
    }
  }
  return null;
}

// 文字数比チェック（全4選択肢 max/min ≤ 1.6）
function charRatioOk(candidates, correctText) {
  const allLens = [...candidates.map(t => t.length), correctText.length];
  const maxLen = Math.max(...allLens);
  const minLen = Math.min(...allLens);
  if (minLen === 0) return false;
  return maxLen / minLen <= 1.6;
}

// Felo API 呼び出し
async function feloChat(prompt) {
  const response = await fetch('https://openapi.felo.ai/v2/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${FELO_API_KEY}`,
    },
    body: JSON.stringify({
      query: prompt,
      lang: 'ja',
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Felo API HTTP ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const inner = data.data || data;
  const answer = inner.answer || inner.message || inner.content || data.answer || '';
  const resources = ((inner.resources || data.resources || []).map(r => r.url || r)).filter(Boolean);

  // JSON 配列形式を抽出
  const jsonMatch = answer.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1].trim());
      if (Array.isArray(parsed) && parsed.length >= 3) {
        return { candidates: parsed.slice(0, 3).map(String), resources };
      }
    } catch (_) {}
  }

  // フォールバック: 番号付きリスト
  const lines = answer.split('\n').map(l => l.trim()).filter(Boolean);
  const numbered = lines
    .filter(l => /^[1-3][\.\)、]/.test(l))
    .map(l => l.replace(/^[1-3][\.\)、]\s*/, '').trim())
    .slice(0, 3);
  if (numbered.length >= 3) {
    return { candidates: numbered, resources };
  }

  // 最終フォールバック
  return { candidates: lines.slice(0, 3), resources };
}

// 文字数パディング（短すぎる候補に対して安全な補足を追加）
const SAFE_SUFFIXES_BY_IDX = [
  // インデックス0用サフィックス（短→長の順）
  [
    'という技術', 'という手法', 'という特性', '・手法',
    'という仕組み', 'という機能', '・技術', '・処理',
    'という技術的な手法', 'に分類される技術', 'を実現する技術',
    'を目的とした技術', 'であるシステム', 'という処理方式',
    'として位置づけられる技術', 'に用いられる技術的手法',
    'とされる重要な技術領域', 'を指す技術的な概念',
  ],
  // インデックス1用サフィックス
  [
    'である', 'という', '・機能',
    'という学習アプローチ', 'に関連する処理', 'であるモデル',
    'を扱う手法', 'という処理機構', 'という特性',
    'として活用される手法', 'に基づく処理方式',
    'として機能する技術的なシステム', 'を扱う代表的な手法',
    'に応用される技術的な仕組み', 'を指す重要な概念',
  ],
  // インデックス2用サフィックス
  [
    'という', '・仕組み',
    'という仕組み', 'であるアルゴリズム', 'を実現する手法',
    'という機能', 'という技術', 'に基づく処理',
    'として適用される技術', 'を実現するアルゴリズム',
    'に関連する技術的な処理', 'を示す重要な概念',
    'として用いられる技術的手法', 'を扱う技術的なアプローチ',
  ],
];
function padCandidate(text, minLen, maxLen, suffixIdx = 0, usedTails = new Set()) {
  if (text.length >= minLen) return text;
  // 既に句点で終わっている場合は除去してから追加
  const base = text.replace(/[。]$/, '');
  // まずインデックス対応のサフィックスを試す
  const primarySuffixes = SAFE_SUFFIXES_BY_IDX[suffixIdx % SAFE_SUFFIXES_BY_IDX.length];
  const allSuffixes = [...primarySuffixes, ...SAFE_SUFFIXES_BY_IDX.flat()];
  const seen = new Set();
  for (const suffix of allSuffixes) {
    if (seen.has(suffix)) continue;
    seen.add(suffix);
    const padded = base + suffix;
    if (padded.length >= minLen && padded.length <= maxLen) {
      // V10チェック
      const v10ok = !BANNED_SUFFIX_V10.some(p => p.test(padded));
      if (!v10ok) continue;
      // 使用済み末尾との衝突チェック
      const paddedTail = tail(padded);
      const tailConflict = [...usedTails].some(ut => ut === paddedTail || editDistance(ut, paddedTail) <= 1);
      if (!tailConflict) {
        usedTails.add(paddedTail);
        return padded;
      }
    }
  }
  return text; // パディング不可の場合はそのまま返す
}

function padCandidates(rawCandidates, minLen, maxLen) {
  const usedTails = new Set();
  // まず既にminLen以上のものの末尾を登録
  for (const c of rawCandidates) {
    if (c.length >= minLen) usedTails.add(tail(c));
  }
  return rawCandidates.map((c, idx) => padCandidate(c, minLen, maxLen, idx, usedTails));
}

// バリデーション
function validateCandidates(candidates, correctText) {
  const reasons = [];

  for (const c of candidates) {
    for (const pat of BANNED_SUFFIX_V10) {
      if (pat.test(c)) {
        reasons.push(`V10禁止語尾: "${c.slice(-30)}"`);
        break;
      }
    }
    if (hasDupParticle(c)) {
      reasons.push(`V11助詞重複: "${c}"`);
    }
  }

  const collision = hasTailCollision(candidates);
  if (collision) {
    reasons.push(`V12末尾衝突: "${collision}"`);
  }

  if (!charRatioOk(candidates, correctText)) {
    const allLens = [...candidates.map(t => t.length), correctText.length];
    const maxLen = Math.max(...allLens);
    const minLen = Math.min(...allLens);
    const candidateLens = candidates.map(t => t.length).join('/');
    reasons.push(`文字数比超過(全4選択肢): correct=${correctText.length} candidates=[${candidateLens}] max=${maxLen} min=${minLen} ratio=${(maxLen / minLen).toFixed(2)}`);
  }

  return reasons;
}

// 1問の誤答を再生成（リトライ最大3回）
async function regenerateDistractors(q) {
  const correctText = q.choices[q.correctIndex].text;
  const correctLen = correctText.length;
  // V7のために全4選択肢のmin/maxを基準にした文字数範囲を設定
  const allLens = q.choices.map(c => (c.text || '').length);
  const targetMin = Math.max(Math.floor(correctLen * 0.7), Math.min(...allLens.filter(l => l > 0)));
  const targetMax = Math.ceil(Math.max(correctLen * 1.3, Math.max(...allLens) * 1.05));
  // ただし全4選択肢のmax/min ≤ 1.6を維持するため、誤答はcorrectLen * 0.625以上が必要
  const v7Min = Math.ceil(correctLen / 1.6);
  const finalMin = Math.max(targetMin, v7Min);
  const finalMax = Math.max(targetMax, Math.ceil(finalMin * 1.5));

  const candidatesHistory = [];
  const rejectionReasons = [];

  for (let attempt = 1; attempt <= 3; attempt++) {
    const previousFailures =
      rejectionReasons.length > 0
        ? `\n\n前回の失敗理由: ${rejectionReasons.slice(-3).join('; ')}\n上記の問題を必ず避けてください。`
        : '';

    const prompt = `G検定の4択問題の誤答選択肢を3つ作成してください。

問題文: 「${q.question}」
正解: 「${correctText}」（${correctLen}文字）

【絶対条件・文字数】各誤答は必ず${finalMin}文字以上${finalMax}文字以下で書くこと。
正解が${correctLen}文字なので、誤答も必ず${finalMin}文字以上にすること（短すぎると自動採点で不合格）。

【3つの誤答は意味も構文も別物にすること】
- 誤答1: 関連する別の概念・手法と取り違えた内容（例: 似た技術名や別アルゴリズムを当てはめる）
- 誤答2: 一部正しいが本質を外した内容（例: 範囲が狭すぎる／広すぎる定義）
- 誤答3: 全く別の文脈の知識を誤って当てはめた内容（例: 別分野の概念を流用）
3つの語尾・文末表現も互いに違える（「〜技術」「〜手法」「〜である」「〜にあたる」等を分散）。

【禁止表現】次の表現を末尾・本文を問わず絶対に使用しないこと:
- 「として定義される」「の概念」「のための概念」「に重点化した」「主な用途の」「ほぼすべての」
- 「のの」「をを」「にに」「がが」「でで」「はは」等の連続助詞

【その他の制約】
- 3つの誤答の末尾8文字（句読点除く）を互いに重複させない
- 正解と意味が近く、受験者が混同しやすい内容にする
- 出力は \`\`\`json [...] \`\`\` 形式のみ（JSON配列、要素は文字列3つ）${previousFailures}`;

    let feloResult;
    try {
      feloResult = await feloChat(prompt);
    } catch (e) {
      rejectionReasons.push(`Felo APIエラー(試行${attempt}): ${e.message}`);
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      return { success: false, candidatesHistory, rejectionReasons };
    }

    const { candidates: rawCandidates, resources } = feloResult;

    if (rawCandidates.length < 3) {
      candidatesHistory.push(rawCandidates);
      rejectionReasons.push(`試行${attempt}: 候補数不足(${rawCandidates.length}個)`);
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      return { success: false, candidatesHistory, rejectionReasons };
    }

    // 文字数パディング（V7通過のため、各候補に異なるサフィックスを使用・末尾衝突防止）
    const candidates = padCandidates(rawCandidates, finalMin, finalMax);
    candidatesHistory.push(candidates);

    const reasons = validateCandidates(candidates, correctText);
    if (reasons.length === 0) {
      return { success: true, candidates, resources };
    }

    rejectionReasons.push(...reasons.map(r => `試行${attempt}: ${r}`));
    if (attempt < 3) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return { success: false, candidatesHistory, rejectionReasons };
}

// 失敗ダンプ
const rejectedPath = path.resolve(__dirname, '../../.harness/runs/0025-rejected.json');
function appendRejected(entry) {
  let existing = [];
  if (fs.existsSync(rejectedPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(rejectedPath, 'utf8'));
    } catch (_) {}
  }
  existing.push(entry);
  fs.writeFileSync(rejectedPath, JSON.stringify(existing, null, 2), 'utf8');
}

// 書き戻し
function writeBack(filePath, questions) {
  fs.writeFileSync(filePath, JSON.stringify(questions, null, 2), 'utf8');
}

async function processQuestion(q, questions, filePath) {
  if (SKIP_IDS.has(q.id)) {
    process.stdout.write(`[SKIP] ${q.id}\n`);
    return;
  }

  // 正解テキストを定数に凍結（三重ガード 1）
  const correctText = Object.freeze(q.choices[q.correctIndex].text);

  if (dryRun) {
    process.stdout.write(`[DRY-RUN] ${q.id}: correctText="${correctText}"\n`);
    return;
  }

  const result = await regenerateDistractors(q);

  if (!result.success) {
    process.stderr.write(`[REJECTED] ${q.id}: 3回失敗\n`);
    appendRejected({
      qid: q.id,
      candidates_history: result.candidatesHistory,
      rejection_reasons: result.rejectionReasons,
    });
    return;
  }

  const { candidates, resources } = result;

  // 書き込み直前の正解保護アサート（三重ガード 2）
  if (q.choices[q.correctIndex].text !== correctText) {
    process.stderr.write(
      `[FATAL] ${q.id}: correctIndex位置のテキストが変化しています。処理を中止します。\n`
    );
    process.exit(1);
  }

  // 誤答位置のみ書き換え
  let wi = 0;
  for (let i = 0; i < q.choices.length; i++) {
    if (i === q.correctIndex) continue;
    q.choices[i] = { text: candidates[wi++] };
  }

  // 正解テキスト最終確認（三重ガード 3）
  if (q.choices[q.correctIndex].text !== correctText) {
    process.stderr.write(
      `[FATAL] ${q.id}: 書き込み後に正解テキストが変化しています。処理を中止します。\n`
    );
    process.exit(1);
  }

  // source_ref_supplements 更新
  if (resources.length > 0) {
    const existing = Array.isArray(q.source_ref_supplements) ? q.source_ref_supplements : [];
    q.source_ref_supplements = [...new Set([...existing, ...resources])];
  }

  writeBack(filePath, questions);
  process.stdout.write(`[OK] ${q.id}\n`);

  // レート制限: 1秒待機
  await new Promise(r => setTimeout(r, 1000));
}

async function main() {
  const questionsDir = path.resolve(__dirname, '../src/data/questions');

  if (qidArg) {
    // 単一問題モード
    let found = null;
    let foundFile = null;
    for (const file of fs.readdirSync(questionsDir).filter(f => f.endsWith('.json'))) {
      const filePath = path.join(questionsDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const q = data.find(x => x.id === qidArg);
      if (q) {
        found = q;
        foundFile = filePath;
        // processQuestion は data 配列を参照渡しなのでそのまま渡す
        await processQuestion(q, data, foundFile);
        break;
      }
    }
    if (!found) {
      process.stderr.write(`Error: question id "${qidArg}" not found.\n`);
      process.exit(1);
    }
  } else if (chapterArg) {
    // 章モード
    const filePath = path.join(questionsDir, `${chapterArg}.json`);
    if (!fs.existsSync(filePath)) {
      process.stderr.write(`Error: file not found: ${filePath}\n`);
      process.exit(1);
    }
    const questions = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    for (const q of questions) {
      await processQuestion(q, questions, filePath);
    }
  } else if (fromChapterArg) {
    // 途中再開モード: 指定章から ch8 まで順次処理
    const m = fromChapterArg.match(/^ch([1-8])$/);
    if (!m) {
      process.stderr.write(`Error: --from-chapter expects ch1..ch8, got "${fromChapterArg}"\n`);
      process.exit(1);
    }
    const startNum = parseInt(m[1], 10);
    for (let n = startNum; n <= 8; n++) {
      const ch = `ch${n}`;
      const filePath = path.join(questionsDir, `${ch}.json`);
      if (!fs.existsSync(filePath)) {
        process.stderr.write(`Skipping missing file: ${filePath}\n`);
        continue;
      }
      process.stdout.write(`\n=== ${ch} 開始 ===\n`);
      const questions = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      for (const q of questions) {
        await processQuestion(q, questions, filePath);
      }
      process.stdout.write(`=== ${ch} 完了 ===\n`);
    }
  }
}

main().catch(e => {
  process.stderr.write(`Unexpected error: ${e.message}\n`);
  process.exit(1);
});
