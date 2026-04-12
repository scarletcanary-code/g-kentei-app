import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { usePersistedState } from '../hooks/usePersistedState';
import { useAuth } from './auth-context';
import { loadProgressFromCloud, saveProgressToCloud } from '../lib/firestore-sync';
import type { UserProgress, CategoryStats, QuestionHistory } from '../types/progress';

// ---- initial state ----
const PROGRESS_KEY = 'progress-v1';

function createInitialProgress(): UserProgress {
  return {
    overallAccuracy: 0,
    totalAnswered: 0,
    totalCorrect: 0,
    categoryStats: {},
    studyDates: [],
    weakQuestionIds: [],
  };
}

// ---- context types ----
interface ProgressContextValue {
  progress: UserProgress;
  recordAnswer: (questionId: string, categoryId: string, isCorrect: boolean) => void;
  resetProgress: () => void;
}

// ---- context ----
const ProgressContext = createContext<ProgressContextValue | null>(null);

// ---- provider ----
export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = usePersistedState<UserProgress>(
    PROGRESS_KEY,
    createInitialProgress()
  );

  const { user } = useAuth();
  const cloudLoadedRef = useRef(false);
  const prevUidRef = useRef<string | null>(null);

  // Load from Firestore on login
  useEffect(() => {
    if (!user) {
      cloudLoadedRef.current = false;
      prevUidRef.current = null;
      return;
    }

    if (prevUidRef.current === user.uid) return;
    prevUidRef.current = user.uid;

    loadProgressFromCloud(user.uid).then((cloud) => {
      if (cloud && cloud.totalAnswered > 0) {
        // Merge: use whichever has more answers
        setProgress((local) => {
          if (cloud.totalAnswered >= local.totalAnswered) {
            return cloud;
          }
          // Local has more data — upload local to cloud
          saveProgressToCloud(user.uid, local);
          return local;
        });
      } else {
        // No cloud data — upload local
        setProgress((local) => {
          if (local.totalAnswered > 0) {
            saveProgressToCloud(user.uid, local);
          }
          return local;
        });
      }
      cloudLoadedRef.current = true;
    });
  }, [user, setProgress]);

  // Save to Firestore on progress change (debounced)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (!user || !cloudLoadedRef.current) return;

    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveProgressToCloud(user.uid, progress);
    }, 2000);

    return () => clearTimeout(saveTimerRef.current);
  }, [progress, user]);

  const recordAnswer = useCallback(
    (questionId: string, categoryId: string, isCorrect: boolean) => {
      setProgress((prev) => {
        // --- category stats update ---
        const existingStats: CategoryStats = prev.categoryStats[categoryId] ?? {
          totalAnswered: 0,
          correctCount: 0,
          accuracy: 0,
          questionHistory: [],
        };

        const newHistory: QuestionHistory = {
          questionId,
          answeredAt: new Date().toISOString(),
          isCorrect,
        };

        const updatedHistory = [...existingStats.questionHistory, newHistory];
        const newTotalAnswered = existingStats.totalAnswered + 1;
        const newCorrectCount = existingStats.correctCount + (isCorrect ? 1 : 0);
        const newAccuracy = newCorrectCount / newTotalAnswered;

        const updatedCategoryStats: CategoryStats = {
          totalAnswered: newTotalAnswered,
          correctCount: newCorrectCount,
          accuracy: newAccuracy,
          questionHistory: updatedHistory,
        };

        const newCategoryStats = {
          ...prev.categoryStats,
          [categoryId]: updatedCategoryStats,
        };

        // --- overall stats ---
        let overallTotalAnswered = 0;
        let overallTotalCorrect = 0;
        for (const stats of Object.values(newCategoryStats)) {
          overallTotalAnswered += stats.totalAnswered;
          overallTotalCorrect += stats.correctCount;
        }
        const overallAccuracy =
          overallTotalAnswered > 0 ? overallTotalCorrect / overallTotalAnswered : 0;

        // --- weak question ids ---
        const questionAttemptsMap: Record<string, { attempts: number; correct: number }> = {};
        for (const stats of Object.values(newCategoryStats)) {
          for (const h of stats.questionHistory) {
            if (!questionAttemptsMap[h.questionId]) {
              questionAttemptsMap[h.questionId] = { attempts: 0, correct: 0 };
            }
            questionAttemptsMap[h.questionId].attempts += 1;
            if (h.isCorrect) {
              questionAttemptsMap[h.questionId].correct += 1;
            }
          }
        }

        const weakQuestionIds: string[] = Object.entries(questionAttemptsMap)
          .filter(([, v]) => v.attempts >= 2 && v.correct / v.attempts < 0.5)
          .map(([id]) => id);

        // --- study dates ---
        const todayStr = new Date().toISOString().slice(0, 10);
        const studyDates = prev.studyDates.includes(todayStr)
          ? prev.studyDates
          : [...prev.studyDates, todayStr];

        return {
          overallAccuracy,
          totalAnswered: overallTotalAnswered,
          totalCorrect: overallTotalCorrect,
          categoryStats: newCategoryStats,
          studyDates,
          weakQuestionIds,
        };
      });
    },
    [setProgress]
  );

  const resetProgress = useCallback(() => {
    setProgress(createInitialProgress());
  }, [setProgress]);

  return (
    <ProgressContext.Provider value={{ progress, recordAnswer, resetProgress }}>
      {children}
    </ProgressContext.Provider>
  );
}

// ---- internal hook ----
export function useProgressContext(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (ctx === null) {
    throw new Error('useProgressContext must be used within a ProgressProvider');
  }
  return ctx;
}
