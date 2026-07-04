// safety-map-proxy/api/safemap-wms.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_ENDPOINTS = new Set([
  'IF_0081_WMS',
  'IF_0082_WMS',
  'IF_0083_WMS',
  'IF_0084_WMS',
  'IF_0085_WMS',
  'IF_0086_WMS',
  'IF_0087_WMS',
]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const serviceKey = process.env.SAFEMAP_SERVICE_KEY;
  if (!serviceKey) {
    return res.status(500).json({ error: 'SAFEMAP_SERVICE_KEY not set' });
  }

  const {
    bbox,
    endpoint,
    layerName,
    styles,
    width = '512',
    height = '512',
  } = req.query;

  if (!bbox || typeof bbox !== 'string') {
    return res.status(400).json({ error: 'bbox is required' });
  }

  // 허용된 endpoint 외 요청 차단 (보안)
  if (!endpoint || typeof endpoint !== 'string' || !ALLOWED_ENDPOINTS.has(endpoint)) {
    return res.status(400).json({ error: 'Invalid endpoint' });
  }

  if (!layerName || !styles) {
    return res.status(400).json({ error: 'layerName and styles are required' });
  }

  const params = new URLSearchParams({
    serviceKey,
    srs: 'EPSG:4326',
    bbox,
    format: 'image/png',
    width: String(width),
    height: String(height),
    transparent: 'TRUE',
    layers: String(layerName),
    styles: String(styles),
  });

  // safemap-wms.ts — try 블록 수정
try {
  const requestUrl = `http://safemap.go.kr/openapi2/${endpoint}?${params.toString()}`;
  console.log('[safemap-wms] 요청 URL:', requestUrl); // ← 추가

  const apiRes = await fetch(requestUrl);

  console.log('[safemap-wms] 응답 status:', apiRes.status); // ← 추가
  console.log('[safemap-wms] Content-Type:', apiRes.headers.get('content-type')); // ← 추가

  if (!apiRes.ok) {
    const text = await apiRes.text();
    console.error('[safemap-wms] 응답 바디:', text); // ← 추가
    return res.status(apiRes.status).json({ error: 'safemap API 호출 실패', detail: text });
  }

  const imageBuffer = await apiRes.arrayBuffer();
  console.log('[safemap-wms] 이미지 크기(bytes):', imageBuffer.byteLength); // ← 추가

  // 이미지가 0바이트면 빈 응답 온 것
  if (imageBuffer.byteLength === 0) {
    return res.status(502).json({ error: '빈 이미지 응답' });
  }

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  return res.status(200).send(Buffer.from(imageBuffer));
} catch (err) {
  console.error('[safemap-wms] proxy error:', err);
  return res.status(500).json({ error: '범죄 데이터 호출 실패' });
}
}