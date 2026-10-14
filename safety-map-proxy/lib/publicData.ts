// 공공데이터포털 호출 공통 도구: KST 시각, 메모리 캐시, 좌표 변환, 지역명 정규화
export const DATA_GO_KR = 'https://apis.data.go.kr';

export function getServiceKey(): string {
  const key = process.env.PUBLIC_DATA_SERVICE_KEY;
  if (!key) throw new Error('PUBLIC_DATA_SERVICE_KEY not set');
  return key;
}

// ── 시간 (서버는 UTC 라 KST 로 맞춘다) ─────────────────────────
const pad = (n: number) => String(n).padStart(2, '0');

export interface KstParts {
  ymd: string; // YYYYMMDD
  hour: number;
  minute: number;
}

export function kstParts(date: Date): KstParts {
  const k = new Date(date.getTime() + 9 * 3600_000);
  return {
    ymd: `${k.getUTCFullYear()}${pad(k.getUTCMonth() + 1)}${pad(k.getUTCDate())}`,
    hour: k.getUTCHours(),
    minute: k.getUTCMinutes(),
  };
}

// 'YYYYMMDD' + 'HHMM' (KST) → ISO 문자열 (+09:00)
export function kstToIso(ymd: string, hhmm: string): string {
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}T${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}:00+09:00`;
}

// ── 메모리 캐시 (서버리스 인스턴스가 살아있는 동안만 유지) ────────
const cache = new Map<string, { expires: number; value: Promise<unknown> }>();

export function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as Promise<T>;
  const value = load().catch((err) => {
    cache.delete(key); // 실패한 결과는 캐시하지 않음
    throw err;
  });
  cache.set(key, { expires: Date.now() + ttlMs, value });
  return value;
}

// serviceKey 는 이미 인코딩된 값이라 문자열로 직접 붙인다. 로그에는 남기지 않는다.
export async function fetchPublicData(path: string, params: Record<string, string | number>): Promise<string> {
  const query = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  const res = await fetch(`${DATA_GO_KR}${path}?serviceKey=${getServiceKey()}&${query}`);
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} ${res.status}: ${text.slice(0, 200)}`);
  return text;
}

export async function fetchPublicJson<T = any>(path: string, params: Record<string, string | number>): Promise<T> {
  const text = await fetchPublicData(path, params);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${path} JSON 아님: ${text.slice(0, 200)}`);
  }
}

// 결과가 1건이면 배열이 아니라 객체로 오는 API 가 있어 항상 배열로 맞춘다
export function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

// 단순 XML(<item><a>..</a></item>) → 객체 배열
export function parseXmlItems(xml: string): Record<string, string>[] {
  const items: Record<string, string>[] = [];
  for (const [, body] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const item: Record<string, string> = {};
    for (const [, tag, value] of body.matchAll(/<(\w+)>([^<]*)<\/\1>/g)) item[tag] = value;
    items.push(item);
  }
  return items;
}

// ── 좌표 ─────────────────────────────────────────────────────
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// 기상청 동네예보 격자(nx, ny) 변환 — 기상청 공개 LCC 변환식
export function toKmaGrid(lat: number, lng: number): { nx: number; ny: number } {
  const RE = 6371.00877;
  const GRID = 5.0;
  const SLAT1 = 30.0;
  const SLAT2 = 60.0;
  const OLON = 126.0;
  const OLAT = 38.0;
  const XO = 43;
  const YO = 136;
  const DEGRAD = Math.PI / 180.0;

  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);
  let theta = lng * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  return {
    nx: Math.floor(ra * Math.sin(theta) + XO + 0.5),
    ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5),
  };
}

// ── 지역명 ───────────────────────────────────────────────────
// 시·도 정식 명칭 → 에어코리아/특보에서 쓰는 짧은 이름
const SIDO_SHORT: [RegExp, string][] = [
  [/^서울/, '서울'],
  [/^부산/, '부산'],
  [/^대구/, '대구'],
  [/^인천/, '인천'],
  [/^광주/, '광주'],
  [/^대전/, '대전'],
  [/^울산/, '울산'],
  [/^세종/, '세종'],
  [/^경기/, '경기'],
  [/^강원/, '강원'],
  [/^충청북|^충북/, '충북'],
  [/^충청남|^충남/, '충남'],
  [/^전라북|^전북/, '전북'],
  [/^전라남|^전남/, '전남'],
  [/^경상북|^경북/, '경북'],
  [/^경상남|^경남/, '경남'],
  [/^제주/, '제주'],
];

export function toSidoShort(sido: string): string | null {
  const hit = SIDO_SHORT.find(([re]) => re.test(sido.trim()));
  return hit ? hit[1] : null;
}

// 주소 문자열 앞부분에서 시·도, 시·군·구 추출 ('서울특별시 양천구 안양천로 ...')
export function parseRegionFromAddress(addr: string): { sido: string; sigungu: string } | null {
  const [sido, sigungu, maybeGu] = addr.trim().split(/\s+/);
  if (!sido || !sigungu) return null;
  // '수원시 장안구' 처럼 시 아래 구가 있는 경우
  const full = /시$/.test(sigungu) && maybeGu && /구$/.test(maybeGu) ? `${sigungu} ${maybeGu}` : sigungu;
  return { sido, sigungu: full };
}
