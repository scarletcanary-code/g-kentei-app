import { useRef, useEffect, useState } from 'react';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../ui/accordion';
import { Badge } from '../ui/badge';
import type { GlossaryTerm, Importance } from '../../types/glossary';

interface GlossaryCardProps {
  term: GlossaryTerm;
  highlightTermId?: string;
  isEasy?: boolean;
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

export default function GlossaryCard({ term, highlightTermId, isEasy = false }: GlossaryCardProps) {
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
            <p className="text-sm text-foreground leading-relaxed mb-2">
              {term.definition}
            </p>
            {(isEasy && term.beginnerDetail ? term.beginnerDetail : term.detail) && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isEasy && term.beginnerDetail ? term.beginnerDetail : term.detail}
              </p>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
