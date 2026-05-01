import type { GlossaryTerm } from '../../types/glossary';
import GlossaryCard from './GlossaryCard';

type Tier = 'beginner' | 'intermediate' | 'advanced';

interface GlossaryListProps {
  terms: GlossaryTerm[];
  highlightTermId?: string;
  initialTierFromQuery?: Tier;
  memorizedFilter: 'all' | 'memorized' | 'unmemorized';
  isMemorized: (termId: string) => boolean;
  onToggleMemorized: (termId: string) => void;
}

export default function GlossaryList({ terms, highlightTermId, initialTierFromQuery, memorizedFilter, isMemorized, onToggleMemorized }: GlossaryListProps) {
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
          initialTierFromQuery={initialTierFromQuery}
          isMemorized={isMemorized(term.id)}
          onToggleMemorized={() => onToggleMemorized(term.id)}
        />
      ))}
    </div>
  );
}
