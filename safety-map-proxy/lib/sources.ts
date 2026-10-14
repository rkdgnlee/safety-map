// 결과 화면에 쓰는 공공데이터 소스별 조회 + 정규화
import {
  asArray,
  cached,
  distanceKm,
  fetchPublicData,
  fetchPublicJson,
  kstParts,
  kstToIso,
  parseRegionFromAddress,
  parseXmlItems,
  toKmaGrid,
  toSidoShort,
} from './publicData';
import { TIDE_STATIONS } from './tideStations';

const MIN = 60_000;

export interface Region {
  sido: string;
  sigungu: string;
  dong?: string;
  source: 'query' | 'naver' | 'hospital';
}

// ── 날씨: 초단기실황(지금) + 초단기예보(6시간) ─────────────────
export interface WeatherSlot {
  time: string; // ISO (KST)
  temp: number | null;
  sky: number | null; // 1 맑음, 3 구름많음, 4 흐림 (실황에는 없음)
  pty: number; // 0 없음, 1 비, 2 비/눈, 3 눈, 5 빗방울, 6 빗방울눈날림, 7 눈날림
  rain1h: number; // mm
  wind: number | null; // m/s
  humidity: number | null;
  lightning: number; // 낙뢰 kA (0 = 없음)
}

// '강수없음' / '1mm 미만' / '1.0mm' / '30.0~50.0mm' / '50.0mm 이상' → mm
function parseRain(value: string | undefined): number {
  if (!value || value.includes('없음')) return 0;
  if (value.includes('미만')) return 0.5;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

const num = (v: string | undefined): number | null => {
  const n = parseFloat(v ?? '');
  return Number.isFinite(n) ? n : null;
};

function baseFor(now: Date, delayMin: number, minute: string) {
  const p = kstParts(new Date(now.getTime() - delayMin * MIN));
  return { base_date: p.ymd, base_time: `${String(p.hour).padStart(2, '0')}${minute}` };
}

export async function getWeather(lat: number, lng: number, now: Date): Promise<WeatherSlot[]> {
  const { nx, ny } = toKmaGrid(lat, lng);
  const ncstBase = baseFor(now, 40, '00'); // 매시 정각 발표, 40분 이후 조회 가능
  const fcstBase = baseFor(now, 45, '30'); // 매시 30분 발표, 45분 이후 조회 가능
  const common = { pageNo: 1, dataType: 'JSON', nx, ny };

  const [ncst, fcst] = await Promise.all([
    cached(`ncst:${nx},${ny},${ncstBase.base_date}${ncstBase.base_time}`, 10 * MIN, () =>
      fetchPublicJson('/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst', { ...common, numOfRows: 20, ...ncstBase }),
    ),
    cached(`fcst:${nx},${ny},${fcstBase.base_date}${fcstBase.base_time}`, 10 * MIN, () =>
      fetchPublicJson('/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst', { ...common, numOfRows: 60, ...fcstBase }),
    ),
  ]);

  const ncstItems = asArray<any>(ncst?.response?.body?.items?.item);
  const fcstItems = asArray<any>(fcst?.response?.body?.items?.item);
  if (fcstItems.length === 0) throw new Error(`초단기예보 응답 없음: ${fcst?.response?.header?.resultMsg}`);

  const nowValues = Object.fromEntries(ncstItems.map((i) => [i.category, i.obsrValue]));
  const slots: WeatherSlot[] = [];
  if (ncstItems.length > 0) {
    slots.push({
      time: kstToIso(ncstItems[0].baseDate, ncstItems[0].baseTime),
      temp: num(nowValues.T1H),
      sky: null,
      pty: num(nowValues.PTY) ?? 0,
      rain1h: num(nowValues.RN1) ?? 0,
      wind: num(nowValues.WSD),
      humidity: num(nowValues.REH),
      lightning: 0,
    });
  }

  const byTime = new Map<string, Record<string, string>>();
  for (const item of fcstItems) {
    const key = `${item.fcstDate}${item.fcstTime}`;
    byTime.set(key, { ...(byTime.get(key) ?? {}), [item.category]: item.fcstValue });
  }
  for (const [key, v] of [...byTime.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    slots.push({
      time: kstToIso(key.slice(0, 8), key.slice(8, 12)),
      temp: num(v.T1H),
      sky: num(v.SKY),
      pty: num(v.PTY) ?? 0,
      rain1h: parseRain(v.RN1),
      wind: num(v.WSD),
      humidity: num(v.REH),
      lightning: num(v.LGT) ?? 0,
    });
  }
  // 실황의 하늘상태는 다음 시각 예보값으로 채운다
  if (slots.length > 1 && slots[0].sky === null) slots[0].sky = slots[1].sky;
  return slots.slice(0, 7);
}

// ── 단기예보: 앞으로 12시간 최저기온 (캠핑 밤 기온) ──────────────
const VILAGE_BASE_HOURS = [2, 5, 8, 11, 14, 17, 20, 23];

export async function getNightLow(lat: number, lng: number, now: Date): Promise<number | null> {
  const { nx, ny } = toKmaGrid(lat, lng);
  const p = kstParts(new Date(now.getTime() - 15 * MIN)); // 발표 후 약 10분 뒤 제공
  let baseHour = [...VILAGE_BASE_HOURS].reverse().find((h) => h <= p.hour);
  let baseDate = p.ymd;
  if (baseHour === undefined) {
    baseHour = 23;
    baseDate = kstParts(new Date(now.getTime() - 24 * 60 * MIN)).ymd;
  }
  const base_time = `${String(baseHour).padStart(2, '0')}00`;

  const data = await cached(`vilage:${nx},${ny},${baseDate}${base_time}`, 30 * MIN, () =>
    fetchPublicJson('/1360000/VilageFcstInfoService_2.0/getVilageFcst', {
      pageNo: 1,
      numOfRows: 300,
      dataType: 'JSON',
      base_date: baseDate,
      base_time,
      nx,
      ny,
    }),
  );
  const until = now.getTime() + 12 * 60 * MIN;
  const temps = asArray<any>(data?.response?.body?.items?.item)
    .filter((i) => i.category === 'TMP')
    .filter((i) => {
      const t = new Date(kstToIso(i.fcstDate, i.fcstTime)).getTime();
      return t >= now.getTime() && t <= until;
    })
    .map((i) => parseFloat(i.fcstValue))
    .filter(Number.isFinite);
  return temps.length ? Math.min(...temps) : null;
}

// ── 기상특보 (현재 발효 중) ─────────────────────────────────────
export interface WarningMatch {
  name: string; // '강풍주의보'
  areas: string; // 원문 지역
  exact: boolean; // 시·군·구까지 일치했는지 (false = 같은 시·도 일부 지역)
}

// 괄호 안 쉼표는 무시하고 최상위 쉼표로만 나눈다
function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of text) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

const stripSuffix = (name: string) => name.replace(/(특별자치시|특별자치도|광역시|특별시|시|군|구|도)$/, '');

export async function getWarnings(region: Region | null): Promise<WarningMatch[]> {
  const data = await cached('pwnStatus', 10 * MIN, () =>
    fetchPublicJson('/1360000/WthrWrnInfoService/getPwnStatus', { pageNo: 1, numOfRows: 10, dataType: 'JSON' }),
  );
  const t6: string = asArray<any>(data?.response?.body?.items?.item)[0]?.t6 ?? '';
  if (!region || t6.includes('없음')) return [];

  const sidoShort = toSidoShort(region.sido);
  const sigunguKeys = region.sigungu.split(/\s+/).map(stripSuffix).filter(Boolean);
  const matches: WarningMatch[] = [];

  for (const line of t6.split(/\r?\n/)) {
    const m = line.match(/^o\s*([^:]+?)\s*:\s*(.+)$/);
    if (!m) continue;
    const [, name, areas] = m;
    for (const token of splitTopLevel(areas)) {
      const base = token.split('(')[0].trim();
      const inner = token.match(/\((.*)\)/)?.[1] ?? '';
      if (!sidoShort || toSidoShort(base) !== sidoShort) {
        // 시·도 이름 없이 시·군 이름만 나오는 경우
        if (sigunguKeys.some((k) => base.startsWith(k))) matches.push({ name, areas, exact: true });
        continue;
      }
      const exact = !inner || sigunguKeys.some((k) => inner.includes(k));
      matches.push({ name, areas, exact });
    }
  }
  // 같은 특보가 여러 토큰에 걸려 중복될 수 있어 이름 기준으로 하나만
  const unique = new Map<string, WarningMatch>();
  for (const w of matches) {
    const prev = unique.get(w.name);
    if (!prev || (!prev.exact && w.exact)) unique.set(w.name, w);
  }
  return [...unique.values()];
}

// ── 일출·일몰 ────────────────────────────────────────────────
export async function getSun(lat: number, lng: number, now: Date): Promise<{ sunrise: string; sunset: string } | null> {
  const { ymd } = kstParts(now);
  const rLat = lat.toFixed(2);
  const rLng = lng.toFixed(2);
  const data = await cached(`sun:${rLat},${rLng},${ymd}`, 6 * 60 * MIN, () =>
    fetchPublicJson('/B090041/openapi/service/RiseSetInfoService/getLCRiseSetInfo', {
      locdate: ymd,
      longitude: rLng,
      latitude: rLat,
      dnYn: 'Y',
      _type: 'json',
    }),
  );
  const item = asArray<any>(data?.response?.body?.items?.item)[0];
  if (!item) return null;
  const fmt = (v: string) => `${v.trim().slice(0, 2)}:${v.trim().slice(2, 4)}`;
  return { sunrise: fmt(String(item.sunrise)), sunset: fmt(String(item.sunset)) };
}

// ── 응급실 (가까운 순) ────────────────────────────────────────
export interface Hospital {
  name: string;
  address: string;
  tel: string;
  distanceKm: number;
}

export async function getHospitals(lat: number, lng: number): Promise<Hospital[]> {
  const rLat = lat.toFixed(3);
  const rLng = lng.toFixed(3);
  const xml = await cached(`er:${rLat},${rLng}`, 60 * MIN, () =>
    fetchPublicData('/B552657/ErmctInfoInqireService/getEgytLcinfoInqire', {
      WGS84_LON: rLng,
      WGS84_LAT: rLat,
      pageNo: 1,
      numOfRows: 3,
    }),
  );
  return parseXmlItems(xml).map((i) => ({
    name: i.dutyName,
    address: i.dutyAddr,
    tel: i.dutyTel1,
    distanceKm: Number(i.distance),
  }));
}

// ── 네이버 역지오코딩 (NCP 콘솔에서 Reverse Geocoding 사용 설정 필요) ──
export async function getRegionFromNaver(lat: number, lng: number): Promise<Region | null> {
  const id = process.env.NCP_MAPS_CLIENT_ID;
  const secret = process.env.NCP_MAPS_CLIENT_SECRET;
  if (!id || !secret) return null;
  const key = `rgc:${lat.toFixed(3)},${lng.toFixed(3)}`;
  return cached(key, 24 * 60 * MIN, async () => {
    const res = await fetch(
      `https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc?coords=${lng},${lat}&output=json&orders=admcode`,
      { headers: { 'x-ncp-apigw-api-key-id': id, 'x-ncp-apigw-api-key': secret } },
    );
    if (!res.ok) return null;
    const area = (await res.json())?.results?.[0]?.region;
    if (!area?.area1?.name) return null;
    return { sido: area.area1.name, sigungu: area.area2?.name ?? '', dong: area.area3?.name, source: 'naver' as const };
  });
}

export function regionFromHospital(hospitals: Hospital[]): Region | null {
  const parsed = hospitals[0] && parseRegionFromAddress(hospitals[0].address);
  return parsed ? { ...parsed, source: 'hospital' } : null;
}

// ── 대기질 (시·도 측정소 실시간) ───────────────────────────────
export interface AirQuality {
  station: string; // 측정소명 또는 '<시도> 평균'
  pm10: number | null;
  pm25: number | null;
  pm10Grade: number | null; // 1 좋음 2 보통 3 나쁨 4 매우나쁨
  pm25Grade: number | null;
}

const gradePm10 = (v: number) => (v <= 30 ? 1 : v <= 80 ? 2 : v <= 150 ? 3 : 4);
const gradePm25 = (v: number) => (v <= 15 ? 1 : v <= 35 ? 2 : v <= 75 ? 3 : 4);
const median = (values: number[]) => {
  const s = [...values].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : null;
};

export async function getAirQuality(region: Region | null): Promise<AirQuality | null> {
  const sidoShort = region && toSidoShort(region.sido);
  if (!sidoShort) return null;
  const data = await cached(`air:${sidoShort}`, 30 * MIN, () =>
    fetchPublicJson('/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty', {
      returnType: 'json',
      numOfRows: 200,
      pageNo: 1,
      sidoName: sidoShort,
      ver: '1.0',
    }),
  );
  const items = asArray<any>(data?.response?.body?.items);
  const sigunguKeys = region.sigungu.split(/\s+/).map(stripSuffix).filter(Boolean);
  const station = items.find((i) => sigunguKeys.some((k) => String(i.stationName).includes(k)) && num(i.pm10Value) !== null);
  if (station) {
    return {
      station: station.stationName,
      pm10: num(station.pm10Value),
      pm25: num(station.pm25Value),
      pm10Grade: num(station.pm10Grade),
      pm25Grade: num(station.pm25Grade),
    };
  }
  const pm10 = median(items.map((i) => num(i.pm10Value)).filter((v): v is number => v !== null));
  const pm25 = median(items.map((i) => num(i.pm25Value)).filter((v): v is number => v !== null));
  return {
    station: `${sidoShort} 평균`,
    pm10,
    pm25,
    pm10Grade: pm10 === null ? null : gradePm10(pm10),
    pm25Grade: pm25 === null ? null : gradePm25(pm25),
  };
}

// ── 산불위험 (시·군·구) ───────────────────────────────────────
export interface FireRisk {
  area: string;
  meanIndex: number;
  maxIndex: number;
  grade: '낮음' | '다소높음' | '높음' | '매우높음';
  analyzedAt: string;
}

const fireGrade = (index: number): FireRisk['grade'] =>
  index >= 86 ? '매우높음' : index >= 66 ? '높음' : index >= 51 ? '다소높음' : '낮음';

export async function getFireRisk(region: Region | null): Promise<FireRisk | null> {
  if (!region) return null;
  const data = await cached('fire:sigungu', 60 * MIN, () =>
    fetchPublicJson('/1400377/forestPointV2/forestPointListSigunguSearchV2', { pageNo: 1, numOfRows: 300, _type: 'json' }),
  );
  const items = asArray<any>(data?.response?.body?.items?.item);
  const sidoShort = toSidoShort(region.sido);
  const sigunguFirst = region.sigungu.split(/\s+/)[0];
  const hit = items.find(
    (i) => toSidoShort(String(i.doname)) === sidoShort && (i.sigun === sigunguFirst || region.sigungu.startsWith(i.sigun)),
  );
  if (!hit) return null;
  return {
    area: `${hit.doname} ${hit.sigun}`,
    meanIndex: Number(hit.meanavg),
    maxIndex: Number(hit.maxi),
    grade: fireGrade(Number(hit.meanavg)),
    analyzedAt: String(hit.analdate),
  };
}

// ── 캠핑장 (반경 20km) ────────────────────────────────────────
export interface Campsite {
  name: string;
  address: string;
  type: string;
  tel: string;
  distanceKm: number;
}

export async function getCampsites(lat: number, lng: number): Promise<Campsite[]> {
  const rLat = lat.toFixed(3);
  const rLng = lng.toFixed(3);
  const data = await cached(`camp:${rLat},${rLng}`, 6 * 60 * MIN, () =>
    fetchPublicJson('/B551011/GoCamping/locationBasedList', {
      numOfRows: 30,
      pageNo: 1,
      MobileOS: 'ETC',
      MobileApp: 'safetymap',
      mapX: rLng,
      mapY: rLat,
      radius: 20000,
      _type: 'json',
    }),
  );
  return asArray<any>(data?.response?.body?.items?.item)
    .map((i) => ({
      name: i.facltNm,
      address: i.addr1,
      type: i.induty,
      tel: i.tel ?? '',
      distanceKm: distanceKm(lat, lng, Number(i.mapY), Number(i.mapX)),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 3);
}

// ── 물때 (가장 가까운 조석 예보지점) ───────────────────────────
export interface Tide {
  station: string;
  distanceKm: number;
  // 지금 이후의 만조·간조 (오늘~내일)
  events: { type: '만조' | '간조'; date: string; time: string; levelCm: number }[];
}

export async function getTide(lat: number, lng: number, now: Date): Promise<Tide | null> {
  const nearest = TIDE_STATIONS.map((s) => ({ ...s, d: distanceKm(lat, lng, s.lat, s.lng) })).sort((a, b) => a.d - b.d)[0];
  if (!nearest) return null;
  // 저녁에 보면 오늘 물때가 다 지나서 내일 것까지 받는다
  const days = [kstParts(now).ymd, kstParts(new Date(now.getTime() + 24 * 60 * MIN)).ymd];
  const responses = await Promise.all(
    days.map((ymd) =>
      cached(`tide:${nearest.code}:${ymd}`, 6 * 60 * MIN, () =>
        fetchPublicJson('/1192136/tideFcstHghLw/GetTideFcstHghLwApiService', {
          pageNo: 1,
          numOfRows: 10,
          type: 'json',
          obsCode: nearest.code,
          reqDate: ymd,
        }),
      ),
    ),
  );
  const nowIso = kstToIso(days[0], `${String(kstParts(now).hour).padStart(2, '0')}${String(kstParts(now).minute).padStart(2, '0')}`);
  const raw = responses
    .flatMap((data) => asArray<any>(data?.body?.items?.item))
    .map((i) => ({
      date: String(i.predcDt).slice(0, 10),
      time: String(i.predcDt).slice(11, 16),
      levelCm: Number(i.predcTdlvVl),
    }));
  // extrSe 코드는 하루 순번까지 섞여 있어(1~4) 앞뒤 조위와 비교해 만조/간조를 판별한다
  const events = raw.map((e, idx) => {
    const neighbor = raw[idx + 1] ?? raw[idx - 1];
    const type: '만조' | '간조' = neighbor && e.levelCm > neighbor.levelCm ? '만조' : '간조';
    return { type, ...e };
  });
  const upcoming = events.filter((e) => `${e.date}T${e.time}:00+09:00` >= nowIso).slice(0, 4);
  return { station: nearest.name, distanceKm: nearest.d, events: upcoming };
}

// ── 바다낚시지수 (가장 가까운 낚시 지점, 오늘 오전·오후) ─────────
export interface FishingHalf {
  half: '오전' | '오후';
  index: string; // 매우좋음 ~ 매우나쁨 (어종 중 가장 많은 값)
  maxWave: number;
  maxWind: number;
  waterTemp: number;
  species: { name: string; index: string }[];
}

export interface Fishing {
  point: string;
  distanceKm: number;
  tidePhase: string; // '대조기' 등
  halves: FishingHalf[];
}

const FISHING_PAGE_SIZE = 300; // 이 API 는 한 페이지 최대 300건

async function getAllFishingRows(): Promise<any[]> {
  return cached('fishing:all', 60 * MIN, async () => {
    const page = (pageNo: number) =>
      fetchPublicJson('/1192136/fcstFishingv2/GetFcstFishingApiServicev2', {
        pageNo,
        numOfRows: FISHING_PAGE_SIZE,
        type: 'json',
        gubun: '선상',
      });
    const first = await page(1);
    const total = Number(first?.body?.totalCount ?? 0);
    const pages = Math.ceil(total / FISHING_PAGE_SIZE);
    const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, i) => page(i + 2)));
    return [first, ...rest].flatMap((p) => asArray<any>(p?.body?.items?.item));
  });
}

