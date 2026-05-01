import { cn } from '../../lib/utils';

type Tier = 'beginner' | 'intermediate' | 'advanced';

interface TierSegmentedProps {
  value: Tier;
  onChange: (t: Tier) => void;
  ariaLabel?: string;
}

const tiers: { value: Tier; label: string }[] = [
  { value: 'beginner', label: '初級' },
  { value: 'intermediate', label: '中級' },
  { value: 'advanced', label: '上級' },
];

export default function TierSegmented({ value, onChange, ariaLabel }: TierSegmentedProps) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex rounded-full border border-border bg-muted p-0.5 shrink-0"
    >
      {tiers.map((t) => (
        <button
          key={t.value}
          type="button"
          role="radio"
          aria-checked={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            'px-3 py-1 text-xs rounded-full transition-colors',
            value === t.value
              ? 'bg-background text-foreground shadow-sm font-medium'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
