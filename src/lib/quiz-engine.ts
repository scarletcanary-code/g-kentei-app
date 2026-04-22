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
