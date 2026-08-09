import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const serviceKey = process.env.PUBLIC_DATA_SERVICE_KEY;
  if (!serviceKey) {
    return res.status(500).json({ error: 'PUBLIC_DATA_SERVICE_KEY 없음' });
  }

  const { roadName, sggCode } = req.query;
  // roadName: 역지오코딩으로 뽑은 도로명 (예: "첨단중앙로")
  // sggCode: 자치단체코드 (선택, 있으면 더 정확)

  if (!roadName || typeof roadName !== 'string') {
    return res.status(400).json({ error: 'roadName 필수' });
  }

  try {
    // 대괄호 파라미터는 URLSearchParams가 인코딩해버려서 수동으로 조합
    let url = `https://apis.data.go.kr/1741000/cctv_info/info?serviceKey=${serviceKey}&pageNo=1&numOfRows=100&returnType=json&cond%5BLCTN_ROAD_NM_ADDR%3A%3ALIKE%5D=${encodeURIComponent(roadName)}`;

    if (sggCode && typeof sggCode === 'string') {
      url += `&cond%5BOPN_ATMY_GRP_CD%3A%3AEQ%5D=${encodeURIComponent(sggCode)}`;
    }

    console.log('[cctv] 요청 URL:', url);

    const apiRes = await fetch(url);

    if (!apiRes.ok) {
      const text = await apiRes.text();
      console.error('[cctv] API 오류:', text);
      return res.status(apiRes.status).json({ error: 'CCTV API 호출 실패', detail: text });
    }

    const data = await apiRes.json();
    console.log('[cctv] 총 건수:', data.totalCount);

    const items = (data.data ?? [])
      .filter((item: any) => item.WGS84_LAT && item.WGS84_LOT)
      .map((item: any) => ({
        lat: parseFloat(item.WGS84_LAT),
        lng: parseFloat(item.WGS84_LOT),
        purpose: item.INSTL_PRPS_SE_NM,
        address: item.LCTN_ROAD_NM_ADDR,
        camCount: item.CAM_CNTOM,
        pixel: item.CAM_PIXEL_CNT,
        keepDays: item.KPNG_DAY_CNT,
        angle: item.SHT_ANGLE_INFO,
        mngInst: item.MNG_INST_NM,
        telno: item.MNG_INST_TELNO,
        mngNo: item.MNG_NO,
        installYm: item.INSTL_YM,
        sggCode: item.OPN_ATMY_GRP_CD,
      }));

    return res.status(200).json({ items, total: data.totalCount });

  } catch (err) {
    console.error('[cctv] proxy error:', err);
    return res.status(500).json({ error: 'CCTV 데이터 조회 실패' });
  }
}