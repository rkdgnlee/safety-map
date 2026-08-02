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
    const { query, crimeType } = req.query;

    const crimeKeyword: Record<string, string> = {
      all: '범죄 사건',
      child: '아동 어린이 범죄',
      elderly: '노인 범죄',
      sex: '성범죄 성폭력',
      violence: '폭행 폭력',
      robbery: '강도',
      theft: '절도',
    };

    const keyword = crimeKeyword[crimeType as string] ?? '범죄 사건';
    const fullQuery = `${query} ${keyword}`;
    const apiRes = await fetch(
      `https://naverapihub.apigw.ntruss.com/search/v1/news?query=${encodeURIComponent(fullQuery)}&display=3&sort=date`,
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