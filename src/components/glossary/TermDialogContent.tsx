import { Badge } from '../ui/badge';
import { useMemorizedTerms } from '../../hooks/useMemorizedTerms';
import { dedupeEnglishParens } from '../../lib/glossary-text';
import type { GlossaryTerm, Importance } from '../../types/glossary';

interface TermDialogContentProps {
  term: GlossaryTerm;
}

function importanceBadge(importance: Importance) {
  if (importance === 1) {
    return <Badge variant="default">必須</Badge>;
  }
  if (importance === 2) {
    return <Badge variant="secondary">重要</Badge>;
  }
  return <Badge variant="outline">発展</Badge>;
}

export default function TermDialogContent({ term }: TermDialogContentProps) {
  const { isMemorized, toggle } = useMemorizedTerms();
  const displayDetail = dedupeEnglishParens(term.detail, term.termEn);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {importanceBadge(term.importance)}
      </div>
      {term.aliases && term.aliases.length > 0 && (
        <p className="text-xs text-muted-foreground">
          別称: {term.aliases.join('、')}
        </p>
      )}
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            id={`memorized-dialog-${term.id}`}
            checked={isMemorized(term.id)}
            onChange={() => toggle(term.id)}
            aria-label={`${term.term}を記憶済としてマーク`}
            className="w-4 h-4 cursor-pointer accent-primary"
          />
          <span className="text-sm">記憶した</span>
        </label>
      </div>
      <p className="text-sm text-foreground leading-relaxed">{term.definition}</p>
      {displayDetail && (
        <p className="text-sm text-muted-foreground leading-relaxed">{displayDetail}</p>
      )}
    </div>
  );
}
