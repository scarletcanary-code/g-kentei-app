import type { GlossaryTerm } from '../../types/glossary';
import GlossaryCard from './GlossaryCard';

interface GlossaryListProps {
  terms: GlossaryTerm[];
  highlightTermId?: string;
  memorizedFilter: 'all' | 'memorized' | 'unmemorized';
  isMemorized: (termId: string) => boolean;
  onToggleMemorized: (termId: string) => void;
}

export default function GlossaryList({ terms, highlightTermId, memorizedFilter, isMemorized, onToggleMemorized }: GlossaryListProps) {
  const displayTerms = terms.filter((term) => {
    if (memorizedFilter === 'memorized') return isMemorized(term.id);
    if (memorizedFilter === 'unmemorized') return !isMemorized(term.id);
    return true;
  });

  if (displayTerms.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        該当する用語が見つかりませんでした
      </p>
    );
  }

  return (
    <div>
      {displayTerms.map((term) => (
        <GlossaryCard
          key={term.id}
          term={term}
          highlightTermId={highlightTermId}
          isMemorized={isMemorized(term.id)}
          onToggleMemorized={() => onToggleMemorized(term.id)}
        />
      ))}
    </div>
  );
}
