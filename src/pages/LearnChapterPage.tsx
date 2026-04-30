import { useParams, Link, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ALL_LEARN_CHAPTERS } from '../data/learn';
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

type Tier = 'beginner' | 'intermediate' | 'advanced';

export default function LearnChapterPage() {
  const { categoryId } = useParams<{ categoryId: string }>();

  // localStorage マイグレーション: learn-easy-mode → learn-tier-v1
  // 新キーが未設定の場合のみ1回実行
  if (typeof window !== 'undefined' && localStorage.getItem('learn-tier-v1') === null) {
    const oldVal = localStorage.getItem('learn-easy-mode');
    const migrated = oldVal === 'true' ? 'beginner' : 'advanced';
    localStorage.setItem('learn-tier-v1', migrated);
    localStorage.removeItem('learn-easy-mode');
  }

  // usePersistedState は動的キー未対応のため参照維持のみ（マイグレーション基準として保持）
  const [, ] = usePersistedState<Tier>('learn-tier-v1', 'advanced');

  // 概要セクションの tier 管理（章ごとに独立した localStorage キー）
  const overviewTierStorageKey = `learn-overview-tier-v1-${categoryId}`;

  const [overviewTier, setOverviewTier] = useState<Tier>(() => {
    if (typeof window === 'undefined') return 'advanced';
    const stored = localStorage.getItem(overviewTierStorageKey);
    if (stored === 'beginner' || stored === 'intermediate' || stored === 'advanced') {
      return stored;
    }
    return 'advanced';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(overviewTierStorageKey, overviewTier);
  }, [overviewTierStorageKey, overviewTier]);

  // categoryId が変わったとき（章ナビゲーション）に新しい章の保存値を読み込む
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(overviewTierStorageKey);
    if (stored === 'beginner' || stored === 'intermediate' || stored === 'advanced') {
      setOverviewTier(stored);
    } else {
      setOverviewTier('advanced');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  // セクション単位の tier 管理（章ごとに localStorage キーが異なるため useState + useEffect で実装）
  const sectionTierStorageKey = `learn-section-tier-v1-${categoryId}`;

  const [sectionTiers, setSectionTiers] = useState<Record<number, Tier>>(() => {
    if (typeof window === 'undefined') return {};
    const stored = localStorage.getItem(sectionTierStorageKey);
    if (stored !== null) {
      try {
        return JSON.parse(stored) as Record<number, Tier>;
      } catch {
        return {};
      }
    }
    // マイグレーション: learn-section-tier-v1-${categoryId} が未設定の場合、
    // g-kentei-learn-tier-v1（usePersistedState が書き込むキー）か learn-tier-v1 を defaultTier として使用する
    const legacyRaw =
      localStorage.getItem('g-kentei-learn-tier-v1') ??
      localStorage.getItem('learn-tier-v1');
    const isValidTier = (v: string | null): v is Tier =>
      v === 'beginner' || v === 'intermediate' || v === 'advanced';
    const defaultTier: Tier = isValidTier(legacyRaw) ? legacyRaw : 'advanced';
    // セクション数が不明なためデフォルト値の Record は空のまま返し、
    // defaultTier を sectionTiers[idx] ?? defaultTier で参照する
    return { _default: defaultTier } as unknown as Record<number, Tier>;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(sectionTierStorageKey, JSON.stringify(sectionTiers));
  }, [sectionTierStorageKey, sectionTiers]);

  // categoryId が変わったとき（章ナビゲーション）に新しい章の保存値を読み込む
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(sectionTierStorageKey);
    if (stored !== null) {
      try {
        setSectionTiers(JSON.parse(stored) as Record<number, Tier>);
        return;
      } catch {
        // fall through to migration
      }
    }
    const legacyRaw =
      localStorage.getItem('g-kentei-learn-tier-v1') ??
      localStorage.getItem('learn-tier-v1');
    const isValidTier = (v: string | null): v is Tier =>
      v === 'beginner' || v === 'intermediate' || v === 'advanced';
    const defaultTier: Tier = isValidTier(legacyRaw) ? legacyRaw : 'advanced';
    setSectionTiers({ _default: defaultTier } as unknown as Record<number, Tier>);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  // sectionTiers に数値キーが存在しない場合の fallback tier
  const _defaultTierEntry = (sectionTiers as unknown as Record<string, Tier>)['_default'];
  const defaultTier: Tier =
    _defaultTierEntry === 'beginner' || _defaultTierEntry === 'intermediate' || _defaultTierEntry === 'advanced'
      ? _defaultTierEntry
      : 'advanced';

  const setSectionTier = (idx: number, tier: Tier) => {
    setSectionTiers((prev) => ({ ...prev, [idx]: tier }));
  };

  const chapter = ALL_LEARN_CHAPTERS.find((c) => c.categoryId === categoryId);

  if (!chapter) {
    return <Navigate to="/learn" replace />;
  }

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

      {/* 1. 概要 */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
            概要
          </h2>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={overviewTier === 'beginner' ? 'default' : 'outline'}
              onClick={() => setOverviewTier('beginner')}
              aria-label="初級"
            >
              初級
            </Button>
            <Button
              size="sm"
              variant={overviewTier === 'intermediate' ? 'default' : 'outline'}
              onClick={() => setOverviewTier('intermediate')}
              aria-label="中級"
            >
              中級
            </Button>
            <Button
              size="sm"
              variant={overviewTier === 'advanced' ? 'default' : 'outline'}
              onClick={() => setOverviewTier('advanced')}
              aria-label="上級"
            >
              上級
            </Button>
          </div>
        </div>
        <p className="text-foreground leading-relaxed rounded-lg bg-muted/50 p-4 border border-border">
          {overviewTier === 'beginner'
            ? (chapter.beginnerOverview ?? chapter.intermediateOverview ?? chapter.overview)
            : overviewTier === 'intermediate'
            ? (chapter.intermediateOverview ?? chapter.overview)
            : chapter.overview}
        </p>
      </section>

      {/* 2. 詳細解説 */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">2</span>
          詳細解説
        </h2>
        <div className="space-y-6">
          {chapter.sections.map((section, idx) => {
            const sectionTier: Tier = sectionTiers[idx] ?? defaultTier;
            const bodyText =
              sectionTier === 'beginner'
                ? (section.beginnerBody ?? section.intermediateBody ?? section.body)
                : sectionTier === 'intermediate'
                ? (section.intermediateBody ?? section.body)
                : section.body;
            return (
            <div key={idx} className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-base font-semibold text-card-foreground mb-2">
                {section.heading}
              </h3>
              <div className="flex items-center gap-1 mb-3">
                <Button
                  size="sm"
                  variant={sectionTier === 'beginner' ? 'default' : 'outline'}
                  onClick={() => setSectionTier(idx, 'beginner')}
                  aria-label="初級"
                >
                  初級
                </Button>
                <Button
                  size="sm"
                  variant={sectionTier === 'intermediate' ? 'default' : 'outline'}
                  onClick={() => setSectionTier(idx, 'intermediate')}
                  aria-label="中級"
                >
                  中級
                </Button>
                <Button
                  size="sm"
                  variant={sectionTier === 'advanced' ? 'default' : 'outline'}
                  onClick={() => setSectionTier(idx, 'advanced')}
                  aria-label="上級"
                >
                  上級
                </Button>
              </div>
              <p className="text-sm text-foreground leading-relaxed mb-3">
                {bodyText}
              </p>
              {section.termIds && section.termIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {section.termIds.map((termId) => {
                    const term = terms.find((t) => t.id === termId);
                    const previewText = term?.definition ? term.definition.slice(0, 40) : '';
                    return (
                      <Link
                        key={termId}
                        to={`/glossary?term=${termId}&tier=${sectionTier}`}
                        className="group inline-flex flex-col items-start px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors min-w-0 max-w-full"
                      >
                        <span className="text-sm font-medium inline-flex items-center gap-1">
                          <span>📖</span>
                          <span className="truncate">{term ? term.term : termId}</span>
                        </span>
                        {previewText && (
                          <span className="text-xs text-muted-foreground line-clamp-1 max-w-[16rem]">
                            {previewText}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
            );
          })}
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
