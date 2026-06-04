import { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../ui/accordion';
import { Badge } from '../ui/badge';
import type { GlossaryTerm, Importance } from '../../types/glossary';
import { dedupeEnglishParens } from '../../lib/glossary-text';
import { ALL_TERMS } from '../../data/glossary/index';

interface GlossaryCardProps {
  term: GlossaryTerm;
  highlightTermId?: string;
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

export default function GlossaryCard({ term, highlightTermId, isMemorized, onToggleMemorized }: GlossaryCardProps) {
  const isHighlighted = highlightTermId === term.id;
  const ref = useRef<HTMLDivElement>(null);
  const [openValue, setOpenValue] = useState<string | undefined>(
    isHighlighted ? term.id : undefined
  );
  const [showRing, setShowRing] = useState(isHighlighted);

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

  const displayDetail = dedupeEnglishParens(term.detail, term.termEn);

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
            </div>
            {term.aliases && term.aliases.length > 0 && (
              <p className="text-xs text-muted-foreground">
                別称: {term.aliases.join('、')}
              </p>
            )}
            <p className="text-sm text-foreground leading-relaxed mb-2">
              {term.definition}
            </p>
            {displayDetail && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {displayDetail}
              </p>
            )}
            {term.relatedTermIds && term.relatedTermIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground self-center">関連用語：</span>
                {term.relatedTermIds.map((relId) => {
                  const rel = ALL_TERMS.find((t) => t.id === relId);
                  return (
                    <Link
                      key={relId}
                      to={`/glossary?term=${relId}`}
                      className="inline-flex items-center px-2 py-0.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs hover:bg-primary/10 transition-colors"
                    >
                      {rel ? rel.term : relId}
                    </Link>
                  );
                })}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