export async function getFishing(lat: number, lng: number, now: Date): Promise<Fishing | null> {
  const { ymd } = kstParts(now);
  const today = `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
  const rows = (await getAllFishingRows()).filter((r) => r.predcYmd === today);
  if (rows.length === 0) return null;

  const points = new Map<string, { lat: number; lng: number }>();
  for (const r of rows) points.set(r.seafsPstnNm, { lat: Number(r.lat), lng: Number(r.lot) });
  const [point, coord] = [...points.entries()].sort(
    ([, a], [, b]) => distanceKm(lat, lng, a.lat, a.lng) - distanceKm(lat, lng, b.lat, b.lng),
  )[0];

  const mine = rows.filter((r) => r.seafsPstnNm === point);
  const halves: FishingHalf[] = (['오전', '오후'] as const)
    .map((half) => {
      const hRows = mine.filter((r) => r.predcNoonSeCd === half);
      if (hRows.length === 0) return null;
      const counts = new Map<string, number>();
      for (const r of hRows) counts.set(r.totalIndex, (counts.get(r.totalIndex) ?? 0) + 1);
      const index = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
      return {
        half,
        index,
        maxWave: Math.max(...hRows.map((r) => Number(r.maxWvhgt))),
        maxWind: Math.max(...hRows.map((r) => Number(r.maxWspd))),
        waterTemp: Number(hRows[0].maxWtem),
        species: hRows.map((r) => ({ name: r.seafsTgfshNm, index: r.totalIndex })),
      };
    })
    .filter((h): h is FishingHalf => h !== null);

  return {
    point,
    distanceKm: distanceKm(lat, lng, coord.lat, coord.lng),
    tidePhase: mine[0]?.tdlvHrCn ?? '',
    halves,
  };
}
