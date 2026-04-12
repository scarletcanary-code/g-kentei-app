import { useNavigate } from 'react-router-dom';
import { useProgress } from '../hooks/useProgress';
import { CATEGORIES } from '../data/categories';
import OverviewChart from '../components/progress/OverviewChart';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

const EXAM_DATE = new Date('2026-11-01');

function calcCountdown(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(EXAM_DATE);
  exam.setHours(0, 0, 0, 0);
  return Math.floor((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function CountdownLabel({ days }: { days: number }) {
  if (days <= 0) {
    return <span className="text-lg font-bold">試験当日 / 試験終了</span>;
  }
  return (
    <span className="text-lg font-bold">
      あと <span className="text-primary text-2xl">{days}</span> 日
    </span>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { progress } = useProgress();
  const daysLeft = calcCountdown();

  return (
    <div className="max-w-xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-2xl font-bold">ダッシュボード</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">全体進捗</CardTitle>
        </CardHeader>
        <CardContent>
          <OverviewChart
            overallAccuracy={progress.overallAccuracy}
            totalAnswered={progress.totalAnswered}
            totalCorrect={progress.totalCorrect}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">章別ミニバー</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {CATEGORIES.map((cat) => {
              const stats = progress.categoryStats[cat.id];
              const pct = stats && stats.totalAnswered > 0
                ? Math.round(stats.accuracy * 100)
                : 0;
              return (
                <div key={cat.id} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-20 shrink-0 truncate">
                    {cat.shortName}
                  </span>
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 bg-primary rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">受験カウントダウン</CardTitle>
        </CardHeader>
        <CardContent>
          <CountdownLabel days={daysLeft} />
          <p className="text-xs text-muted-foreground mt-1">基準日: 2026-11-01</p>
        </CardContent>
      </Card>

      <Button className="w-full" onClick={() => navigate('/quiz/setup')}>
        クイズを始める
      </Button>
    </div>
  );
}
