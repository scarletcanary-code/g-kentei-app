import { useCallback } from 'react';
import { usePersistedState } from './usePersistedState';

const STORAGE_KEY = 'glossary-memorized-v1';

export function useMemorizedTerms() {
  const [memorized, setMemorized] = usePersistedState<string[]>(STORAGE_KEY, []);
  const memorizedSet = new Set(memorized);

  const isMemorized = useCallback(
    (termId: string) => memorizedSet.has(termId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [memorized]
  );

  const toggle = useCallback(
    (termId: string) => {
      setMemorized((prev) => {
        const next = new Set(prev);
        if (next.has(termId)) {
          next.delete(termId);
        } else {
          next.add(termId);
        }
        return Array.from(next);
      });
    },
    [setMemorized]
  );

  return { memorizedSet, isMemorized, toggle, count: memorized.length };
}
