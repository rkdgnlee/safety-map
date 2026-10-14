// 프록시 응답(ApiReport) → 결과 화면 모델(CategoryReport)
// 판정 기준은 아래 THRESHOLDS 한 곳에서 조정한다.
import type { CategoryId } from '../constants/categories';
import { VERDICT_TONE, type Verdict } from '../constants/theme';
import type {
  ApiReport,
  ApiWeatherSlot,
  CategoryDetail,
  CategoryReport,
  Reason,
  TimelineMarker,
  TimelineSlot,
} from '../types/report';

type LiveCategory = Exclude<CategoryId, 'moving'>;

const THRESHOLDS: Record<LiveCategory, { windCaution: number; windBad: number }> = {
  hiking: { windCaution: 10, windBad: 14 }, // 능선·정상 기준
  camping: { windCaution: 7, windBad: 10 }, // 타프·텐트 기준
  fishing: { windCaution: 8, windBad: 12 }, // 선상·갯바위 기준
  night: { windCaution: 10, windBad: 14 },
};
const RAIN_BAD_MM = 5; // 시간당 5mm 이상이면 비추천
const WAVE_CAUTION_M = 1.5;
const WAVE_BAD_M = 2.5;
const NIGHT_LOW_CAUTION = 0; // 캠핑 밤 최저 0°C 이하
const NIGHT_LOW_BAD = -10;
const SUNSET_SOON_MIN = 120; // 등산: 일몰 2시간 전부터 주의

const SOURCE_LABEL: Record<string, string> = {
  weather: '날씨',
  warnings: '기상특보',
  sun: '일출·일몰',
  air: '미세먼지',
  hospitals: '응급실',
  fireRisk: '산불위험',
  nightLow: '밤 최저기온',
  campsites: '캠핑장',
  tide: '물때',
  fishing: '바다낚시지수',
  region: '지역 확인',
};

const rank: Record<Verdict, number> = { good: 0, caution: 1, bad: 2 };
const worse = (a: Verdict, b: Verdict): Verdict => (rank[a] >= rank[b] ? a : b);

const hourOf = (iso: string) => Number(iso.slice(11, 13));
const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const isRaining = (s: ApiWeatherSlot) => s.pty > 0 || s.rain1h > 0;

function isNightHour(hour: number, sun: ApiReport['sun']): boolean {
  if (!sun) return hour < 6 || hour >= 19;
  const m = hour * 60 + 30;
  return m < toMinutes(sun.sunrise) || m >= toMinutes(sun.sunset);
}

function weatherIcon(s: ApiWeatherSlot, night: boolean): string {
  if (s.lightning > 0) return '⛈️';
  if (s.pty === 3 || s.pty === 7) return '❄️';
  if (s.pty === 2 || s.pty === 6) return '🌨️';
  if (s.pty === 1) return '🌧️';
  if (s.pty === 5) return '🌦️';
  if (s.sky === 4) return '☁️';
  if (s.sky === 3) return night ? '☁️' : '⛅';
  return night ? '🌙' : '☀️';
}

function slotVerdict(category: LiveCategory, s: ApiWeatherSlot): Verdict {
  const t = THRESHOLDS[category];
  let v: Verdict = 'good';
  if (s.lightning > 0 || s.rain1h >= RAIN_BAD_MM) v = 'bad';
  else if (isRaining(s)) v = 'caution';
  if (s.wind !== null) {
    if (s.wind >= t.windBad) v = worse(v, 'bad');
    else if (s.wind >= t.windCaution) v = worse(v, 'caution');
  }
  return v;
}

