import { useState, useCallback } from 'react';
import { useDebounce } from './useDebounce';

export function useSearch(delay = 400) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, delay);

  const clear = useCallback(() => setQuery(''), []);

  return { query, setQuery, debouncedQuery, clear };
}
