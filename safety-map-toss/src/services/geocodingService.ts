const PROXY_BASE_URL = import.meta.env.VITE_PROXY_BASE_URL;

/**
 * 기존과 동일하게 string 타입의 주소를 받아 위경도 { lat, lng }를 반환합니다.
 * 컴포넌트 측(Props) 변경 사항 없음!
 */
export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  // 기존과 동일하게 query로 address를 인코딩해서 보냅니다.
  const res = await fetch(
    `${PROXY_BASE_URL}/api/geocoding?query=${encodeURIComponent(address)}`
  );

  if (!res.ok) {
    if (res.status === 404) return null; // 검색 결과 없음 안전하게 처리
    throw new Error('Geocoding 요청 실패');
  }

  const data = await res.json();

  // 프록시 서버가 이미 위경도(lat, lng) 변환까지 마친 데이터를 내려줍니다.
  return {
    lat: data.lat,
    lng: data.lng,
  };
}