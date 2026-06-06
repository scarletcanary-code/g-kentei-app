import { useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ALL_QUESTIONS } from '../data/questions/index';
import { shuffleQuestions, shuffleChoices, selectForMemoryReview, selectQuestionsBalanced } from '../lib/quiz-engine';
import { useQuiz } from '../hooks/useQuiz';
import { useProgress } from '../hooks/useProgress';
import type { CategoryId } from '../types/category';
import QuizCard from '../components/quiz/QuizCard';
import ChoiceList from '../components/quiz/ChoiceList';
import ExplanationPanel from '../components/quiz/ExplanationPanel';
import QuizProgress from '../components/quiz/QuizProgress';
import QuizResult from '../components/quiz/QuizResult';
import ExamTimer from '../components/quiz/ExamTimer';
import { Button } from '../components/ui/button';

const MOCK_EXAM_SECONDS = 7200;

export default function QuizPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const categoriesParam = searchParams.get('categories');
  const limitParam = searchParams.get('limit');
  const modeParam = searchParams.get('mode');
  const isMockMode = modeParam === 'mock';

  const categoryIds: CategoryId[] | undefined = categoriesParam
    ? (categoriesParam.split(',') as CategoryId[])
    : undefined;
  const limit = limitParam ? Number(limitParam) : 10;

  const { recordAnswer, weakQuestionIds, progress } = useProgress();

  const [startedAt] = useState(() => Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const questions = useMemo(() => {
    if (isMockMode) {
      const shuffled = shuffleQuestions(ALL_QUESTIONS);
      return shuffled.slice(0, Math.min(shuffled.length, 160));
    }
    if (modeParam === 'memory') {
      const due = selectForMemoryReview(ALL_QUESTIONS, progress.srStates ?? {}, new Date());
      return shuffleQuestions(due).map((q) => shuffleChoices(q));
    }
    if (modeParam === 'weak') {
      const weakQuestions = ALL_QUESTIONS.filter((q) => weakQuestionIds.includes(q.id));
      return shuffleQuestions(weakQuestions).map((q) => shuffleChoices(q));
    }
    const balanced = selectQuestionsBalanced(ALL_QUESTIONS, categoryIds ?? [], limit);
    return balanced.map((q) => shuffleChoices(q));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt]);

  const { currentIndex, currentQuestion, answers, isFinished, setIsFinished, answerQuestion, nextQuestion, result } =
    useQuiz(questions);

  const [selectedIndex, setSelectedIndex] = useState<number | undefined>(undefined);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleTimeUp = () => {
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    setElapsedSeconds(elapsed);
    setIsFinished(true);
  };

  if (questions.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-8 px-4 text-center space-y-4">
        <p className="text-muted-foreground">条件に合う問題が見つかりませんでした。</p>
        <Button onClick={() => navigate('/quiz/setup')}>設定に戻る</Button>
      </div>
    );
  }

  if (isFinished) {
    const elapsed = elapsedSeconds > 0
      ? elapsedSeconds
      : Math.floor((Date.now() - startedAt) / 1000);
    return (
      <div className="max-w-xl mx-auto py-8 px-4">
        <QuizResult result={result} elapsedSeconds={isMockMode ? elapsed : undefined} />
      </div>
    );
  }

  if (!currentQuestion) return null;

  const currentAnswer = answers[currentIndex];
  const isAnswered = currentAnswer !== undefined;
  const isCorrect = isAnswered && currentAnswer === currentQuestion.correctIndex;

  const handleSelect = (index: number) => {
    if (isAnswered) return;
    setSelectedIndex(index);
    answerQuestion(index);
    setShowExplanation(true);
    const correct = index === currentQuestion.correctIndex;
    recordAnswer(currentQuestion.id, currentQuestion.categoryId, correct);
  };

  const handleNext = () => {
    setSelectedIndex(undefined);
    setShowExplanation(false);
    if (currentIndex + 1 >= questions.length) {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setElapsedSeconds(elapsed);
    }
    nextQuestion();
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4 space-y-4">
      {isMockMode && (
        <ExamTimer totalSeconds={MOCK_EXAM_SECONDS} onTimeUp={handleTimeUp} />
      )}
      <QuizProgress current={currentIndex + 1} total={questions.length} />

      <QuizCard question={currentQuestion} questionNumber={currentIndex + 1} />

      <ChoiceList
        choices={currentQuestion.choices}
        onSelect={handleSelect}
        selectedIndex={selectedIndex}
        correctIndex={isAnswered ? currentQuestion.correctIndex : undefined}
      />

      {showExplanation && isAnswered && (
        <ExplanationPanel
          explanation={currentQuestion.explanation}
          isCorrect={isCorrect}
          relatedTermIds={isMockMode ? undefined : currentQuestion.relatedTermIds}
        />
      )}

      {isAnswered && (
        <Button className="w-full" onClick={handleNext}>
          {currentIndex + 1 < questions.length ? '次の問題へ' : '結果を見る'}
        </Button>
      )}
    </div>
  );
}
