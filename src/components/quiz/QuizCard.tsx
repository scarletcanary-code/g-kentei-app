import type { Question } from '../../types/question';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Badge } from '../ui/badge';

interface QuizCardProps {
  question: Question;
  questionNumber: number;
}

const DIFFICULTY_LABEL: Record<number, string> = {
  1: '初級',
  2: '中級',
  3: '上級',
};

const DIFFICULTY_VARIANT: Record<number, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  1: 'secondary',
  2: 'default',
  3: 'destructive',
};

export default function QuizCard({ question, questionNumber }: QuizCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">問題 {questionNumber}</span>
          <Badge variant={DIFFICULTY_VARIANT[question.difficulty]}>
            {DIFFICULTY_LABEL[question.difficulty]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-base font-medium leading-relaxed break-words">{question.question}</p>
      </CardContent>
    </Card>
  );
}
