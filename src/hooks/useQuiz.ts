import { useState, useCallback, useMemo } from 'react';
import type { Question } from '../types/question';

export interface QuizResult {
  totalQuestions: number;
  correctCount: number;
  accuracy: number;
}

export interface UseQuizReturn {
  currentIndex: number;
  currentQuestion: Question | null;
  answers: number[];
  isFinished: boolean;
  setIsFinished: (value: boolean) => void;
  answerQuestion: (choiceIndex: number) => void;
  nextQuestion: () => void;
  result: QuizResult;
}

export function useQuiz(questions: Question[]): UseQuizReturn {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  const currentQuestion = questions.length > 0 && currentIndex < questions.length
    ? questions[currentIndex]
    : null;

  const answerQuestion = useCallback((choiceIndex: number) => {
    setAnswers((prev) => {
      if (prev.length > currentIndex) return prev;
      return [...prev, choiceIndex];
    });
  }, [currentIndex]);

  const nextQuestion = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      setIsFinished(true);
    } else {
      setCurrentIndex(nextIndex);
    }
  }, [currentIndex, questions.length]);

  const result = useMemo<QuizResult>(() => {
    const totalQuestions = questions.length;
    const correctCount = answers.reduce((acc, answer, idx) => {
      return acc + (questions[idx]?.correctIndex === answer ? 1 : 0);
    }, 0);
    const accuracy = totalQuestions > 0 ? correctCount / totalQuestions : 0;
    return { totalQuestions, correctCount, accuracy };
  }, [answers, questions]);

  return {
    currentIndex,
    currentQuestion,
    answers,
    isFinished,
    setIsFinished,
    answerQuestion,
    nextQuestion,
    result,
  };
}
