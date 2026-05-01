import { useRef, useEffect, useState } from 'react';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../ui/accordion';
import { Badge } from '../ui/badge';
import type { GlossaryTerm, Importance } from '../../types/glossary';
import TierSegmented from '../shared/TierSegmented';

type Tier = 'beginner' | 'intermediate' | 'advanced';

interface GlossaryCardProps {
  term: GlossaryTerm;
  highlightTermId?: string;
  initialTierFromQuery?: Tier;
  isMemorized: boolean;
  onToggleMemorized: () => void;
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

export default function GlossaryCard({ term, highlightTermId, initialTierFromQuery, isMemorized, onToggleMemorized }: GlossaryCardProps) {
  const isHighlighted = highlightTermId === term.id;
  const ref = useRef<HTMLDivElement>(null);
  const [openValue, setOpenValue] = useState<string | undefined>(
    isHighlighted ? term.id : undefined
  );
  const [showRing, setShowRing] = useState(isHighlighted);

  const storageKey = `glossary-term-tier-v1-${term.id}`;
  const [cardTier, setCardTier] = useState<Tier>(() => {
    if (typeof window === 'undefined') return 'advanced';
    if (highlightTermId === term.id && initialTierFromQuery) {
      return initialTierFromQuery;
    }
    const stored = localStorage.getItem(storageKey);
    if (stored === 'beginner' || stored === 'intermediate' || stored === 'advanced') {
      return stored as Tier;
    }
    return 'advanced';
  });

  useEffect(() => {
    localStorage.setItem(storageKey, cardTier);
  }, [storageKey, cardTier]);

  useEffect(() => {
    if (highlightTermId === term.id) {
      setOpenValue(term.id);
      setShowRing(true);
      ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      const timer = setTimeout(() => {
        setShowRing(false);
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setOpenValue(undefined);
      setShowRing(false);
    }
  }, [highlightTermId, term.id]);

  return (
    <div ref={ref} className={showRing ? 'ring-2 ring-primary rounded-md mb-2' : 'mb-2'}>
      <Accordion
        type="single"
        collapsible
        value={openValue}
        onValueChange={(v) => setOpenValue(v || undefined)}
      >
        <AccordionItem value={term.id} className="border rounded-md px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2 text-left">
              <span className="font-semibold text-sm">{term.term}</span>
              {term.termEn && (
                <span className="text-xs text-muted-foreground">{term.termEn}</span>
              )}
              {importanceBadge(term.importance)}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex justify-between items-center mb-2">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id={`memorized-${term.id}`}
                  checked={isMemorized}
                  onChange={onToggleMemorized}
                  aria-label={`${term.term}を記憶済としてマーク`}
                  className="w-4 h-4 cursor-pointer accent-primary"
                />
                <span className="text-sm">記憶した</span>
              </label>
              <TierSegmented value={cardTier} onChange={setCardTier} ariaLabel="解説モード" />
            </div>
            <p className="text-sm text-foreground leading-relaxed mb-2">
              {term.definition}
            </p>
            {(() => {
              const displayDetail =
                cardTier === 'beginner'
                  ? (term.beginnerDetail ?? term.intermediateDetail ?? term.detail)
                  : cardTier === 'intermediate'
                  ? (term.intermediateDetail ?? term.detail)
                  : term.detail;
              return displayDetail ? (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {displayDetail}
                </p>
              ) : null;
            })()}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
