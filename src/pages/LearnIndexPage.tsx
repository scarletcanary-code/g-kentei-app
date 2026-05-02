import { Link } from 'react-router-dom';
import { ALL_LEARN_CHAPTERS } from '../data/learn';

export default function LearnIndexPage() {
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-2">学習モード</h1>
      <p className="text-muted-foreground mb-6">
        各章の概要・詳細解説・要点を順番に確認して体系的に学習できます。
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {ALL_LEARN_CHAPTERS.map((chapter, index) => (
          <Link
            key={chapter.categoryId}
            to={`/learn/${chapter.categoryId}`}
            className="block rounded-lg border border-border bg-card p-4 hover:bg-accent transition-colors"
          >
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                {index + 1}
              </span>
              <div>
                <h2 className="font-semibold text-card-foreground">{chapter.title}</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  セクション {chapter.sections.length}節 ／ 要点 {chapter.keyPoints.length}項目
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
