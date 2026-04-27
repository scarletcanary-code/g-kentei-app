import type { GlossaryTerm } from '../../types/glossary';
import GlossaryCard from './GlossaryCard';

type Tier = 'beginner' | 'intermediate' | 'advanced';

interface GlossaryListProps {
  terms: GlossaryTerm[];
  highlightTermId?: string;
  tier?: Tier;
}

export default function GlossaryList({ terms, highlightTermId, tier = 'advanced' }: GlossaryListProps) {
  if (terms.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        該当する用語が見つかりませんでした
      </p>
    );
  }

  return (
    <div>
      {terms.map((term) => (
        <GlossaryCard key={term.id} term={term} highlightTermId={highlightTermId} tier={tier} />
      ))}
    </div>
  );
}
