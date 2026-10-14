// safety-map-proxy/api/safemap-wms.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const SAFEMAP_BASE_URL = 'https://safemap.go.kr/openapi2';
const LOG_PREFIX = '[safemap-wms]';

const ALLOWED_ENDPOINTS = new Set([
  // 범죄주의구간 (기존)
  'IF_0081_WMS',
  'IF_0082_WMS',
  'IF_0083_WMS',
  'IF_0084_WMS',
  'IF_0085_WMS',
  'IF_0086_WMS',
  'IF_0087_WMS',
  // 자연재해 (신규)
  'IF_0030_WMS', // 지진 발생이력
  'IF_0046_WMS', // 산사태 위험
  'IF_0089_WMS', // 국가하천 홍수위험
  'IF_0100_WMS', // 지방하천 홍수위험
]);

const DEFAULT_TILE_SIZE = 512;
const MAX_TILE_SIZE = 2048;

// 쿼리 파라미터가 배열로 들어오는 경우(?a=1&a=2) 첫 번째 값만 사용
function getQueryParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseTileSize(value: string | undefined): number {
  const size = Number(value);
  if (!Number.isInteger(size) || size <= 0) return DEFAULT_TILE_SIZE;
  return Math.min(size, MAX_TILE_SIZE);
}

// 범죄 레이어(IF_0081~87)는 서브타입 구분을 위해 layers/styles가 필요하지만,
// 지진/산사태/하천홍수 같은 단일목적 WMS는 해당 파라미터가 없는 것이 정상 동작입니다.
function buildWmsParams(opts: {
  bbox: string;
  width: number;
  height: number;
  layerName?: string;
  styles?: string;
}): URLSearchParams {
  const params = new URLSearchParams({
    srs: 'EPSG:4326',
    bbox: opts.bbox,
    format: 'image/png',
    width: String(opts.width),
    height: String(opts.height),
    transparent: 'TRUE',
  });

  if (opts.layerName) params.set('layers', opts.layerName);
  if (opts.styles) params.set('styles', opts.styles);

  return params;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const serviceKey = process.env.SAFEMAP_SERVICE_KEY;
  if (!serviceKey) {
    return res.status(500).json({ error: 'SAFEMAP_SERVICE_KEY not set' });
  }

  const bbox = getQueryParam(req.query.bbox);
  const endpoint = getQueryParam(req.query.endpoint);

  if (!bbox) {
    return res.status(400).json({ error: 'bbox is required' });
  }

  // 허용된 endpoint 외 요청 차단 (보안)
  if (!endpoint || !ALLOWED_ENDPOINTS.has(endpoint)) {
    return res.status(400).json({ error: 'Invalid endpoint' });
  }

  const params = buildWmsParams({
    bbox,
    width: parseTileSize(getQueryParam(req.query.width)),
    height: parseTileSize(getQueryParam(req.query.height)),
    layerName: getQueryParam(req.query.layerName),
    styles: getQueryParam(req.query.styles),
  });

  // serviceKey는 이미 인코딩된 값이라 URLSearchParams에 넣지 않고 직접 붙임
  const query = params.toString();
  const requestUrl = `${SAFEMAP_BASE_URL}/${endpoint}?serviceKey=${serviceKey}&${query}`;
  // 로그에 serviceKey가 남지 않도록 제외하고 출력
  console.log(`${LOG_PREFIX} 요청:`, `${SAFEMAP_BASE_URL}/${endpoint}?${query}`);

  try {
    const apiRes = await fetch(requestUrl);
    const contentType = apiRes.headers.get('content-type') ?? '';
    console.log(`${LOG_PREFIX} 응답 status:`, apiRes.status, 'Content-Type:', contentType);

    if (!apiRes.ok) {
      const text = await apiRes.text();
      console.error(`${LOG_PREFIX} 응답 바디:`, text);
      return res.status(apiRes.status).json({ error: 'safemap API 호출 실패', detail: text });
    }

    // WMS는 오류 시에도 200 + XML(ServiceException)로 응답하는 경우가 있음
    if (!contentType.startsWith('image/')) {
      const text = await apiRes.text();
      console.error(`${LOG_PREFIX} 이미지가 아닌 응답:`, text);
      return res.status(502).json({ error: '이미지가 아닌 응답', detail: text });
    }

    const imageBuffer = await apiRes.arrayBuffer();
    console.log(`${LOG_PREFIX} 이미지 크기(bytes):`, imageBuffer.byteLength);

    if (imageBuffer.byteLength === 0) {
      return res.status(502).json({ error: '빈 이미지 응답' });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).send(Buffer.from(imageBuffer));
  } catch (err) {
    console.error(`${LOG_PREFIX} proxy error:`, err);
    return res.status(500).json({ error: '데이터 호출 실패' });
  }
}
