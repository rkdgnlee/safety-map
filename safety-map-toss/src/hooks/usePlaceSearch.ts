// 장소 이름 검색 (북한산, 자라섬 캠핑장 등). 주소 검색(useAddressSearch)과 같은 방식으로 디바운스한다.
import { useEffect, useState } from 'react';

const PROXY_BASE_URL = import.meta.env.VITE_PROXY_BASE_URL;

export interface PlaceResult {
  name: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  sido?: string;
  sigungu?: string;
}

export function usePlaceSearch(keyword: string, debounceMs = 300) {
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const query = keyword.trim();
    if (query.length < 2) {
      setResults([]);
      return;
    }

    let isCancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${PROXY_BASE_URL}/api/place-search?query=${encodeURIComponent(query)}`);
        const data = res.ok ? await res.json() : { places: [] };
        if (!isCancelled) setResults(data.places ?? []);
      } catch {
        // 장소 검색이 실패해도 주소 검색 결과는 그대로 보여준다
        if (!isCancelled) setResults([]);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }, debounceMs);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [keyword, debounceMs]);

  return { results, loading };
}
