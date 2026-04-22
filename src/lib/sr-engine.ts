import type { QuestionSRState } from '../types/progress';
import type { Question } from '../types/question';

/**
 * 簡易 SM-2 アルゴリズムに基づき次の SR 状態を計算する。
 *
 * 新規問題（state が null）:
 *   正解 → interval=1, streak=1, ease=2.5
 *   不正解 → interval=1, streak=0, ease=2.5
 *
 * 既存問題:
 *   正解かつ streak >= 1 → interval = min(prev × ease, 90), streak++
 *   正解かつ streak = 0  → interval=1, streak=1
 *   不正解               → interval=1, streak=0, ease=max(1.3, prev_ease - 0.2)
 */
export function computeNextSR(
  state: QuestionSRState | null,
  isCorrect: boolean,
  now: Date
): QuestionSRState {
  const questionId = state?.questionId ?? '';

  let interval: number;
  let ease: number;
  let streak: number;

  if (state === null) {
    // 新規問題
    interval = 1;
    ease = 2.5;
    streak = isCorrect ? 1 : 0;
  } else if (isCorrect) {
    if (state.streak >= 1) {
      interval = Math.min(Math.round(state.interval * state.ease), 90);
      ease = state.ease;
      streak = state.streak + 1;
    } else {
      interval = 1;
      ease = state.ease;
      streak = 1;
    }
  } else {
    interval = 1;
    ease = Math.max(1.3, state.ease - 0.2);
    streak = 0;
  }

  const nextReviewDate = addDays(now, interval);
  const lastReviewedAt = now.toISOString();

  return {
    questionId,
    interval,
    ease,
    streak,
    nextReviewDate,
    lastReviewedAt,
  };
}

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * today 以前の nextReviewDate を持つ問題を返す。
 * srState が未登録の問題も「初回未学習」として含める。
 */
export function getDueQuestions(
  allQuestions: Question[],
  srStates: Record<string, QuestionSRState>,
  today: Date
): Question[] {
  const todayStr = today.toISOString().split('T')[0];
  return allQuestions.filter((q) => {
    const state = srStates[q.id];
    if (!state) return true; // 未学習は常に due
    return state.nextReviewDate <= todayStr;
  });
}

/**
 * due: today 以前の nextReviewDate 件数（未登録含む）
 * upcoming: today+1〜today+7 の件数
 */
export function getReviewStats(
  srStates: Record<string, QuestionSRState>,
  today: Date
): { due: number; upcoming: number } {
  const todayStr = today.toISOString().split('T')[0];
  const upcomingEnd = addDays(today, 7);

  let due = 0;
  let upcoming = 0;

  for (const state of Object.values(srStates)) {
    if (state.nextReviewDate <= todayStr) {
      due += 1;
    } else if (state.nextReviewDate > todayStr && state.nextReviewDate <= upcomingEnd) {
      upcoming += 1;
    }
  }

  return { due, upcoming };
}
