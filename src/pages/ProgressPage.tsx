import { useMemo } from 'react';
import { useProgress } from '../hooks/useProgress';
import { CATEGORIES } from '../data/categories';
import { ALL_QUESTIONS } from '../data/questions/index';
import CategoryProgress from '../components/progress/CategoryProgress';
import WeakPointList from '../components/progress/WeakPointList';
import StudyCalendar from '../components/progress/StudyCalendar';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export default function ProgressPage() {
  const { progress, weakQuestionIds } = useProgress();
  const { studyDates } = progress;

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
