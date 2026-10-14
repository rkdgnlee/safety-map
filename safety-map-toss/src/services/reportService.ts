import type { CategoryId, Place } from '../constants/categories';
import type { ApiReport } from '../types/report';

const PROXY_BASE_URL = import.meta.env.VITE_PROXY_BASE_URL;
const CACHE_TTL_MS = 5 * 60_000;

const cache = new Map<string, { expires: number; value: Promise<ApiReport> }>();

export async function fetchReport(categoryId: Exclude<CategoryId, 'moving'>, place: Place): Promise<ApiReport> {
  // 좌표를 소수 셋째 자리(약 100m)로 맞춰 카테고리 칩을 오갈 때 같은 요청을 재사용
  const params = new URLSearchParams({
    category: categoryId,
    lat: place.lat.toFixed(3),
    lng: place.lng.toFixed(3),
  });
  if (place.sido) params.set('sido', place.sido);
  if (place.sigungu) params.set('sigungu', place.sigungu);
  const key = params.toString();

  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;

  const value = fetch(`${PROXY_BASE_URL}/api/report?${key}`).then(async (res) => {
    if (!res.ok) throw new Error(`report ${res.status}`);
    return (await res.json()) as ApiReport;
  });
  value.catch(() => cache.delete(key));
  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, value });
  return value;
}
