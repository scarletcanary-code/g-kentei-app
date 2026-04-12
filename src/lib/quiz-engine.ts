import type { Question, Difficulty } from '../types/question';
import type { CategoryId } from '../types/category';

export interface FilterOptions {
  categoryIds?: CategoryId[];
  difficulty?: Difficulty;
  limit?: number;
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

  if (options.limit !== undefined && options.limit > 0) {
    result = result.slice(0, options.limit);
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
