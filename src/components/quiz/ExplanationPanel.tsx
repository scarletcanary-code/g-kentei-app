import { Link } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';
import { ALL_TERMS } from '../../data/glossary/index';

interface ExplanationPanelProps {
  explanation: string;
  isCorrect: boolean;
  relatedTermIds?: string[];
}

export default function ExplanationPanel({
  explanation,
  isCorrect,
  relatedTermIds,
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
        {hasRelatedTerms && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <span className="text-xs font-semibold text-muted-foreground mr-2">
              関連用語:
            </span>
            {relatedTermIds.map((termId) => {
              const found = ALL_TERMS.find((t) => t.id === termId);
              if (!found) return null;
              return (
                <Link
                  key={termId}
                  to={`/glossary?term=${termId}`}
                  className="inline-block text-xs text-primary underline underline-offset-2 mr-2 hover:text-primary/80"
                >
                  {found.term}
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
