// safety-map-toss/src/hooks/useAddressSearch.ts
import { useState, useEffect } from 'react';
import { searchAddress, JusoItem } from '../services/addressService';

interface UseAddressSearchResult {
  results: JusoItem[];
  loading: boolean;
  error: string | null;
}

export function useAddressSearch(keyword: string, debounceMs = 300): UseAddressSearchResult {
  const [results, setResults] = useState<JusoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!keyword.trim() || keyword.trim().length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    let isCancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await searchAddress(keyword);
        if (!isCancelled) {
          setResults(data);
        }
      } catch (e) {
        if (!isCancelled) {
          setError(e instanceof Error ? e.message : '검색 중 오류가 발생했습니다.');
          setResults([]);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [keyword, debounceMs]);

  return { results, loading, error };
}