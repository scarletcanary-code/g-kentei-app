import { useParams, Link, Navigate } from 'react-router-dom';
import { ALL_LEARN_CHAPTERS } from '../data/learn';
import { ALL_QUESTIONS } from '../data/questions';
import termsData from '../data/glossary/terms.json';
import type { GlossaryTerm } from '../types/glossary';

const terms: GlossaryTerm[] = termsData as GlossaryTerm[];

export default function LearnChapterPage() {
  const { categoryId } = useParams<{ categoryId: string }>();

  const chapter = ALL_LEARN_CHAPTERS.find((c) => c.categoryId === categoryId);

  if (!chapter) {
    return <Navigate to="/learn" replace />;
  }

  const keyTerms = chapter.keyTermIds
    .map((id) => terms.find((t) => t.id === id))
    .filter((t): t is GlossaryTerm => t !== undefined);

  const exampleQuestions = chapter.exampleQuestionIds
    .map((id) => ALL_QUESTIONS.find((q) => q.id === id))
    .filter((q) => q !== undefined);

  const chapterIndex = ALL_LEARN_CHAPTERS.findIndex((c) => c.categoryId === categoryId);

  return (
    <div className="container py-6 max-w-2xl">
      {/* ヘッダー */}
      <div className="mb-6">
        <Link to="/learn" className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          学習一覧に戻る
        </Link>
        <h1 className="text-2xl font-bold mt-2">
          第{chapterIndex + 1}章：{chapter.title}
        </h1>
      </div>

      {/* 1. 概要 */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
          概要
        </h2>
        <p className="text-foreground leading-relaxed rounded-lg bg-muted/50 p-4 border border-border">
          {chapter.overview}
        </p>
      </section>

      {/* 2. 重要用語 */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">2</span>
          重要用語
        </h2>
        <div className="grid gap-3">
          {keyTerms.map((term) => (
            <Link
              key={term.id}
              to={`/glossary?term=${term.id}`}
              className="block rounded-lg border border-border bg-card p-3 hover:bg-accent transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-medium text-card-foreground">{term.term}</span>
                  {term.termEn && (
                    <span className="text-xs text-muted-foreground ml-2">{term.termEn}</span>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">{term.definition}</p>
                </div>
                <svg className="w-4 h-4 flex-shrink-0 text-muted-foreground mt-0.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. 要点 */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">3</span>
          要点
        </h2>
        <ul className="space-y-2">
          {chapter.keyPoints.map((point, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium mt-0.5">
                {i + 1}
              </span>
              <span className="text-foreground">{point}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 4. 例題 */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">4</span>
          例題
        </h2>
        <div className="space-y-6">
          {exampleQuestions.map((q, qi) => (
            <div key={q!.id} className="rounded-lg border border-border bg-card p-4">
              <p className="font-medium text-sm mb-3">
                <span className="text-muted-foreground mr-2">Q{qi + 1}.</span>
                {q!.question}
              </p>
              <ol className="space-y-1 mb-3">
                {q!.choices.map((choice, ci) => (
                  <li
                    key={ci}
                    className={`text-sm px-3 py-1.5 rounded-md border ${
                      ci === q!.correctIndex
                        ? 'border-green-500 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300'
                        : 'border-border text-muted-foreground'
                    }`}
                  >
                    <span className="mr-2">{['ア', 'イ', 'ウ', 'エ'][ci]}.</span>
                    {choice.text}
                    {ci === q!.correctIndex && (
                      <span className="ml-2 text-xs font-medium">（正解）</span>
                    )}
                  </li>
                ))}
              </ol>
              <div className="rounded-md bg-muted/50 border border-border p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">解説</p>
                <p className="text-sm text-foreground">{q!.explanation}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ナビゲーション */}
      <div className="flex justify-between pt-4 border-t border-border">
        {chapterIndex > 0 ? (
          <Link
            to={`/learn/${ALL_LEARN_CHAPTERS[chapterIndex - 1].categoryId}`}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            前の章
          </Link>
        ) : (
          <span />
        )}
        {chapterIndex < ALL_LEARN_CHAPTERS.length - 1 ? (
          <Link
            to={`/learn/${ALL_LEARN_CHAPTERS[chapterIndex + 1].categoryId}`}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            次の章
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
