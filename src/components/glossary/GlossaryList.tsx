import type { GlossaryTerm } from '../../types/glossary';
import GlossaryCard from './GlossaryCard';

interface GlossaryListProps {
  terms: GlossaryTerm[];
  openTermId?: string;
}

export default function GlossaryList({ terms, openTermId }: GlossaryListProps) {
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
        <GlossaryCard key={term.id} term={term} openTermId={openTermId} />
      ))}
    </div>
  );
}
