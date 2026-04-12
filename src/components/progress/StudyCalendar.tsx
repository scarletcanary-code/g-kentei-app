interface StudyCalendarProps {
  studyDates: string[];
  dailyCounts?: Record<string, number>;
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

export default function StudyCalendar({ studyDates, dailyCounts }: StudyCalendarProps) {
  const studySet = new Set(studyDates);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: Date[] = [];
  for (let i = 91; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }

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
          const intensityClass = dailyCounts
            ? getIntensityClass(count)
            : studied ? 'bg-success' : 'bg-muted';

          return (
            <div
              key={dateStr}
              title={count > 0 ? `${dateStr}: ${count}問` : dateStr}
              className={`aspect-square rounded-sm transition-colors ${intensityClass}`}
            />
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
