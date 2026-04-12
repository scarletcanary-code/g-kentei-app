import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';

const KEY_PREFIX = 'g-kentei-';

export function usePersistedState<T>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
  const storageKey = `${KEY_PREFIX}${key}`;

  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        return JSON.parse(stored) as T;
      }
    } catch (e) {
      console.error(`[usePersistedState] Failed to parse localStorage key "${storageKey}":`, e);
    }
    return initialValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (e) {
      console.error(`[usePersistedState] Failed to write localStorage key "${storageKey}":`, e);
    }
  }, [storageKey, state]);

  return [state, setState];
}
