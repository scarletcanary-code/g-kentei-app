import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import GlossarySearch from '../components/glossary/GlossarySearch';
import GlossaryList from '../components/glossary/GlossaryList';
import { useGlossary } from '../hooks/useGlossary';
import type { CategoryId } from '../types/category';

type CategoryFilter = CategoryId | 'all';

export default function GlossaryPage() {
  const [searchParams] = useSearchParams();
  const termParam = searchParams.get('term') ?? '';

  const [searchQuery, setSearchQuery] = useState(termParam);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  useEffect(() => {
    if (termParam) {
      setSearchQuery(termParam);
    }
  }, [termParam]);

  const { filteredTerms, totalCount } = useGlossary({
    searchQuery,
    categoryFilter,
    sortKey: 'term',
  });

  const openTermId = termParam || undefined;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold">用語集</h1>

      <GlossarySearch value={searchQuery} onChange={setSearchQuery} />

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

      <GlossaryList terms={filteredTerms} openTermId={openTermId} />
    </div>
  );
}
