import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProgress } from '../hooks/useProgress';
import { CATEGORIES } from '../data/categories';
import { ALL_QUESTIONS } from '../data/questions/index';
import CategoryProgress from '../components/progress/CategoryProgress';
import WeakPointList from '../components/progress/WeakPointList';
import StudyCalendar from '../components/progress/StudyCalendar';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { getReviewStats } from '../lib/sr-engine';

export default function ProgressPage() {
  const navigate = useNavigate();
  const { progress, weakQuestionIds } = useProgress();
  const { studyDates } = progress;

  const dueCount = useMemo(
    () => getReviewStats(progress.srStates ?? {}, new Date()).due,
    [progress.srStates]
  );

  const dailyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const stats of Object.values(progress.categoryStats)) {
      for (const h of stats.questionHistory) {
        const dateStr = h.answeredAt.slice(0, 10);
        counts[dateStr] = (counts[dateStr] ?? 0) + 1;
      }
    }
    return counts;
  }, [progress.categoryStats]);

  return (
    <div className="max-w-xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-2xl font-bold">学習進捗</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">今日の復習</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            期限切れ: <span className="font-medium text-foreground">{dueCount} 問</span>
          </p>
          <Button
            onClick={() => navigate('/quiz/session?mode=memory')}
            disabled={dueCount === 0}
            className="w-full"
          >
            記憶モードで復習する
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">章別正答率</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryProgress
            categories={CATEGORIES}
            categoryStats={progress.categoryStats}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">苦手問題</CardTitle>
        </CardHeader>
        <CardContent>
          <WeakPointList
            weakQuestionIds={weakQuestionIds}
            allQuestions={ALL_QUESTIONS}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">学習カレンダー</CardTitle>
        </CardHeader>
        <CardContent>
          <StudyCalendar studyDates={studyDates} dailyCounts={dailyCounts} />
        </CardContent>
      </Card>
    </div>
  );
}
