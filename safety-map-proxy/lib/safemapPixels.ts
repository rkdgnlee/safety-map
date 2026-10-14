// 생활안전정보(safemap) WMS 는 GetFeatureInfo·범례 요청을 막아 두어,
// 작은 지도 이미지를 받아 픽셀 색으로 해당 지점의 단계를 읽는다.
import zlib from 'node:zlib';
import { cached } from './publicData';

const SAFEMAP_BASE_URL = 'https://safemap.go.kr/openapi2';
const IMAGE_SIZE = 64;
const SAMPLE_RADIUS_M = 500; // 이미지 한 변 = 1km

type Rgba = [number, number, number, number];

interface DecodedPng {
  width: number;
  height: number;
  pixel: (x: number, y: number) => Rgba;
}

// 최소 PNG 디코더: 8bit, 비인터레이스, color type 0/2/3/4/6
function decodePng(buf: Buffer): DecodedPng {
  let p = 8;
  let width = 0;
  let height = 0;
  let depth = 0;
  let colorType = 0;
  let interlace = 0;
  let palette: Buffer | null = null;
  let transparency: Buffer | null = null;
  const idat: Buffer[] = [];

  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      depth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') transparency = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (depth !== 8 || interlace !== 0) throw new Error(`지원하지 않는 PNG (depth ${depth}, interlace ${interlace})`);

  const bpp = ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 } as Record<number, number>)[colorType];
  if (!bpp) throw new Error(`지원하지 않는 PNG color type ${colorType}`);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const out = Buffer.alloc(height * stride);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[y * stride + x - bpp] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pp = a + b - c;
        const pa = Math.abs(pp - a);
        const pb = Math.abs(pp - b);
        const pc = Math.abs(pp - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[y * stride + x] = v & 255;
    }
  }

  const pixel = (x: number, y: number): Rgba => {
    const i = y * stride + x * bpp;
    switch (colorType) {
      case 3: {
        const k = out[i];
        const alpha = transparency && k < transparency.length ? transparency[k] : 255;
        return [palette![k * 3], palette![k * 3 + 1], palette![k * 3 + 2], alpha];
      }
      case 2:
        return [out[i], out[i + 1], out[i + 2], 255];
      case 6:
        return [out[i], out[i + 1], out[i + 2], out[i + 3]];
      case 0:
        return [out[i], out[i], out[i], 255];
      default:
        return [out[i], out[i], out[i], out[i + 1]];
    }
  };
  return { width, height, pixel };
}

// 중심에서 반경 radiusM 안의 불투명 픽셀만 모은다
function samplePixels(img: DecodedPng, radiusM: number, minAlpha: number): Rgba[] {
  const metersPerPx = (SAMPLE_RADIUS_M * 2) / img.width;
  const r = radiusM / metersPerPx;
  const cx = (img.width - 1) / 2;
  const cy = (img.height - 1) / 2;
  const result: Rgba[] = [];
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
      const px = img.pixel(x, y);
      if (px[3] >= minAlpha) result.push(px);
    }
  }
  return result;
}

async function fetchLayerImage(
  lat: number,
  lng: number,
  endpoint: string,
  layer?: { name: string; style: string },
): Promise<DecodedPng> {
  const key = process.env.SAFEMAP_SERVICE_KEY;
  if (!key) throw new Error('SAFEMAP_SERVICE_KEY not set');
  const dLat = SAMPLE_RADIUS_M / 111_320;
  const dLng = SAMPLE_RADIUS_M / (111_320 * Math.cos((lat * Math.PI) / 180));
  const params = new URLSearchParams({
    srs: 'EPSG:4326',
    bbox: `${lng - dLng},${lat - dLat},${lng + dLng},${lat + dLat}`,
    format: 'image/png',
    width: String(IMAGE_SIZE),
    height: String(IMAGE_SIZE),
    transparent: 'TRUE',
  });
  if (layer) {
    params.set('layers', layer.name);
    params.set('styles', layer.style);
  }
  const res = await fetch(`${SAFEMAP_BASE_URL}/${endpoint}?serviceKey=${key}&${params.toString()}`);
  const contentType = res.headers.get('content-type') ?? '';
  if (!res.ok || !contentType.startsWith('image/')) throw new Error(`${endpoint} 이미지 응답 아님 (${res.status})`);
  return decodePng(Buffer.from(await res.arrayBuffer()));
}

const cacheKey = (name: string, lat: number, lng: number) => `${name}:${lat.toFixed(4)},${lng.toFixed(4)}`;
const DAY_MS = 24 * 60 * 60_000;

