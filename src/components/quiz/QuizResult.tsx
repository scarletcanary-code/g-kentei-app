import { useNavigate } from 'react-router-dom';
import type { QuizResult as QuizResultType } from '../../hooks/useQuiz';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface QuizResultProps {
  result: QuizResultType;
  elapsedSeconds?: number;
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

export default function QuizResult({ result, elapsedSeconds }: QuizResultProps) {
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
