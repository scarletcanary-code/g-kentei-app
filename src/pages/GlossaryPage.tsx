import { useState, useMemo } from 'react';
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

export default function GlossaryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const termParam = searchParams.get('term') ?? '';

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [isEasy, setIsEasy] = usePersistedState<boolean>('g-kentei-learn-easy-mode', false);

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

      <GlossaryList terms={displayTerms} highlightTermId={highlightTermId} isEasy={isEasy} />
    </div>
  );
}
