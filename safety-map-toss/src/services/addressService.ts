// safety-map-toss/src/services/addressService.ts

const PROXY_BASE_URL = import.meta.env.VITE_PROXY_BASE_URL;

export interface JusoItem {
  roadAddr: string;
  roadAddrPart1: string;
  roadAddrPart2: string;
  jibunAddr: string;
  zipNo: string;
  bdMgtSn: string;   
  bdNm: string;
  siNm: string;
  sggNm: string;
  emdNm: string;
}

interface JusoApiResponse {
  results: {
    common: {
      totalCount: string;
      errorCode: string;
      errorMessage: string;
    };
    juso: JusoItem[];
  };
}

export async function searchAddress(keyword: string): Promise<JusoItem[]> {
  if (!PROXY_BASE_URL) {
    throw new Error('VITE_PROXY_BASE_URL이 설정되지 않았습니다.');
  }

  const params = new URLSearchParams({ keyword });
  const res = await fetch(`${PROXY_BASE_URL}/api/address-search?${params.toString()}`);

  if (!res.ok) {
    throw new Error('주소 검색 요청에 실패했습니다.');
  }

  const data: JusoApiResponse = await res.json();

  if (data.results.common.errorCode !== '0') {
    throw new Error(data.results.common.errorMessage);
  }

  return data.results.juso ?? [];
}