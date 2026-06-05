import { Card, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';
import { ALL_TERMS } from '../../data/glossary/index';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '../ui/dialog';
import TermDialogContent from '../glossary/TermDialogContent';

interface ExplanationPanelProps {
  explanation: string;
  isCorrect: boolean;
  relatedTermIds?: string[];
  optionRationales?: string[];
  choices?: { text: string }[];
}

export default function ExplanationPanel({
  explanation,
  isCorrect,
  relatedTermIds,
  optionRationales,
  choices,
}: ExplanationPanelProps) {
  const hasRelatedTerms = relatedTermIds && relatedTermIds.length > 0;
  const hasRationales = optionRationales && optionRationales.length > 0;

  return (
    <Card className={cn(
      'border-2 animate-fade-in',
      isCorrect ? 'border-success bg-success-muted' : 'border-error bg-error-muted'
    )}>
      <CardContent className="pt-4">
        <p className={cn(
          'font-bold text-sm mb-2',
          isCorrect ? 'text-success-foreground' : 'text-error-foreground'
        )}>
          {isCorrect ? '正解！' : '不正解'}
        </p>
        <p className="text-sm text-foreground leading-relaxed">{explanation}</p>
        {hasRationales && (
          <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">各選択肢の解説：</p>
            {optionRationales.map((rationale, i) => (
              <p key={i} className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium">{choices?.[i] ? `${i + 1}. ${choices[i].text.slice(0, 20)}…` : `選択肢${i + 1}`}</span>　{rationale}
              </p>
            ))}
          </div>
        )}
        {hasRelatedTerms && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <span className="text-xs font-semibold text-muted-foreground mr-2">
              関連用語:
            </span>
            {relatedTermIds.map((termId) => {
              const found = ALL_TERMS.find((t) => t.id === termId);
              if (!found) return null;
              return (
                <Dialog key={termId}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="inline-block text-xs text-primary underline underline-offset-2 mr-2 hover:text-primary/80"
                    >
                      {found.term}
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md sm:max-w-lg w-[95vw] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{found.term}</DialogTitle>
                      <DialogDescription>{found.termEn || ' '}</DialogDescription>
                    </DialogHeader>
                    <TermDialogContent term={found} />
                  </DialogContent>
                </Dialog>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