function buildTimeline(category: LiveCategory, api: ApiReport): CategoryReport['timeline'] {
  if (api.weather.length === 0) return undefined;
  const slots: TimelineSlot[] = api.weather.map((s, i) => {
    const hour = hourOf(s.time);
    return {
      label: i === 0 ? '지금' : `${hour}시`,
      date: s.time.slice(0, 10),
      hour,
      icon: weatherIcon(s, isNightHour(hour, api.sun)),
      temp: s.temp === null ? null : Math.round(s.temp),
      metric: s.rain1h > 0 ? `${s.rain1h < 1 ? '<1' : s.rain1h}mm` : s.wind === null ? '-' : `${s.wind}m/s`,
      verdict: slotVerdict(category, s),
    };
  });
  const markers: TimelineMarker[] = [];
  const today = api.weather[0].time.slice(0, 10);
  if (api.sun) {
    markers.push({ date: today, time: api.sun.sunset, label: '🌇 일몰' }, { date: today, time: api.sun.sunrise, label: '🌅 일출' });
  }
  for (const e of api.tide?.events ?? []) {
    markers.push({ date: e.date, time: e.time, label: e.type === '만조' ? '🌊 만조' : '🏖️ 간조' });
  }
  return { metricLabel: '풍속 (비가 오면 강수량)', slots, markers };
}

// 날씨 기반 이유 (강풍·비·낙뢰)
function weatherReasons(category: LiveCategory, api: ApiReport, reasons: Reason[], passed: string[]) {
  const slots = api.weather;
  if (slots.length === 0) return;
  const t = THRESHOLDS[category];
  const source = '기상청 초단기예보';

  const lightning = slots.find((s) => s.lightning > 0);
  if (lightning) {
    reasons.push({
      icon: '⚡',
      title: '낙뢰 예보',
      value: `${hourOf(lightning.time)}시`,
      criterion: '낙뢰가 예보되면 야외 활동 비추천',
      source,
      verdict: 'bad',
    });
  }

  const windiest = slots.reduce((a, b) => ((b.wind ?? 0) > (a.wind ?? 0) ? b : a));
  const maxWind = windiest.wind ?? 0;
  if (maxWind >= t.windCaution) {
    reasons.push({
      icon: '🌬️',
      title: '강한 바람',
      value: `최대 ${maxWind}m/s (${hourOf(windiest.time)}시)`,
      criterion: `${t.windCaution}m/s 이상 주의 · ${t.windBad}m/s 이상 비추천`,
      source,
      verdict: maxWind >= t.windBad ? 'bad' : 'caution',
    });
  } else {
    passed.push(`바람 약함 · 최대 ${maxWind}m/s`);
  }

  const firstRain = slots.find(isRaining);
  if (firstRain) {
    const maxRain = Math.max(...slots.map((s) => s.rain1h));
    reasons.push({
      icon: '🌧️',
      title: '비 소식',
      value: `${hourOf(firstRain.time)}시부터 · 시간당 최대 ${maxRain < 1 ? '1mm 미만' : `${maxRain}mm`}`,
      criterion: `비가 오면 주의 · 시간당 ${RAIN_BAD_MM}mm 이상 비추천`,
      source,
      verdict: maxRain >= RAIN_BAD_MM ? 'bad' : 'caution',
    });
  } else {
    passed.push('앞으로 6시간 비 소식 없음');
  }
}

function commonReasons(category: LiveCategory, api: ApiReport, reasons: Reason[], passed: string[]) {
  if (api.warnings.length === 0) {
    if (!api.errors.includes('warnings')) passed.push('발효 중인 기상특보 없음');
  }
  for (const w of api.warnings) {
    reasons.push({
      icon: '📢',
      title: w.name,
      value: w.exact ? '이 지역 발효 중' : '같은 시·도 일부 지역 발효 중',
      criterion: w.areas,
      source: '기상청 기상특보',
      verdict: w.exact && w.name.includes('경보') ? 'bad' : 'caution',
    });
  }

  if (category !== 'night' && api.air) {
    const grade = Math.max(api.air.pm10Grade ?? 0, api.air.pm25Grade ?? 0);
    const label = ['', '좋음', '보통', '나쁨', '매우나쁨'][grade] ?? '-';
    if (grade >= 3) {
      reasons.push({
        icon: '😷',
        title: `미세먼지 ${label}`,
        value: `PM10 ${api.air.pm10 ?? '-'} · PM2.5 ${api.air.pm25 ?? '-'}㎍/㎥`,
        criterion: `'나쁨' 이상이면 주의 · ${api.air.station} 측정소`,
        source: '에어코리아',
        verdict: grade >= 4 ? 'bad' : 'caution',
      });
    } else if (grade > 0) {
      passed.push(`미세먼지 ${label} (${api.air.station})`);
    }
  }
}

