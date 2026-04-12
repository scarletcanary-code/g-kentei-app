import type { Question } from '../../types/question';

interface WeakPointListProps {
  weakQuestionIds: string[];
  allQuestions: Question[];
}

export default function WeakPointList({ weakQuestionIds, allQuestions }: WeakPointListProps) {
  if (weakQuestionIds.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">苦手問題はありません</p>
    );
  }

  const weakQuestions = weakQuestionIds
    .map((id) => allQuestions.find((q) => q.id === id))
    .filter((q): q is Question => q !== undefined);

  return (
    <ul className="space-y-2">
      {weakQuestions.map((q) => (
        <li key={q.id} className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">
          <span className="text-xs text-muted-foreground mr-2">{q.id}</span>
          <span>{q.question}</span>
        </li>
      ))}
    </ul>
  );
}
