import type { VercelRequest, VercelResponse } from '@vercel/node';
import proj4 from 'proj4';

// 📌 대한민국에서 주로 사용하는 행안부 GRS80 중부원점 좌표계 정의 (EPSG:5181 또는 EPSG:5179)
// 도로명주소 API의 좌표계는 주로 EPSG:5179(UTM-K) 또는 EPSG:5181을 따릅니다. 
// 일반적인 행안부 좌표 API는 EPSG:5179 기반인 경우가 많으므로 아래 정의를 사용합니다.
const GRS80_PROJ = '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs';
const WGS84_PROJ = '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs'; // 일반적인 위경도

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const coordKey = process.env.JUSO_COORDI_KEY || 'U01TX0FVVEgyMDI2MDYyODIyMzUxNTExOTUyNDk=';
  const { admCd, rnMgtSn, udrtYn, buldMnnm, buldSlno } = req.query;

  if (!admCd || !rnMgtSn || !buldMnnm || !buldSlno) {
    return res.status(400).json({ error: '필수 파라미터가 누락되었습니다.' });
  }

  try {
    const params = new URLSearchParams({
      confmKey: coordKey,
      admCd: admCd as string,
      rnMgtSn: rnMgtSn as string,
      udrtYn: (udrtYn as string) || '0',
      buldMnnm: buldMnnm as string,
      buldSlno: buldSlno as string,
      resultType: 'json',
    });

    const apiRes = await fetch(
      `https://business.juso.go.kr/addrlink/addrCoordApi.do?${params.toString()}`
    );

    if (!apiRes.ok) {
      return res.status(apiRes.status).json({ error: '행안부 좌표 API 호출 실패' });
    }

    const data = await apiRes.json();

    if (!data.results || !data.results.juso || data.results.juso.length === 0) {
      return res.status(404).json({ error: '좌표 정보를 찾을 수 없습니다.' });
    }

    const { entX, entY } = data.results.juso[0];
    const x = parseFloat(entX);
    const y = parseFloat(entY);

    // 📌 proj4를 이용한 좌표 변환 (GRS80 -> WGS84 위경도)
    // proj4(fromProjection, toProjection, [x, y]) 형태입니다.
    const [lng, lat] = proj4(GRS80_PROJ, WGS84_PROJ, [x, y]);

    // 프론트엔드가 바로 사용할 수 있게 가공해서 응답합니다.
    return res.status(200).json({ lat, lng });

  } catch (err) {
    console.error('geocoding proxy error:', err);
    return res.status(500).json({ error: 'Geocoding 요청 실패' });
  }
}