import { useMemo } from 'react';
import type { QuestionSRState } from '../../types/progress';

interface StudyCalendarProps {
  studyDates: string[];
  dailyCounts?: Record<string, number>;
  srStates: Record<string, QuestionSRState>;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getIntensityClass(count: number): string {
  if (count === 0) return 'bg-muted';
  if (count <= 5) return 'bg-success/25';
  if (count <= 15) return 'bg-success/50';
  if (count <= 30) return 'bg-success/75';
  return 'bg-success';
}

export default function StudyCalendar({ studyDates, dailyCounts, srStates }: StudyCalendarProps) {
  const studySet = new Set(studyDates);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatDate(today);

  // Build array: past 91 days + today + future 30 days = 122 days
  const days: Date[] = [];
  for (let i = 91; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }
  for (let i = 1; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }

  // Aggregate review counts per date from srStates
  const reviewCountByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const state of Object.values(srStates)) {
      const d = state.nextReviewDate; // "YYYY-MM-DD"
      counts[d] = (counts[d] ?? 0) + 1;
    }
    return counts;
  }, [srStates]);

  const firstDayOfWeek = days[0].getDay();
  const paddingCells = firstDayOfWeek;

  return (
    <div>
      <div
        className="grid mb-1"
        style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '2px' }}
      >
        {['日', '月', '火', '水', '木', '金', '土'].map((label) => (
          <div key={label} className="text-center text-xs text-muted-foreground">
            {label}
          </div>
        ))}
      </div>

      <div
        className="grid"
        style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '2px' }}
      >
        {Array.from({ length: paddingCells }).map((_, i) => (
          <div key={`pad-${i}`} className="aspect-square rounded-sm" />
        ))}

        {days.map((day) => {
          const dateStr = formatDate(day);
          const studied = studySet.has(dateStr);
          const count = dailyCounts?.[dateStr] ?? 0;
          const isFuture = dateStr > todayStr;
          const reviewCount = reviewCountByDate[dateStr] ?? 0;

          let intensityClass: string;
          if (isFuture) {
            intensityClass = 'bg-muted/50';
          } else {
            intensityClass = dailyCounts
              ? getIntensityClass(count)
              : studied ? 'bg-success' : 'bg-muted';
          }

          let titleText = count > 0 ? `${dateStr}: ${count}問` : dateStr;
          if (reviewCount > 0) {
            titleText += `\n復習予定: ${reviewCount}問`;
          }

          const badgeClass =
            reviewCount > 0
              ? dateStr <= todayStr
                ? 'absolute top-0 right-0 text-[9px] bg-red-500 text-white rounded-full px-1 leading-4 pointer-events-none'
                : 'absolute top-0 right-0 text-[9px] bg-blue-500 text-white rounded-full px-1 leading-4 pointer-events-none'
              : null;

          return (
            <div
              key={dateStr}
              title={titleText}
              className={`relative aspect-square rounded-sm transition-colors ${intensityClass}`}
            >
              {badgeClass && (
                <span className={badgeClass}>{reviewCount}</span>
              )}
            </div>
          );
        })}
      </div>

      {dailyCounts && (
        <div className="flex items-center justify-end gap-1 mt-2 text-xs text-muted-foreground">
          <span>少</span>
          <div className="w-3 h-3 rounded-sm bg-muted" />
          <div className="w-3 h-3 rounded-sm bg-success/25" />
          <div className="w-3 h-3 rounded-sm bg-success/50" />
          <div className="w-3 h-3 rounded-sm bg-success/75" />
          <div className="w-3 h-3 rounded-sm bg-success" />
          <span>多</span>
        </div>
      )}
    </div>
  );
}
