// safety-map-proxy/api/place-search.ts
// 장소 이름 검색 (북한산, 자라섬 캠핑장 등) — 네이버 지역 검색 API
// GET /api/place-search?query=북한산
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseRegionFromAddress } from '../lib/publicData';

const LOG_PREFIX = '[place-search]';

function getQueryParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const stripTags = (text: string) => text.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"');

// 네이버 지역 검색 좌표는 WGS84 경위도 × 10^7 정수 문자열 (예: mapx "1269780000")
const toDegrees = (value: string) => Number(value) / 1e7;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const clientId = process.env.NAVER_SEARCH_CLIENT_ID;
  const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'NAVER_SEARCH keys not set' });
  }

  const query = getQueryParam(req.query.query)?.trim();
  if (!query || query.length < 2) {
    return res.status(400).json({ error: 'query 필요 (2글자 이상)' });
  }

  try {
    const apiRes = await fetch(
      `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5`,
      { headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret } },
    );
    if (!apiRes.ok) {
      const text = await apiRes.text();
      console.error(`${LOG_PREFIX} 응답 오류:`, apiRes.status, text.slice(0, 200));
      return res.status(apiRes.status).json({ error: '장소 검색 실패' });
    }

    const data = await apiRes.json();
    const places = (data.items ?? [])
      .map((item: any) => {
        const address = item.roadAddress || item.address || '';
        const region = parseRegionFromAddress(item.address || item.roadAddress || '');
        return {
          name: stripTags(item.title ?? ''),
          category: item.category ?? '',
          address,
          lat: toDegrees(item.mapy),
          lng: toDegrees(item.mapx),
          sido: region?.sido,
          sigungu: region?.sigungu,
        };
      })
      // 좌표가 없거나 국내 범위를 벗어난 항목은 제외
      .filter((p: { lat: number; lng: number }) => p.lat > 32 && p.lat < 39.5 && p.lng > 124 && p.lng < 132);

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ places });
  } catch (err) {
    console.error(`${LOG_PREFIX} proxy error:`, err);
    return res.status(500).json({ error: '장소 검색 실패' });
  }
}
