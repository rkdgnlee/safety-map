// safety-map-toss/src/services/geocodingService.ts
const PROXY_BASE_URL = import.meta.env.VITE_PROXY_BASE_URL;

export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  const res = await fetch(
    `${PROXY_BASE_URL}/api/geocoding?query=${encodeURIComponent(address)}`
  );

  if (!res.ok) throw new Error('Geocoding 요청 실패');

  const data = await res.json();

  if (!data.addresses || data.addresses.length === 0) {
    return null; // 검색 결과 없음
  }

  const { x, y } = data.addresses[0]; // x = 경도, y = 위도
  return { lat: parseFloat(y), lng: parseFloat(x) };
}