// safety-map-proxy/api/news.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const clientId = process.env.NAVER_SEARCH_CLIENT_ID;
  const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Naver Search API 키 없음' });
  }

  const { query } = req.query;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'query 필요' });
  }

  try {
    const apiRes = await fetch(
      // ✅ 변경된 NCP 엔드포인트
      `https://naverapihub.apigw.ntruss.com/search/v1/news?query=${encodeURIComponent(query)}&display=3&sort=date`,
      {
        headers: {
          // ✅ 헤더 이름도 NCP 방식으로
          'X-NCP-APIGW-API-KEY-ID': clientId,
          'X-NCP-APIGW-API-KEY': clientSecret,
        },
      }
    );

    if (!apiRes.ok) {
      const text = await apiRes.text();
      console.error('네이버 뉴스 API 오류:', text);
      return res.status(apiRes.status).json({ error: '뉴스 검색 실패', detail: text });
    }

    const data = await apiRes.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('news proxy error:', err);
    return res.status(500).json({ error: '뉴스 검색 실패' });
  }
}