function fireReason(api: ApiReport, reasons: Reason[], passed: string[]) {
  const fire = api.fireRisk;
  if (!fire) return;
  if (fire.grade === '높음' || fire.grade === '매우높음') {
    reasons.push({
      icon: '🔥',
      title: `산불위험 ${fire.grade}`,
      value: `평균 지수 ${fire.meanIndex} · 최대 ${fire.maxIndex}`,
      criterion: `66 이상 주의 · 86 이상 비추천 (${fire.area})`,
      source: '산림청 산불위험예보',
      verdict: fire.grade === '매우높음' ? 'bad' : 'caution',
    });
  } else {
    passed.push(`산불위험 ${fire.grade} (${fire.area})`);
  }
}

function buildDetail(category: LiveCategory, api: ApiReport): CategoryDetail {
  switch (category) {
    case 'hiking':
      return { kind: 'hiking', sunrise: api.sun?.sunrise ?? null, sunset: api.sun?.sunset ?? null, fire: api.fireRisk };
    case 'camping':
      return { kind: 'camping', nightLow: api.nightLow, campsites: api.campsites ?? [], fire: api.fireRisk };
    case 'fishing':
      return { kind: 'fishing', tide: api.tide, fishing: api.fishing };
    case 'night':
      return { kind: 'night', sunset: api.sun?.sunset ?? null };
  }
}

const SOURCES: Record<LiveCategory, string[]> = {
  hiking: ['기상청 초단기예보·기상특보', '에어코리아', '한국천문연구원 출몰시각', '산림청 산불위험예보', '국립중앙의료원'],
  camping: ['기상청 초단기예보·단기예보·기상특보', '에어코리아', '산림청 산불위험예보', '한국관광공사 고캠핑', '국립중앙의료원'],
  fishing: ['기상청 초단기예보·기상특보', '에어코리아', '국립해양조사원 조석예보·바다낚시지수', '국립중앙의료원'],
  night: ['기상청 초단기예보·기상특보', '한국천문연구원 출몰시각', '국립중앙의료원', '생활안전정보 범죄주의구간'],
};

export function buildCategoryReport(category: LiveCategory, api: ApiReport, now: Date): CategoryReport {
  const reasons: Reason[] = [];
  const passed: string[] = [];

  weatherReasons(category, api, reasons, passed);
  commonReasons(category, api, reasons, passed);

  if (category === 'hiking') {
    fireReason(api, reasons, passed);
    if (api.sun) {
      const left = toMinutes(api.sun.sunset) - (now.getHours() * 60 + now.getMinutes());
      const beforeSunrise = now.getHours() * 60 + now.getMinutes() < toMinutes(api.sun.sunrise);
      if (left <= SUNSET_SOON_MIN || beforeSunrise) {
        reasons.push({
          icon: '🌇',
          title: left <= 0 || beforeSunrise ? '해가 진 시간' : '일몰 임박',
          value: `일몰 ${api.sun.sunset} · 일출 ${api.sun.sunrise}`,
          criterion: '일몰 2시간 전부터는 하산 시간을 고려해 주의',
          source: '한국천문연구원',
          verdict: 'caution',
        });
      } else {
        passed.push(`일몰 ${api.sun.sunset}까지 ${Math.floor(left / 60)}시간 ${left % 60}분`);
      }
    }
  }

  if (category === 'camping') {
    fireReason(api, reasons, passed);
    if (api.nightLow !== null) {
      if (api.nightLow <= NIGHT_LOW_CAUTION) {
        reasons.push({
          icon: '🥶',
          title: '영하권 밤 기온',
          value: `최저 ${api.nightLow}°C`,
          criterion: `${NIGHT_LOW_CAUTION}°C 이하 주의 · ${NIGHT_LOW_BAD}°C 이하 비추천`,
          source: '기상청 단기예보',
          verdict: api.nightLow <= NIGHT_LOW_BAD ? 'bad' : 'caution',
        });
      } else {
        passed.push(`밤 최저기온 ${api.nightLow}°C`);
      }
    }
  }

  if (category === 'fishing' && api.fishing) {
    const half = api.fishing.halves.find((h) => h.half === (now.getHours() < 12 ? '오전' : '오후')) ?? api.fishing.halves[0];
    if (half) {
      if (half.index === '나쁨' || half.index === '매우나쁨') {
        reasons.push({
          icon: '🎣',
          title: `바다낚시지수 ${half.index}`,
          value: `${api.fishing.point} · ${half.half}`,
          criterion: "'나쁨' 이상이면 주의",
          source: '국립해양조사원 바다낚시지수',
          verdict: half.index === '매우나쁨' ? 'bad' : 'caution',
        });
      } else {
        passed.push(`바다낚시지수 ${half.index} (${api.fishing.point} ${half.half})`);
      }
      if (half.maxWave >= WAVE_CAUTION_M) {
        reasons.push({
          icon: '🌊',
          title: '높은 물결',
          value: `최대 파고 ${half.maxWave}m`,
          criterion: `${WAVE_CAUTION_M}m 이상 주의 · ${WAVE_BAD_M}m 이상 비추천`,
          source: '국립해양조사원 바다낚시지수',
          verdict: half.maxWave >= WAVE_BAD_M ? 'bad' : 'caution',
        });
      } else {
        passed.push(`파고 최대 ${half.maxWave}m`);
      }
    }
  }

  // 비추천 → 주의 순으로 정렬
  reasons.sort((a, b) => rank[b.verdict] - rank[a.verdict]);
  const verdict = reasons.reduce<Verdict>((v, r) => worse(v, r.verdict), 'good');
  const unavailable = api.errors.map((e) => SOURCE_LABEL[e] ?? e);
  const neutral = category === 'night';

  return {
    verdict,
    neutral,
    verdictText: neutral
      ? '지금 이 시간'
      : verdict === 'good'
        ? '좋음'
        : `${VERDICT_TONE[verdict].label} · 확인할 점 ${reasons.length}개`,
    headline: buildHeadline(category, api, reasons, now),
    timeline: buildTimeline(category, api),
    reasons,
    passed,
    unavailable,
    detail: buildDetail(category, api),
    hospital: api.hospitals[0] ?? null,
    sources: SOURCES[category],
    isMock: false,
  };
}

