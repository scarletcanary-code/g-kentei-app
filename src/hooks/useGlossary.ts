import { useMemo } from 'react';
import type { GlossaryTerm } from '../types/glossary';
import type { CategoryId } from '../types/category';
import { ALL_TERMS } from '../data/glossary/index';

interface UseGlossaryArgs {
  searchQuery: string;
  categoryFilter: CategoryId | 'all';
  sortKey?: 'term' | 'importance';
}

interface UseGlossaryResult {
  filteredTerms: GlossaryTerm[];
  totalCount: number;
}

export function useGlossary({
  searchQuery,
  categoryFilter,
  sortKey,
}: UseGlossaryArgs): UseGlossaryResult {
  const filteredTerms = useMemo(() => {
    const normalizedQuery = searchQuery.toLowerCase();

    let result = ALL_TERMS.filter((t) => {
      const matchesCategory =
        categoryFilter === 'all' || t.categoryId === categoryFilter;

      const matchesSearch =
        normalizedQuery === '' ||
        t.term.toLowerCase().includes(normalizedQuery) ||
        t.termEn.toLowerCase().includes(normalizedQuery) ||
        t.definition.toLowerCase().includes(normalizedQuery) ||
        (t.aliases ?? []).some(a => a.toLowerCase().includes(normalizedQuery));

      return matchesCategory && matchesSearch;
    });

    if (sortKey === 'importance') {
      result = [...result].sort((a, b) => {
        if (a.importance !== b.importance) {
          return a.importance - b.importance;
        }
        return a.term.localeCompare(b.term, 'ja');
      });
    } else {
      result = [...result].sort((a, b) => a.term.localeCompare(b.term, 'ja'));
    }

    return result;
  }, [searchQuery, categoryFilter, sortKey]);

  return {
    filteredTerms,
    totalCount: filteredTerms.length,
  };
}
