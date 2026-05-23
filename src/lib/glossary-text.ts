// 用語集 detail 内に同じ英訳カッコが繰り返されているケースを表示時に削減する。
// 例: term.termEn = "Narrow AI" のとき、detail に「（Narrow AI）」が複数回登場すると
//     最初の 1 回だけ残し、それ以降は削除する。
// 全角カッコ「（…）」と半角カッコ "(…)" の両方を対象。
export function dedupeEnglishParens(text: string, termEn?: string): string {
  if (!termEn) return text;
  const patterns = [`（${termEn}）`, `(${termEn})`];
  let result = text;
  for (const target of patterns) {
    if (!result.includes(target)) continue;
    const parts = result.split(target);
    if (parts.length <= 2) continue;
    result = parts[0] + target + parts.slice(1).join('');
  }
  return result;
}
