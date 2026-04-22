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
import { computeNextSR } from '../lib/sr-engine';

// ---- storage keys ----
// usePersistedState prepends 'g-kentei-', so:
//   PROGRESS_KEY = 'progress-v2'  →  localStorage key: 'g-kentei-progress-v2'
const PROGRESS_KEY = 'progress-v2';
const LEGACY_STORAGE_KEY = 'g-kentei-progress-v1';

function createInitialProgress(): UserProgress {
  return {
    overallAccuracy: 0,
    totalAnswered: 0,
    totalCorrect: 0,
    categoryStats: {},
    studyDates: [],
    weakQuestionIds: [],
    srStates: {},
  };
}

function loadInitialProgress(): UserProgress {
  // Check v2 first (with the prefix that usePersistedState applies)
  const v2 = localStorage.getItem('g-kentei-progress-v2');
  if (v2) {
    try {
      return JSON.parse(v2) as UserProgress;
    } catch {
      // fall through to v1 migration
    }
  }

  // Migrate from v1
  const v1 = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (v1) {
    try {
      const parsed = JSON.parse(v1) as Omit<UserProgress, 'srStates'>;
      const migrated: UserProgress = { ...parsed, srStates: {} };
      // Persist migrated data under the new key so usePersistedState picks it up
      localStorage.setItem('g-kentei-progress-v2', JSON.stringify(migrated));
      return migrated;
    } catch {
      // fall through to default
    }
  }

  return createInitialProgress();
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
    loadInitialProgress()
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

        // --- SR state update ---
        const now = new Date();
        const prevSRState = prev.srStates?.[questionId] ?? null;
        const nextSRState = computeNextSR(
          prevSRState ? { ...prevSRState, questionId } : null,
          isCorrect,
          now
        );
        const newSRStates = {
          ...(prev.srStates ?? {}),
          [questionId]: { ...nextSRState, questionId },
        };

        return {
          overallAccuracy,
          totalAnswered: overallTotalAnswered,
          totalCorrect: overallTotalCorrect,
          categoryStats: newCategoryStats,
          studyDates,
          weakQuestionIds,
          srStates: newSRStates,
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
