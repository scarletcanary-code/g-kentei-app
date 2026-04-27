import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import GlossarySearch from '../components/glossary/GlossarySearch';
import GlossaryList from '../components/glossary/GlossaryList';
import { useGlossary } from '../hooks/useGlossary';
import { ALL_TERMS } from '../data/glossary/index';
import { usePersistedState } from '../hooks/usePersistedState';
import type { CategoryId } from '../types/category';

type CategoryFilter = CategoryId | 'all';
type Tier = 'beginner' | 'intermediate' | 'advanced';

export default function GlossaryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const termParam = searchParams.get('term') ?? '';

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [tier, setTier] = usePersistedState<Tier>('glossary-tier-v1', 'advanced');

  // localStorage マイグレーション: 旧キー 'g-kentei-learn-easy-mode' → 新キー 'glossary-tier-v1'
  useEffect(() => {
    if (localStorage.getItem('glossary-tier-v1') === null) {
      const oldValue = localStorage.getItem('g-kentei-learn-easy-mode');
      const migratedTier: Tier = oldValue === 'true' ? 'beginner' : 'advanced';
      localStorage.setItem('glossary-tier-v1', migratedTier);
      localStorage.removeItem('g-kentei-learn-easy-mode');
    }
  }, []);

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

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    if (value !== '') {
      const next = new URLSearchParams(searchParams);
      next.delete('term');
      setSearchParams(next);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold">用語集</h1>

      <div className="flex items-center gap-2">
        <GlossarySearch value={searchQuery} onChange={handleSearchChange} />
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            variant={tier === 'beginner' ? 'default' : 'outline'}
            onClick={() => setTier('beginner')}
            aria-label="初級"
          >
            初級
          </Button>
          <Button
            size="sm"
            variant={tier === 'intermediate' ? 'default' : 'outline'}
            onClick={() => setTier('intermediate')}
            aria-label="中級"
          >
            中級
          </Button>
          <Button
            size="sm"
            variant={tier === 'advanced' ? 'default' : 'outline'}
            onClick={() => setTier('advanced')}
            aria-label="上級"
          >
            上級
          </Button>
        </div>
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

      <GlossaryList terms={displayTerms} highlightTermId={highlightTermId} tier={tier} />
    </div>
  );
}
