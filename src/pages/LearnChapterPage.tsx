import { useParams, Link, Navigate } from 'react-router-dom';
import { ALL_LEARN_CHAPTERS } from '../data/learn';
import { ALL_QUESTIONS } from '../data/questions';
import termsData from '../data/glossary/terms.json';
import type { GlossaryTerm } from '../types/glossary';
import { usePersistedState } from '../hooks/usePersistedState';
import { Button } from '../components/ui/button';

const terms: GlossaryTerm[] = termsData as GlossaryTerm[];

const difficultyLabel: Record<string, string> = {
  beginner: '入門',
  intermediate: '標準',
  advanced: '応用',
};

export default function LearnChapterPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [isEasy, setIsEasy] = usePersistedState<boolean>('learn-easy-mode', false);

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
        <div className="flex items-center gap-2 mt-2">
          <h1 className="text-2xl font-bold">
            第{chapterIndex + 1}章：{chapter.title}
          </h1>
          {chapter.difficulty && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
              chapter.difficulty === 'beginner'
                ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800'
                : chapter.difficulty === 'intermediate'
                ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-300 dark:border-yellow-800'
                : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800'
            }`}>
              {difficultyLabel[chapter.difficulty]}
            </span>
          )}
        </div>

        {/* prerequisites ブロック */}
        {chapter.prerequisites && chapter.prerequisites.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium">前提章：</span>
            <div className="flex flex-wrap gap-1">
              {chapter.prerequisites.map((prereqId) => {
                const prereqChapter = ALL_LEARN_CHAPTERS.find((c) => c.categoryId === prereqId);
                if (!prereqChapter) return null;
                return (
                  <Link
                    key={prereqId}
                    to={`/learn/${prereqId}`}
                    className="inline-flex items-center px-2 py-0.5 rounded border border-border bg-muted/50 text-xs hover:bg-accent transition-colors"
                  >
                    {prereqChapter.title}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 解説モードトグル */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm text-muted-foreground">解説モード：</span>
        <Button
          size="sm"
          variant={!isEasy ? 'default' : 'outline'}
          onClick={() => setIsEasy(false)}
          aria-label="詳しく"
        >
          詳しく
        </Button>
        <Button
          size="sm"
          variant={isEasy ? 'default' : 'outline'}
          onClick={() => setIsEasy(true)}
          aria-label="やさしく"
        >
          やさしく
        </Button>
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

      {/* 2. 詳細解説 */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">2</span>
          詳細解説
        </h2>
        <div className="space-y-6">
          {chapter.sections.map((section, idx) => (
            <div key={idx} className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-base font-semibold text-card-foreground mb-2">
                {section.heading}
              </h3>
              <p className="text-sm text-foreground leading-relaxed mb-3">
                {isEasy && section.beginnerBody ? section.beginnerBody : section.body}
              </p>
              {section.termIds && section.termIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {section.termIds.map((termId) => {
                    const term = terms.find((t) => t.id === termId);
                    return (
                      <Link
                        key={termId}
                        to={`/glossary?term=${termId}`}
                        className="inline-flex items-center px-2 py-0.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs hover:bg-primary/10 transition-colors"
                      >
                        {term ? term.term : termId}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 3. 重要用語 */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">3</span>
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

      {/* 4. 要点 */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">4</span>
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

      {/* 5. 例題 */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">5</span>
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

      {/* 関連章ブロック */}
      {chapter.relatedChapters && chapter.relatedChapters.length > 0 && (
        <section className="mb-6 rounded-lg border border-border bg-muted/30 p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">関連章</h2>
          <div className="flex flex-wrap gap-2">
            {chapter.relatedChapters.map((relId) => {
              const relChapter = ALL_LEARN_CHAPTERS.find((c) => c.categoryId === relId);
              if (!relChapter) return null;
              return (
                <Link
                  key={relId}
                  to={`/learn/${relId}`}
                  className="inline-flex items-center px-3 py-1.5 rounded-md border border-border bg-card text-sm hover:bg-accent transition-colors gap-1"
                >
                  {relChapter.title}
                  <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              );
            })}
          </div>
        </section>
      )}

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
