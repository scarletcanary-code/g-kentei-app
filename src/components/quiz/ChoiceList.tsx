import type { Choice } from '../../types/question';
import { cn } from '../../lib/utils';

interface ChoiceListProps {
  choices: Choice[];
  onSelect: (index: number) => void;
  selectedIndex?: number;
  correctIndex?: number;
}

export default function ChoiceList({
  choices,
  onSelect,
  selectedIndex,
  correctIndex,
}: ChoiceListProps) {
  const isAnswered = correctIndex !== undefined;

  const getChoiceClassName = (index: number): string => {
    const base =
      'w-full text-left px-4 py-3 rounded-md border text-sm transition-all duration-200';

    if (!isAnswered) {
      if (selectedIndex === index) {
        return cn(base, 'border-primary bg-primary/10 font-medium');
      }
      return cn(base, 'border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/40 cursor-pointer active:scale-[0.98]');
    }

    if (index === correctIndex) {
      return cn(base, 'border-success bg-success-muted text-success-foreground font-medium');
    }
    if (index === selectedIndex && index !== correctIndex) {
      return cn(base, 'border-error bg-error-muted text-error-foreground');
    }
    return cn(base, 'border-input bg-background opacity-50');
  };

  return (
    <div className="flex flex-col gap-2">
      {choices.map((choice, index) => (
        <button
          key={index}
          className={getChoiceClassName(index)}
          onClick={() => !isAnswered && onSelect(index)}
          disabled={isAnswered}
          type="button"
        >
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-current/20 text-xs font-semibold mr-3 shrink-0">
            {String.fromCharCode(65 + index)}
          </span>
          {choice.text}
        </button>
      ))}
    </div>
  );
}
