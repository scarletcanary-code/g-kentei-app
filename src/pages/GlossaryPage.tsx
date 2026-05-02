import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import GlossarySearch from '../components/glossary/GlossarySearch';
import GlossaryList from '../components/glossary/GlossaryList';
import TierSegmented from '../components/shared/TierSegmented';
import { useGlossary } from '../hooks/useGlossary';
import { useMemorizedTerms } from '../hooks/useMemorizedTerms';
import { ALL_TERMS } from '../data/glossary/index';
import type { CategoryId } from '../types/category';

type CategoryFilter = CategoryId | 'all';
type Tier = 'beginner' | 'intermediate' | 'advanced';

export default function GlossaryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const termParam = searchParams.get('term') ?? '';
  const rawTierParam = searchParams.get('tier');
  const tierParam: Tier | undefined =
    rawTierParam === 'beginner' || rawTierParam === 'intermediate' || rawTierParam === 'advanced'
      ? rawTierParam
      : undefined;

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [memorizedFilter, setMemorizedFilter] = useState<'all' | 'memorized' | 'unmemorized'>('all');
  const [pageTier, setPageTier] = useState<Tier>('advanced');

  const [tierMap, setTierMap] = useState<Record<string, Tier>>(() => {
    if (typeof window === 'undefined') return {};
    const map: Record<string, Tier> = {};
    for (const t of ALL_TERMS) {
      const stored = localStorage.getItem(`glossary-term-tier-v1-${t.id}`);
      if (stored === 'beginner' || stored === 'intermediate' || stored === 'advanced') {
        map[t.id] = stored;
      }
    }
    if (termParam && tierParam) {
      map[termParam] = tierParam;
      localStorage.setItem(`glossary-term-tier-v1-${termParam}`, tierParam);
    }
    return map;
  });

  const { isMemorized, toggle: toggleMemorized } = useMemorizedTerms();

  const highlightTermId = termParam || undefined;

  const { filteredTerms, totalCount } = useGlossary({
    searchQuery,
    categoryFilter,
    sortKey: 'term',
  });

  const displayTerms = useMemo(() => {
    if (!highlightTermId) return filteredTerms;
    const alreadyIncluded = filteredTerms.some((t) => t.id === highlightTermId);
    if (alreadyIncluded) return filteredTerms;
    const extraTerm = ALL_TERMS.find((t) => t.id === highlightTermId);
    if (!extraTerm) return filteredTerms;
    return [...filteredTerms, extraTerm];
  }, [filteredTerms, highlightTermId]);

  const memorizedCountInDisplay = useMemo(
    () => displayTerms.filter((t) => isMemorized(t.id)).length,
    [displayTerms, isMemorized]
  );
  const unmemorizedCountInDisplay = displayTerms.length - memorizedCountInDisplay;

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    if (value !== '') {
      const next = new URLSearchParams(searchParams);
      next.delete('term');
      setSearchParams(next);
    }
  }

  function handleCardTierChange(termId: string, t: Tier) {
    setTierMap((prev) => ({ ...prev, [termId]: t }));
    if (typeof window !== 'undefined') {
      localStorage.setItem(`glossary-term-tier-v1-${termId}`, t);
    }
  }

  function handleBulkTierChange(t: Tier) {
    setPageTier(t);
    const visibleTerms = displayTerms.filter((term) => {
      if (memorizedFilter === 'memorized') return isMemorized(term.id);
      if (memorizedFilter === 'unmemorized') return !isMemorized(term.id);
      return true;
    });
    setTierMap((prev) => {
      const next = { ...prev };
      for (const term of visibleTerms) {
        next[term.id] = t;
      }
      return next;
    });
    if (typeof window !== 'undefined') {
      for (const term of visibleTerms) {
        localStorage.setItem(`glossary-term-tier-v1-${term.id}`, t);
      }
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold">用語集</h1>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">解説モード（表示中の用語を一括変更）</span>
        <TierSegmented
          value={pageTier}
          onChange={handleBulkTierChange}
          ariaLabel="表示中の用語の解説モードを一括変更"
        />
      </div>

      <div className="flex items-center gap-2">
        <GlossarySearch value={searchQuery} onChange={handleSearchChange} />
      </div>

      <Tabs
        value={categoryFilter}
        onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}
      >
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="all">すべて</TabsTrigger>
          <TabsTrigger value="ch1">Ch1</TabsTrigger>
          <TabsTrigger value="ch2">Ch2</TabsTrigger>
          <TabsTrigger value="ch3">Ch3</TabsTrigger>
          <TabsTrigger value="ch4">Ch4</TabsTrigger>
          <TabsTrigger value="ch5">Ch5</TabsTrigger>
          <TabsTrigger value="ch6">Ch6</TabsTrigger>
          <TabsTrigger value="ch7">Ch7</TabsTrigger>
          <TabsTrigger value="ch8">Ch8</TabsTrigger>
        </TabsList>
      </Tabs>

      <p className="text-sm text-muted-foreground">{totalCount}件</p>

      <div className="flex gap-2 items-center flex-wrap">
        <span className="text-sm text-muted-foreground">記憶:</span>
        <button
          onClick={() => setMemorizedFilter('all')}
          className={`text-sm px-3 py-1 rounded-full border transition-colors ${memorizedFilter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-accent'}`}
        >
          すべて ({displayTerms.length})
        </button>
        <button
          onClick={() => setMemorizedFilter('memorized')}
          className={`text-sm px-3 py-1 rounded-full border transition-colors ${memorizedFilter === 'memorized' ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-accent'}`}
        >
          記憶済 ({memorizedCountInDisplay})
        </button>
        <button
          onClick={() => setMemorizedFilter('unmemorized')}
          className={`text-sm px-3 py-1 rounded-full border transition-colors ${memorizedFilter === 'unmemorized' ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-accent'}`}
        >
          未記憶 ({unmemorizedCountInDisplay})
        </button>
      </div>

      <GlossaryList
        terms={displayTerms}
        highlightTermId={highlightTermId}
        tierMap={tierMap}
        onCardTierChange={handleCardTierChange}
        memorizedFilter={memorizedFilter}
        isMemorized={isMemorized}
        onToggleMemorized={toggleMemorized}
      />
    </div>
  );
}
