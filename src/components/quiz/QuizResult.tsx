import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import type { QuizResult as QuizResultType } from '../../hooks/useQuiz';
import type { Question } from '../../types/question';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { summarizeByCategory } from '../../lib/quiz-engine';
import { ALL_TERMS } from '../../data/glossary/index';

interface QuizResultProps {
  result: QuizResultType;
  elapsedSeconds?: number;
  questions?: Question[];
  answers?: number[];
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}分${String(s).padStart(2, '0')}秒`;
}

function getScoreMessage(accuracy: number): { message: string; color: string } {
  if (accuracy >= 0.9) return { message: '素晴らしい！', color: 'text-success' };
  if (accuracy >= 0.7) return { message: 'よくできました！', color: 'text-success' };
  if (accuracy >= 0.5) return { message: 'もう少し！', color: 'text-yellow-500' };
  return { message: '復習しましょう', color: 'text-error' };
}

export default function QuizResult({ result, elapsedSeconds, questions, answers }: QuizResultProps) {
  const navigate = useNavigate();
  const { totalQuestions, correctCount, accuracy } = result;
  const accuracyPercent = Math.round(accuracy * 100);
  const { message, color } = getScoreMessage(accuracy);

  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference * (1 - accuracy);

  return (
    <Card className="text-center animate-fade-in">
      <CardHeader>
        <CardTitle>結果</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="relative w-36 h-36 mx-auto">
          <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60" cy="60" r="54"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="8"
            />
            <circle
              cx="60" cy="60" r="54"
              fill="none"
              stroke="hsl(var(--success))"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold">{accuracyPercent}%</span>
          </div>
        </div>

        <p className={cn('text-lg font-semibold', color)}>{message}</p>

        <div className="text-sm text-muted-foreground">
          {correctCount} / {totalQuestions} 問正解
        </div>

        {elapsedSeconds !== undefined && (
          <div className="text-sm text-muted-foreground">
            所要時間: {formatElapsed(elapsedSeconds)}
          </div>
        )}

        {questions && answers && (() => {
          const summaries = summarizeByCategory(questions, answers);
          if (summaries.length === 0) return null;
          return (
            <div className="text-left space-y-2 pt-2 border-t">
              <p className="text-sm font-semibold">ジャンル別結果</p>
              {summaries.map((s) => (
                <div key={s.categoryId} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{s.name}</span>
                  <span>{s.correct}/{s.total}（{Math.round(s.accuracy * 100)}%）</span>
                </div>
              ))}
            </div>
          );
        })()}

        {questions && answers && (() => {
          const incorrectTermIds = Array.from(new Set(
            questions.flatMap((q, idx) =>
              answers[idx] !== q.correctIndex ? (q.relatedTermIds ?? []) : []
            )
          )).slice(0, 12);
          const terms = incorrectTermIds.flatMap((id) => {
            const found = ALL_TERMS.find((t) => t.id === id);
            return found ? [found] : [];
          });
          return (
            <div className="text-left space-y-2 pt-2 border-t">
              <p className="text-sm font-semibold">読んでおきたい用語</p>
              {terms.length === 0 ? (
                <p className="text-sm text-muted-foreground">なし（全問正解）</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {terms.map((t) => (
                    <Link
                      key={t.id}
                      to={`/glossary?term=${t.id}`}
                      className="text-xs text-primary underline underline-offset-2 hover:text-primary/80"
                    >
                      {t.term}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {questions && answers && (() => {
          const summaries = summarizeByCategory(questions, answers)
            .filter((s) => s.accuracy < 1.0)
            .sort((a, b) => a.accuracy - b.accuracy)
            .slice(0, 3);
          if (summaries.length === 0) return null;
          return (
            <div className="text-left space-y-2 pt-2 border-t">
              <p className="text-sm font-semibold">復習推奨</p>
              <div className="flex flex-wrap gap-2">
                {summaries.map((s) => (
                  <Link
                    key={s.categoryId}
                    to={`/learn/${s.categoryId}`}
                    className="text-xs text-primary underline underline-offset-2 hover:text-primary/80"
                  >
                    {s.name}（{Math.round(s.accuracy * 100)}%）
                  </Link>
                ))}
              </div>
            </div>
          );
        })()}

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate('/')}
          >
            ホームへ
          </Button>
          <Button
            className="flex-1"
            onClick={() => navigate('/quiz/setup')}
          >
            もう一度
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