// ── 범죄주의구간: 도로 위 10단계, 노랑 → 빨강일수록 주의 ─────────
// 공식 색상표가 공개돼 있지 않아 초록 채널(G)이 낮을수록(붉을수록) 높은 단계로 추정한다.
const crimeLevelFromColor = ([, g]: Rgba) => Math.min(10, Math.max(1, Math.round(1 + (9 * (1 - g / 255)) / 0.9)));

export interface CrimeSample {
  maxLevel: number | null; // 반경 500m 안 가장 높은 단계 (없으면 null)
  nearLevel: number | null; // 반경 100m 안 가장 높은 단계
  coveredRatio: number; // 반경 500m 중 주의구간이 칠해진 비율
}

export function getCrimeSample(lat: number, lng: number): Promise<CrimeSample> {
  return cached(cacheKey('crime', lat, lng), DAY_MS, async () => {
    const img = await fetchLayerImage(lat, lng, 'IF_0087_WMS', {
      name: 'A2SM_CRMNLHSPOT_TOT',
      style: 'A2SM_CrmnlHspot_Tot_Tot',
    });
    // 주의구간 본체는 알파 약 153, 테두리 안티앨리어싱은 그보다 낮다
    const wide = samplePixels(img, 500, 100);
    const near = samplePixels(img, 100, 100);
    const total = samplePixels(img, 500, 0).length;
    const maxOf = (pixels: Rgba[]) => (pixels.length ? Math.max(...pixels.map(crimeLevelFromColor)) : null);
    return { maxLevel: maxOf(wide), nearLevel: maxOf(near), coveredRatio: total ? wide.length / total : 0 };
  });
}

// ── 산사태 위험: 1등급(진한 빨강) ~ 5등급(파랑) ───────────────────
const LANDSLIDE_PALETTE: [Rgba, number][] = [
  [[220, 16, 16, 255], 1],
  [[255, 0, 0, 255], 2],
  [[255, 200, 0, 255], 3],
  [[182, 255, 143, 255], 4],
  [[51, 195, 255, 255], 5],
];

function nearestLandslideGrade([r, g, b]: Rgba): number | null {
  let best: number | null = null;
  let bestDist = Infinity;
  for (const [[pr, pg, pb], grade] of LANDSLIDE_PALETTE) {
    const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = grade;
    }
  }
  return bestDist <= 40 ** 2 * 3 ? best : null;
}

export interface LandslideSample {
  worstGrade: number | null; // 반경 300m 안 가장 위험한 등급 (1이 가장 위험)
}

export function getLandslideSample(lat: number, lng: number): Promise<LandslideSample> {
  return cached(cacheKey('landslide', lat, lng), DAY_MS, async () => {
    const img = await fetchLayerImage(lat, lng, 'IF_0046_WMS');
    const grades = samplePixels(img, 300, 200)
      .map(nearestLandslideGrade)
      .filter((g): g is number => g !== null);
    return { worstGrade: grades.length ? Math.min(...grades) : null };
  });
}

// ── 하천 홍수위험: 국가하천 + 지방하천 범람 시 침수 예상 구역 ─────
export interface FloodSample {
  atPoint: boolean; // 반경 50m 안이 침수 예상 구역
  nearbyRatio: number; // 반경 300m 중 침수 예상 구역 비율
}

export function getFloodSample(lat: number, lng: number): Promise<FloodSample> {
  return cached(cacheKey('flood', lat, lng), DAY_MS, async () => {
    const images = await Promise.all([
      fetchLayerImage(lat, lng, 'IF_0089_WMS'),
      fetchLayerImage(lat, lng, 'IF_0100_WMS'),
    ]);
    // 두 레이어 중 한 곳이라도 칠해진 픽셀을 침수 예상으로 본다
    const covered = (radiusM: number) => {
      const total = samplePixels(images[0], radiusM, 0).length;
      const metersPerPx = (SAMPLE_RADIUS_M * 2) / IMAGE_SIZE;
      const r = radiusM / metersPerPx;
      const c = (IMAGE_SIZE - 1) / 2;
      let hit = 0;
      for (let y = 0; y < IMAGE_SIZE; y++) {
        for (let x = 0; x < IMAGE_SIZE; x++) {
          if ((x - c) ** 2 + (y - c) ** 2 > r * r) continue;
          if (images.some((img) => img.pixel(x, y)[3] >= 200)) hit++;
        }
      }
      return total ? hit / total : 0;
    };
    return { atPoint: covered(50) > 0.3, nearbyRatio: covered(300) };
  });
}
