// safety-map-proxy/api/address-search.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

interface JusoItem {
  roadAddr: string;
  roadAddrPart1: string;
  roadAddrPart2: string;
  jibunAddr: string;
  engAddr: string;
  zipNo: string;
  admCd: string;
  rnMgtSn: string;
  bdMgtSn: string;
  detBdNmList: string;
  bdNm: string;
  bdKdcd: string;
  siNm: string;
  sggNm: string;
  emdNm: string;
  liNm: string;
  rn: string;
  udrtYn: string;
  buldMnnm: number;
  buldSlno: number;
  mtYn: string;
  lnbrMnnm: number;
  lnbrSlno: string;
}

interface JusoApiResponse {
  results: {
    common: {
      totalCount: string;
      currentPage: string;
      countPerPage: string;
      errorCode: string;
      errorMessage: string;
    };
    juso: JusoItem[];
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS — 운영 단계에서는 '*' 대신 실제 toss 배포 도메인으로 좁히는 걸 추천
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { keyword, currentPage = '1', countPerPage = '10' } = req.query;

  if (!keyword || typeof keyword !== 'string') {
    return res.status(400).json({ error: 'keyword query parameter is required' });
  }

  const confmKey = process.env.JUSO_CONFM_KEY;
  if (!confmKey) {
    console.error('JUSO_CONFM_KEY is not set in environment variables');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const params = new URLSearchParams({
    confmKey,
    currentPage: String(currentPage),
    countPerPage: String(countPerPage),
    keyword,
    resultType: 'json',
  });

  try {
    const apiRes = await fetch(
      `https://business.juso.go.kr/addrlink/addrLinkApi.do?${params.toString()}`
    );

    if (!apiRes.ok) {
      return res.status(apiRes.status).json({ error: '주소 API 호출에 실패했습니다.' });
    }

    const data: JusoApiResponse = await apiRes.json();

    // 동일 검색어 반복 호출 부담 줄이기 (선택)
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

    return res.status(200).json(data);
  } catch (err) {
    console.error('address-search proxy error:', err);
    return res.status(500).json({ error: '주소 검색 중 오류가 발생했습니다.' });
  }
}