// safety-map-proxy/api/report.ts
// 카테고리별 결과 화면에 필요한 공공데이터를 한 번에 모아 돌려준다.
// GET /api/report?category=hiking&lat=37.55&lng=126.90[&sido=서울특별시&sigungu=마포구]
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getAirQuality,
  getCampsites,
  getFireRisk,
  getFishing,
  getHospitals,
  getNightLow,
  getRegionFromNaver,
  getSun,
  getTide,
  getWarnings,
  getWeather,
  regionFromHospital,
  type Region,
} from '../lib/sources';

const LOG_PREFIX = '[report]';
const CATEGORIES = new Set(['hiking', 'camping', 'fishing', 'night']);

function getQueryParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// 한 소스가 실패해도 나머지는 보여주도록 실패를 null + 에러 목록으로 바꾼다
async function settle<T>(name: string, errors: string[], task: Promise<T>): Promise<T | null> {
  try {
    return await task;
  } catch (err) {
    console.error(`${LOG_PREFIX} ${name} 실패:`, err instanceof Error ? err.message : err);
    errors.push(name);
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const category = getQueryParam(req.query.category);
  const lat = Number(getQueryParam(req.query.lat));
  const lng = Number(getQueryParam(req.query.lng));
  if (!category || !CATEGORIES.has(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }
  // 대한민국 범위 밖 좌표는 공공 API 가 처리하지 못한다
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 32 || lat > 39.5 || lng < 124 || lng > 132) {
    return res.status(400).json({ error: 'lat/lng out of range' });
  }
  if (!process.env.PUBLIC_DATA_SERVICE_KEY) {
    return res.status(500).json({ error: 'PUBLIC_DATA_SERVICE_KEY not set' });
  }

  const now = new Date();
  const errors: string[] = [];

  try {
    // 1) 지역(시·도/시·군·구): 요청값 → 네이버 역지오코딩 → 가장 가까운 응급실 주소 순
    const hospitalsTask = settle('hospitals', errors, getHospitals(lat, lng));
    const sido = getQueryParam(req.query.sido);
    const sigungu = getQueryParam(req.query.sigungu);
    let region: Region | null = sido ? { sido, sigungu: sigungu ?? '', source: 'query' } : null;
    if (!region) region = await settle('region', errors, getRegionFromNaver(lat, lng));
    const hospitals = (await hospitalsTask) ?? [];
    if (!region) region = regionFromHospital(hospitals);

    // 2) 카테고리별 소스 병렬 조회
    const outdoor = category !== 'night';
    const [weather, warnings, sun, air, fireRisk, nightLow, campsites, tide, fishing] = await Promise.all([
      settle('weather', errors, getWeather(lat, lng, now)),
      settle('warnings', errors, getWarnings(region)),
      settle('sun', errors, getSun(lat, lng, now)),
      outdoor ? settle('air', errors, getAirQuality(region)) : null,
      category === 'hiking' || category === 'camping' ? settle('fireRisk', errors, getFireRisk(region)) : null,
      category === 'camping' ? settle('nightLow', errors, getNightLow(lat, lng, now)) : null,
      category === 'camping' ? settle('campsites', errors, getCampsites(lat, lng)) : null,
      category === 'fishing' ? settle('tide', errors, getTide(lat, lng, now)) : null,
      category === 'fishing' ? settle('fishing', errors, getFishing(lat, lng, now)) : null,
    ]);

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({
      category,
      generatedAt: now.toISOString(),
      region,
      weather: weather ?? [],
      warnings: warnings ?? [],
      sun,
      air,
      hospitals,
      fireRisk,
      nightLow,
      campsites,
      tide,
      fishing,
      errors,
    });
  } catch (err) {
    console.error(`${LOG_PREFIX} proxy error:`, err);
    return res.status(500).json({ error: '데이터 호출 실패' });
  }
}
