import { useProgressContext } from '../store/progress-context';
import type { UserProgress } from '../types/progress';

export interface UseProgressReturn {
  progress: UserProgress;
  recordAnswer: (questionId: string, categoryId: string, isCorrect: boolean) => void;
  weakQuestionIds: string[];
  resetProgress: () => void;
}

export function useProgress(): UseProgressReturn {
  const { progress, recordAnswer, resetProgress } = useProgressContext();
  return {
    progress,
    recordAnswer,
    weakQuestionIds: progress.weakQuestionIds,
    resetProgress,
  };
}