function buildHeadline(category: LiveCategory, api: ApiReport, reasons: Reason[], now: Date): string {
  const nowSlot = api.weather[0];
  const nowTemp = nowSlot?.temp !== null && nowSlot?.temp !== undefined ? `${Math.round(nowSlot.temp)}°C` : null;

  if (category === 'night') {
    const parts = [nowTemp ? `지금 ${nowTemp}` : '지금 날씨 정보 없음'];
    if (reasons.length > 0) parts.push(`${reasons[0].title} · ${reasons[0].value}`);
    else if (api.sun) {
      const sinceSunset = now.getHours() * 60 + now.getMinutes() - toMinutes(api.sun.sunset);
      parts.push(
        sinceSunset > 0
          ? `해가 진 지 ${Math.floor(sinceSunset / 60)}시간 ${sinceSunset % 60}분 지났어요`
          : `일몰은 ${api.sun.sunset}이에요`,
      );
    }
    return parts.join('\n');
  }

  if (reasons.length > 0) {
    const [first, second] = reasons;
    return [`${first.title} · ${first.value}`, second ? `${second.title}도 확인해 주세요` : '아래에서 자세한 이유를 확인해 보세요'].join('\n');
  }

  switch (category) {
    case 'hiking':
      return `지금 기준 주의할 점이 없어요\n${api.sun ? `일몰 ${api.sun.sunset} 전 하산을 계획해 보세요` : '하산 시간을 미리 정해 두세요'}`;
    case 'camping':
      return `밤까지 큰 위험 요소가 없어요\n${api.nightLow !== null ? `밤 최저기온은 ${api.nightLow}°C예요` : '밤 기온을 확인해 보세요'}`;
    case 'fishing': {
      const nextHigh = api.tide?.events.find((e) => e.type === '만조');
      const isTomorrow = nextHigh && nextHigh.date !== api.weather[0]?.time.slice(0, 10);
      return `바람과 물결이 잔잔한 편이에요\n${nextHigh ? `다음 만조는 ${isTomorrow ? '내일 ' : ''}${nextHigh.time}이에요` : '물때를 확인해 보세요'}`;
    }
  }
}
