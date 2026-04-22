export interface QuestionHistory {
  questionId: string;
  answeredAt: string; // ISO 8601
  isCorrect: boolean;
}

export interface CategoryStats {
  totalAnswered: number;
  correctCount: number;
  accuracy: number;
  questionHistory: QuestionHistory[];
}

export interface QuestionSRState {
  questionId: string;
  interval: number;        // 次の復習まで何日か（初期値 1）
  ease: number;            // 難易度係数（初期値 2.5）
  streak: number;          // 連続正解数
  nextReviewDate: string;  // "YYYY-MM-DD"
  lastReviewedAt: string;  // ISO 8601 datetime
}

export interface UserProgress {
  overallAccuracy: number;
  totalAnswered: number;
  totalCorrect: number;
  categoryStats: Record<string, CategoryStats>;
  studyDates: string[];       // "YYYY-MM-DD" の配列
  weakQuestionIds: string[];  // attempts >= 2 かつ accuracy < 0.5
  srStates: Record<string, QuestionSRState>;
}
