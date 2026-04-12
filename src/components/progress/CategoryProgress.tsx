import type { Category } from '../../types/category';
import type { CategoryStats } from '../../types/progress';

interface CategoryProgressProps {
  categories: Category[];
  categoryStats: Record<string, CategoryStats>;
}

export default function CategoryProgress({ categories, categoryStats }: CategoryProgressProps) {
  return (
    <div className="space-y-3">
      {categories.map((cat) => {
        const stats = categoryStats[cat.id];
        const hasData = stats !== undefined && stats.totalAnswered > 0;
        const pct = hasData ? Math.round(stats.accuracy * 100) : 0;
        const barWidth = hasData ? `${pct}%` : '0%';

        return (
          <div key={cat.id} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="truncate max-w-[60%]">{cat.name}</span>
              <span className="text-muted-foreground text-xs">
                {hasData ? (
                  <>
                    {pct}% （{stats.totalAnswered}問）
                  </>
                ) : (
                  <span className="text-muted-foreground">未挑戦</span>
                )}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="h-2 bg-primary rounded-full transition-all"
                style={{ width: barWidth }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
