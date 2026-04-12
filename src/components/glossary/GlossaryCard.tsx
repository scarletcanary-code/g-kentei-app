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
  openTermId?: string;
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

export default function GlossaryCard({ term, openTermId }: GlossaryCardProps) {
  const defaultValue = openTermId === term.id ? term.id : undefined;

  return (
    <Accordion type="single" collapsible defaultValue={defaultValue}>
      <AccordionItem value={term.id} className="border rounded-md px-4 mb-2">
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
          {term.detail && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {term.detail}
            </p>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
