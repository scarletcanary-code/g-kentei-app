import type { Question, Difficulty } from '../types/question';
import type { CategoryId } from '../types/category';
import type { QuestionSRState } from '../types/progress';
import { getDueQuestions } from './sr-engine';

export interface FilterOptions {
  categoryIds?: CategoryId[];
  difficulty?: Difficulty;
}

export function filterQuestions(
  questions: Question[],
  options: FilterOptions
): Question[] {
  let result = [...questions];

  if (options.categoryIds && options.categoryIds.length > 0) {
    result = result.filter((q) => options.categoryIds!.includes(q.categoryId));
  }

  if (options.difficulty !== undefined) {
    result = result.filter((q) => q.difficulty === options.difficulty);
  }

  return result;
}

export function shuffleQuestions(questions: Question[]): Question[] {
  const result = [...questions];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function selectForMemoryReview(
  allQuestions: Question[],
  srStates: Record<string, QuestionSRState>,
  today: Date
): Question[] {
  return getDueQuestions(allQuestions, srStates, today);
}

/**
 * 複数 ch 選択時に各 ch から均等に抽出する。
 * - 各 ch から Math.floor(limit/N) 問を無作為抽出（base）
 * - 端数 limit%N 問をランダム選択 ch から 1 問ずつ追加
 * - ch の問題数が base 未満なら不足分を他 ch に再配分
 * - 最終的に出題順をシャッフルして返す
 */
export function selectQuestionsBalanced(
  allQuestions: Question[],
  categoryIds: CategoryId[],
  limit: number,
): Question[] {
  // フォールバック: ch 未指定
  if (categoryIds.length === 0) {
    const shuffled = shuffleQuestions(allQuestions);
    return limit === 0 ? shuffled : shuffled.slice(0, limit);
  }

  // フォールバック: ch 1件
  if (categoryIds.length === 1) {
    const pool = allQuestions.filter((q) => q.categoryId === categoryIds[0]);
    const shuffled = shuffleQuestions(pool);
    return limit === 0 ? shuffled : shuffled.slice(0, limit);
  }

  // ch 別にグループ化
  const byCh: Record<string, Question[]> = {};
  for (const id of categoryIds) {
    byCh[id] = allQuestions.filter((q) => q.categoryId === id);
  }

  const totalAvailable = categoryIds.reduce((sum, id) => sum + byCh[id].length, 0);
  const effectiveLimit = limit === 0 ? totalAvailable : Math.min(limit, totalAvailable);

  const N = categoryIds.length;
  const base = Math.floor(effectiveLimit / N);
  const remainder = effectiveLimit - base * N;

  const picked: Question[] = [];
  let shortage = 0;
  const remainingPool: Question[] = [];

  for (const id of categoryIds) {
    const shuffled = shuffleQuestions(byCh[id]);
    const take = Math.min(base, shuffled.length);
    picked.push(...shuffled.slice(0, take));
    if (take < base) {
      shortage += base - take;
    }
    // base 以降の問題は再配分プールへ
    remainingPool.push(...shuffled.slice(take));
  }

  // 端数 + 不足分を remainingPool から補充
  const totalToFill = remainder + shortage;
  if (totalToFill > 0 && remainingPool.length > 0) {
    const poolShuffled = shuffleQuestions(remainingPool);
    picked.push(...poolShuffled.slice(0, Math.min(totalToFill, poolShuffled.length)));
  }

  return shuffleQuestions(picked);
}

export function shuffleChoices(question: Question): Question {
  const choices = [...question.choices];
  const correctText = choices[question.correctIndex].text;

  // Fisher-Yates shuffle
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }

  const newCorrectIndex = choices.findIndex((c) => c.text === correctText);

  return {
    ...question,
    choices,
    correctIndex: newCorrectIndex,
  };
}
