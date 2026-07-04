import { ExternalLink } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
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
import type { Question } from '../../types/question';
import { buildChatGptUrl } from '../../lib/chatgpt-link';

interface ExplanationPanelProps {
  explanation: string;
  isCorrect: boolean;
  relatedTermIds?: string[];
  question: Question;
}

export default function ExplanationPanel({
  explanation,
  isCorrect,
  relatedTermIds,
  question,
}: ExplanationPanelProps) {
  const hasRelatedTerms = relatedTermIds && relatedTermIds.length > 0;

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
        <Button asChild variant="outline" className="mt-3">
          <a href={buildChatGptUrl(question)} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-1" />
            ChatGPT で質問する
          </a>
        </Button>
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
