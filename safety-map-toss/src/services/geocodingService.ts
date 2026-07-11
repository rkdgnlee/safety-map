const PROXY_BASE_URL = import.meta.env.VITE_PROXY_BASE_URL;

export async function geocodeAddress(params: {
  admCd: string;
  rnMgtSn: string;
  udrtYn: string;
  buldMnnm: number;
  buldSlno: number;
}): Promise<{ lat: number; lng: number } | null> {
  const query = new URLSearchParams({
    admCd: params.admCd,
    rnMgtSn: params.rnMgtSn,
    udrtYn: params.udrtYn,
    buldMnnm: String(params.buldMnnm),
    buldSlno: String(params.buldSlno),
  });

  const res = await fetch(`${PROXY_BASE_URL}/api/geocoding?${query.toString()}`);

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error('Geocoding 요청 실패');
  }

  const data = await res.json();
  return { lat: data.lat, lng: data.lng };
}