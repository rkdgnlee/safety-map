import type { Verdict } from '../constants/theme';

// ── 프록시 /api/report 응답 ───────────────────────────────────
export interface ApiRegion {
  sido: string;
  sigungu: string;
  dong?: string;
  source: 'query' | 'naver' | 'hospital';
}

export interface ApiWeatherSlot {
  time: string; // ISO, +09:00
  temp: number | null;
  sky: number | null;
  pty: number;
  rain1h: number;
  wind: number | null;
  humidity: number | null;
  lightning: number;
}

export interface ApiWarning {
  name: string;
  areas: string;
  exact: boolean;
}

export interface ApiAirQuality {
  station: string;
  pm10: number | null;
  pm25: number | null;
  pm10Grade: number | null;
  pm25Grade: number | null;
}

export interface ApiHospital {
  name: string;
  address: string;
  tel: string;
  distanceKm: number;
}

export interface ApiFireRisk {
  area: string;
  meanIndex: number;
  maxIndex: number;
  grade: '낮음' | '다소높음' | '높음' | '매우높음';
  analyzedAt: string;
}

export interface ApiCampsite {
  name: string;
  address: string;
  type: string;
  tel: string;
  distanceKm: number;
}

export interface ApiTide {
  station: string;
  distanceKm: number;
  events: { type: '만조' | '간조'; date: string; time: string; levelCm: number }[]; // 지금 이후 4개
}

export interface ApiFishingHalf {
  half: '오전' | '오후';
  index: string;
  maxWave: number;
  maxWind: number;
  waterTemp: number;
  species: { name: string; index: string }[];
}

export interface ApiFishing {
  point: string;
  distanceKm: number;
  tidePhase: string;
  halves: ApiFishingHalf[];
}

export interface ApiCrimeSample {
  maxLevel: number | null; // 반경 500m 안 가장 높은 단계 (1~10, 지도 색으로 추정)
  nearLevel: number | null; // 반경 100m
  coveredRatio: number;
}

export interface ApiFloodSample {
  atPoint: boolean;
  nearbyRatio: number; // 반경 300m 중 침수 예상 구역 비율
}

export interface ApiLandslideSample {
  worstGrade: number | null; // 1(가장 위험) ~ 5
}

export interface ApiReport {
  category: string;
  generatedAt: string;
  region: ApiRegion | null;
  weather: ApiWeatherSlot[];
  warnings: ApiWarning[];
  sun: { sunrise: string; sunset: string } | null;
  air: ApiAirQuality | null;
  hospitals: ApiHospital[];
  fireRisk: ApiFireRisk | null;
  nightLow: number | null;
  campsites: ApiCampsite[] | null;
  tide: ApiTide | null;
  fishing: ApiFishing | null;
  crime: ApiCrimeSample | null;
  flood: ApiFloodSample | null;
  landslide: ApiLandslideSample | null;
  errors: string[];
}

// ── 결과 화면이 그리는 모양 ────────────────────────────────────
export interface TimelineSlot {
  label: string; // '지금', '23시'
  date: string; // 'YYYY-MM-DD'
  hour: number;
  icon: string;
  temp: number | null;
  metric: string;
  verdict: Verdict;
}

export interface TimelineMarker {
  date: string; // 'YYYY-MM-DD'
  time: string; // 'HH:MM'
  label: string;
}

export interface Reason {
  icon: string;
  title: string;
  value: string;
  criterion: string;
  source: string;
  verdict: Verdict;
}

export interface MetricCard {
  title: string;
  grade: string;
  verdict: Verdict;
  ratio: number;
  desc: string;
}

export type CategoryDetail =
  | { kind: 'hiking'; sunrise: string | null; sunset: string | null; fire: ApiFireRisk | null }
  | { kind: 'camping'; nightLow: number | null; campsites: ApiCampsite[]; fire: ApiFireRisk | null }
  | { kind: 'fishing'; tide: ApiTide | null; fishing: ApiFishing | null }
  | { kind: 'night'; sunset: string | null; crime: ApiCrimeSample | null }
  | { kind: 'moving'; items: MetricCard[] };

export interface CategoryReport {
  verdict: Verdict;
  neutral: boolean; // 판정 대신 현황 요약 (밤길·이사)
  verdictText: string;
  headline: string;
  timeline?: { metricLabel: string; slots: TimelineSlot[]; markers: TimelineMarker[] };
  reasons: Reason[];
  passed: string[];
  unavailable: string[]; // 불러오지 못한 데이터
  detail: CategoryDetail;
  hospital: ApiHospital | null;
  sources: string[];
  isMock: boolean;
}
