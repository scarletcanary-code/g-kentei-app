interface OverviewChartProps {
  overallAccuracy: number;
  totalAnswered: number;
  totalCorrect: number;
}

export default function OverviewChart({
  overallAccuracy,
  totalAnswered,
  totalCorrect,
}: OverviewChartProps) {
  const pct = Math.round(overallAccuracy * 100);
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference * (1 - overallAccuracy);

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-24 h-24 shrink-0">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          <circle
            cx="48" cy="48" r="40"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="6"
          />
          <circle
            cx="48" cy="48" r="40"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold">{pct}%</span>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">全体正答率</p>
        <p className="text-xs text-muted-foreground">総回答数: {totalAnswered}</p>
        <p className="text-xs text-muted-foreground">正解数: {totalCorrect}</p>
      </div>
    </div>
  );
}
