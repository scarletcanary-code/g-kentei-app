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

export interface UserProgress {
  overallAccuracy: number;
  totalAnswered: number;
  totalCorrect: number;
  categoryStats: Record<string, CategoryStats>;
  studyDates: string[];       // "YYYY-MM-DD" の配列
  weakQuestionIds: string[];  // attempts >= 2 かつ accuracy < 0.5
}
