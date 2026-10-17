import { useEffect, useRef, useState } from 'react';
import { CATEGORIES, getCategory, type CategoryId, type Place } from '../constants/categories';
import { COLORS, SCREEN_STYLE, VERDICT_TONE, type Verdict } from '../constants/theme';
import { buildCategoryReport } from '../services/reportBuilder';
import { fetchReport } from '../services/reportService';
import type { ApiHospital, CategoryDetail, CategoryReport, TimelineMarker, TimelineSlot } from '../types/report';
import { ChevronDown, ChevronUp, Search } from '../components/icons';
import ResultMiniMap, { type MiniMapLayerId } from '../components/ResultMiniMap';
import { BANNER_AD_GROUP_ID, DWELL_AD_SCROLL_RATIO, DWELL_AD_SECONDS } from '../constants/ads';
import BannerAdComponent from './BannerAdComponent';

interface ResultScreenProps {
  categoryId: CategoryId;
  place: Place;
  onChangeCategory: (id: CategoryId) => void;
  onOpenMap: (layer: MiniMapLayerId) => void;
  onSearchPlace: () => void; // 같은 카테고리로 다른 장소 보기
  onEngaged: () => void; // 결과를 오래·깊이 읽었을 때 한 번 호출
}

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'done'; report: CategoryReport; at: Date };

const pad = (n: number) => String(n).padStart(2, '0');
const formatClock = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;
const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const formatKm = (km: number) => (km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`);

const FISHING_INDEX_VERDICT: Record<string, Verdict> = {
  매우좋음: 'good',
  좋음: 'good',
  보통: 'caution',
  나쁨: 'bad',
  매우나쁨: 'bad',
};

// 결과를 DWELL_AD_SECONDS 이상 보거나, 화면의 DWELL_AD_SCROLL_RATIO 이상까지 스크롤하면 onEngaged 를 한 번 부른다
function useReadingEngagement(active: boolean, resetKey: string, onEngaged: () => void) {
  const onEngagedRef = useRef(onEngaged);
  onEngagedRef.current = onEngaged;

  useEffect(() => {
    if (!active) return;
    let fired = false;
    const fire = () => {
      if (fired) return;
      fired = true;
      onEngagedRef.current();
    };
    // 사용자가 직접 스크롤했을 때만 판단 (화면이 짧아 처음부터 끝이 보이는 경우는 시간 조건으로만)
    const handleScroll = () => {
      const doc = document.documentElement;
      const ratio = (window.scrollY + window.innerHeight) / Math.max(doc.scrollHeight, 1);
      if (window.scrollY > 0 && ratio >= DWELL_AD_SCROLL_RATIO) fire();
    };
    const timer = setTimeout(fire, DWELL_AD_SECONDS * 1000);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [active, resetKey]);
}

function useCategoryReport(categoryId: CategoryId, place: Place, retryKey: number): LoadState {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    fetchReport(categoryId, place)
      .then((api) => {
        if (cancelled) return;
        const at = new Date();
        setState({ status: 'done', report: buildCategoryReport(categoryId, api, at), at });
      })
      .catch((err) => {
        console.error('[report] 불러오기 실패:', err);
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [categoryId, place, retryKey]);

  return state;
}

export default function ResultScreen({
  categoryId,
  place,
  onChangeCategory,
  onOpenMap,
  onSearchPlace,
  onEngaged,
}: ResultScreenProps) {
  const category = getCategory(categoryId);
  const [retryKey, setRetryKey] = useState(0);
  const state = useCategoryReport(categoryId, place, retryKey);
  useReadingEngagement(state.status === 'done', `${categoryId}:${place.lat},${place.lng}`, onEngaged);

  // 카테고리·장소가 바뀌면 맨 위부터 보여준다
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [categoryId, place]);

  return (
    <main style={SCREEN_STYLE}>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { scrollbar-width: none; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }
      `}</style>

      {/* 상단 내비게이션(뒤로가기)은 토스가 그려주므로 화면 안에는 그리지 않는다 */}
      <div className="no-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', margin: '0 -20px', padding: '0 20px' }}>
        {CATEGORIES.map((c) => {
          const active = c.id === categoryId;
          return (
            <button
              key={c.id}
              onClick={() => onChangeCategory(c.id)}
              style={{
                flexShrink: 0,
                minHeight: '44px',
                padding: '0 14px',
                border: 'none',
                borderRadius: '22px',
                backgroundColor: active ? COLORS.primary : COLORS.surfaceStrong,
                color: active ? '#ffffff' : COLORS.textSub,
                fontSize: '15px',
                fontWeight: active ? 600 : 500,
                cursor: 'pointer',
              }}
            >
              {c.emoji} {c.name}
            </button>
          );
        })}
      </div>

      <header style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <h1 style={{ margin: 0, minWidth: 0, fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.35 }}>
            {categoryId === 'moving' ? `${place.label} 안전 리포트` : place.label}
          </h1>
          <button
            onClick={onSearchPlace}
            style={{
              ...textButtonStyle,
              flexShrink: 0,
              gap: '4px',
              padding: '0 12px',
              borderRadius: '22px',
              backgroundColor: COLORS.surfaceStrong,
              color: COLORS.textSub,
              fontSize: '15px',
              fontWeight: 500,
            }}
          >
            <Search size={16} />
            장소 변경
          </button>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: '13px', color: COLORS.textHint }}>
          {state.status === 'done' ? `${formatClock(state.at)} 기준` : '불러오는 중'}
          {state.status === 'done' && state.report.regionLabel && ` · ${state.report.regionLabel}`} · {category.emoji} {category.name}
          {state.status === 'done' && state.report.isMock && (
            <span style={{ marginLeft: '6px', color: COLORS.primary }}>· 예시 데이터</span>
          )}
        </p>
      </header>

      {state.status === 'loading' && <LoadingBlocks />}

      {state.status === 'error' && (
        <section style={{ ...panelStyle, marginTop: '24px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>정보를 불러오지 못했어요</p>
          <p style={{ margin: '8px 0 16px', fontSize: '13px', color: COLORS.textMuted }}>네트워크를 확인하고 다시 시도해 주세요</p>
          <button
            onClick={() => setRetryKey((k) => k + 1)}
            style={{ height: '44px', padding: '0 20px', border: 'none', borderRadius: '12px', backgroundColor: COLORS.primary, color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
          >
            다시 시도
          </button>
        </section>
      )}

      {state.status === 'done' && (
        <ReportBody
          report={state.report}
          now={state.at}
          center={place}
          onOpenMap={onOpenMap}
        />
      )}

      <div style={{ marginTop: '28px' }}>
        <BannerAdComponent adGroupId={BANNER_AD_GROUP_ID} />
      </div>
      <p style={{ margin: '20px 0 0', textAlign: 'center', fontSize: '13px', color: '#a0a8b2' }}>
        참고용 정보이며 현장 상황과 다를 수 있어요
      </p>
    </main>
  );
}

interface MapProps {
  center: { lat: number; lng: number };
  onOpenMap: (layer: MiniMapLayerId) => void;
}

function ReportBody({ report, now, center, onOpenMap }: { report: CategoryReport; now: Date } & MapProps) {
  return (
    <>
      <VerdictCard report={report} />

      {report.unavailable.length > 0 && (
        <p style={{ margin: '12px 0 0', fontSize: '13px', color: COLORS.textHint }}>
          {report.unavailable.join(', ')} 정보를 지금 불러오지 못해 판정에서 빠졌어요
        </p>
      )}

      {report.timeline && (
        <section style={{ marginTop: '32px' }}>
          <h2 style={sectionTitleStyle}>앞으로 6시간</h2>
          <Timeline {...report.timeline} />
        </section>
      )}

      <DetailSection detail={report.detail} now={now} center={center} onOpenMap={onOpenMap} />

      {(report.reasons.length > 0 || report.passed.length > 0) && <ReasonList report={report} />}

      {report.hospital && <HospitalCard hospital={report.hospital} />}

      <section style={{ marginTop: '32px' }}>
        <h2 style={{ ...sectionTitleStyle, fontSize: '15px', marginBottom: '8px' }}>데이터 출처</h2>
        <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.7, color: COLORS.textHint }}>{report.sources.join(' · ')}</p>
      </section>
    </>
  );
}

function LoadingBlocks() {
  const block = (height: number, marginTop: number) => (
    <div style={{ height, marginTop, borderRadius: '16px', backgroundColor: COLORS.surface, animation: 'pulse 1.2s ease-in-out infinite' }} />
  );
  return (
    <div aria-label="불러오는 중">
      {block(110, 24)}
      {block(150, 32)}
      {block(120, 32)}
    </div>
  );
}

function VerdictCard({ report }: { report: CategoryReport }) {
  const tone = VERDICT_TONE[report.verdict];
  return (
    <section
      style={{
        marginTop: '24px',
        padding: '20px',
        borderRadius: '16px',
        backgroundColor: report.neutral ? COLORS.primarySoft : tone.bg,
      }}
    >
      <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: report.neutral ? COLORS.primary : tone.text }}>
        {report.verdictText}
      </p>
      <h2 style={{ margin: '8px 0 0', fontSize: '19px', fontWeight: 700, lineHeight: 1.5, whiteSpace: 'pre-line' }}>
        {report.headline}
      </h2>
    </section>
  );
}

function Timeline({ slots, markers, metricLabel }: { slots: TimelineSlot[]; markers: TimelineMarker[]; metricLabel: string }) {
  // 처음으로 '주의/비추천'이 되는 칸을 강조해서 언제부터 나빠지는지 보이게
  const firstWarning = slots.findIndex((s) => s.verdict !== 'good');

  return (
    <div className="no-scrollbar" style={{ overflowX: 'auto', margin: '0 -20px', padding: '0 20px 4px' }}>
      <div style={{ display: 'flex', gap: '8px', width: 'max-content' }}>
        {slots.map((slot, index) => {
          const tone = VERDICT_TONE[slot.verdict];
          // 지금 칸은 관측 시각이라 마커를 붙이지 않는다
          const slotMarkers = index === 0 ? [] : markers.filter((m) => m.date === slot.date && Number(m.time.slice(0, 2)) === slot.hour);
          const highlighted = index === firstWarning;
          return (
            <div
              key={`${slot.label}-${index}`}
              style={{
                width: '72px',
                padding: '12px 0',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: highlighted ? tone.bg : COLORS.surface,
                boxShadow: highlighted ? `inset 0 0 0 1px ${tone.ring}` : 'none',
              }}
            >
              <span style={{ fontSize: '13px', color: COLORS.textHint }}>{slot.label}</span>
              <span style={{ fontSize: '20px' }}>{slot.icon}</span>
              <strong style={{ fontSize: '15px' }}>{slot.temp === null ? '-' : `${slot.temp}°`}</strong>
              <span style={{ fontSize: '13px', color: COLORS.textMuted }}>{slot.metric}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '13px', color: tone.text }}>
                <i style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: tone.dot }} />
                {tone.label}
              </span>
              {slotMarkers.map((m) => (
                <span key={m.label} style={{ fontSize: '13px', color: COLORS.textSub, textAlign: 'center' }}>
                  {m.label}
                  <br />
                  {m.time}
                </span>
              ))}
            </div>
          );
        })}
      </div>
      <p style={{ margin: '8px 0 0', fontSize: '13px', color: COLORS.textHint }}>시간대별 아래 수치는 {metricLabel}예요</p>
    </div>
  );
}

function ReasonList({ report }: { report: CategoryReport }) {
  const [showPassed, setShowPassed] = useState(report.reasons.length === 0);
  const title = report.reasons.length > 0 ? `왜 ${VERDICT_TONE[report.verdict].label}인가요?` : '확인한 항목';

  return (
    <section style={{ marginTop: '32px' }}>
      <h2 style={sectionTitleStyle}>{title}</h2>
      <div style={{ borderRadius: '16px', backgroundColor: COLORS.surface, padding: '0 16px' }}>
        {report.reasons.map((reason) => (
          <div key={reason.title} style={{ display: 'flex', gap: '12px', padding: '16px 0', borderBottom: `1px solid #e9ebee` }}>
            <span aria-hidden>{reason.icon}</span>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>
                {reason.title} <span style={{ fontWeight: 400, color: COLORS.textMuted }}>· {reason.value}</span>
                <span style={{ marginLeft: '6px', fontSize: '13px', fontWeight: 600, color: VERDICT_TONE[reason.verdict].text }}>
                  {VERDICT_TONE[reason.verdict].label}
                </span>
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '13px', lineHeight: 1.6, color: COLORS.textHint }}>
                {reason.criterion} · {reason.source}
              </p>
            </div>
          </div>
        ))}
        {report.passed.length > 0 && (
          <>
            <button
              onClick={() => setShowPassed((v) => !v)}
              style={{ ...textButtonStyle, width: '100%', justifyContent: 'space-between', padding: '14px 0', fontSize: '13px', color: COLORS.textMuted }}
            >
              <span>문제 없음 {report.passed.length}개</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>{showPassed ? '접기' : '펼치기'}{showPassed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
            </button>
            {showPassed && (
              <ul style={{ margin: 0, padding: '0 0 14px', listStyle: 'none' }}>
                {report.passed.map((item) => (
                  <li key={item} style={{ padding: '4px 0', fontSize: '13px', color: COLORS.textSub }}>
                    ✓ {item}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function HospitalCard({ hospital }: { hospital: ApiHospital }) {
  return (
    <section style={{ ...panelStyle, marginTop: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '13px', color: COLORS.textHint }}>가까운 응급의료기관 · {formatKm(hospital.distanceKm)}</p>
        <p style={{ margin: '4px 0 0', fontSize: '15px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {hospital.name}
        </p>
      </div>
      {hospital.tel && (
        <a
          href={`tel:${hospital.tel}`}
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            height: '40px',
            padding: '0 14px',
            borderRadius: '10px',
            backgroundColor: COLORS.bg,
            color: COLORS.primary,
            fontSize: '15px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          전화
        </a>
      )}
    </section>
  );
}

function DetailSection({ detail, now, center, onOpenMap }: { detail: CategoryDetail; now: Date } & MapProps) {
  switch (detail.kind) {
    case 'hiking': {
      if (!detail.sunset || !detail.sunrise) return null;
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const left = toMinutes(detail.sunset) - nowMin;
      const daylight = toMinutes(detail.sunset) - toMinutes(detail.sunrise);
      const ratio = Math.min(1, Math.max(0, left / daylight));
      return (
        <section style={{ ...panelStyle, marginTop: '32px' }}>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>일몰까지 남은 시간</h2>
          <p style={{ margin: '8px 0 0', fontSize: '24px', fontWeight: 700 }}>
            {left > 0 && nowMin >= toMinutes(detail.sunrise) ? `${Math.floor(left / 60)}시간 ${left % 60}분` : '해가 진 시간이에요'}
          </p>
          <div style={{ marginTop: '16px', height: '8px', borderRadius: '4px', backgroundColor: COLORS.track, overflow: 'hidden' }}>
            <div style={{ width: `${ratio * 100}%`, height: '100%', borderRadius: '4px', backgroundColor: COLORS.primary }} />
          </div>
          <p style={{ margin: '16px 0 0', fontSize: '13px', color: COLORS.textHint }}>
            일출 {detail.sunrise} · 일몰 {detail.sunset}
            {detail.fire && ` · 산불위험 ${detail.fire.grade} (${detail.fire.area})`}
          </p>
        </section>
      );
    }
    case 'camping':
      return (
        <section style={{ ...panelStyle, marginTop: '32px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: COLORS.textHint }}>앞으로 12시간 최저기온</p>
          <p style={{ margin: '4px 0 0', fontSize: '32px', fontWeight: 700 }}>{detail.nightLow === null ? '-' : `${detail.nightLow}°C`}</p>
          <h2 style={{ margin: '20px 0 0', fontSize: '16px', fontWeight: 700 }}>반경 20km 공식 캠핑장</h2>
          {detail.campsites.length === 0 && (
            <p style={{ margin: '12px 0 0', fontSize: '13px', color: COLORS.textHint }}>근처에 등록된 캠핑장이 없어요</p>
          )}
          {detail.campsites.map((site) => (
            <div key={site.name} style={{ marginTop: '12px' }}>
              <p style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', margin: 0, fontSize: '15px', color: COLORS.text }}>
                <span style={{ fontWeight: 500 }}>{site.name}</span>
                <span style={{ flexShrink: 0, color: COLORS.textMuted }}>{formatKm(site.distanceKm)}</span>
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: COLORS.textHint }}>
                {site.type} · {site.address}
              </p>
            </div>
          ))}
        </section>
      );
    case 'fishing': {
      const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      return (
        <section style={{ ...panelStyle, marginTop: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>다가오는 물때</h2>
            {detail.tide && (
              <span style={{ fontSize: '13px', color: COLORS.textHint }}>
                {detail.tide.station} 기준 · {formatKm(detail.tide.distanceKm)}
              </span>
            )}
          </div>
          {detail.tide ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '16px' }}>
              {detail.tide.events.map((e) => {
                return (
                  <div key={`${e.date}-${e.time}`} style={{ padding: '12px', borderRadius: '12px', backgroundColor: COLORS.bg }}>
                    <span style={{ fontSize: '13px', color: e.type === '만조' ? COLORS.primary : COLORS.textMuted }}>
                      {e.type === '만조' ? '🌊 만조' : '🏖️ 간조'}
                      {e.date !== today && ' · 내일'}
                    </span>
                    <strong style={{ display: 'block', marginTop: '4px', fontSize: '18px' }}>{e.time}</strong>
                    <span style={{ fontSize: '13px', color: COLORS.textHint }}>{e.levelCm}cm</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ margin: '12px 0 0', fontSize: '13px', color: COLORS.textHint }}>물때 정보를 불러오지 못했어요</p>
          )}

          <p style={{ margin: '20px 0 8px', fontSize: '13px', fontWeight: 600, color: COLORS.textSub }}>
            바다낚시지수
            {detail.fishing && (
              <span style={{ fontWeight: 400, color: COLORS.textHint }}>
                {' '}
                · {detail.fishing.point} ({formatKm(detail.fishing.distanceKm)}) · {detail.fishing.tidePhase}
              </span>
            )}
          </p>
          {detail.fishing ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              {detail.fishing.halves.map((h) => (
                <div key={h.half} style={{ flex: 1, padding: '12px', borderRadius: '12px', backgroundColor: COLORS.bg }}>
                  <span style={{ fontSize: '13px', color: COLORS.textHint }}>{h.half}</span>
                  <strong style={{ display: 'block', marginTop: '4px', fontSize: '18px', color: VERDICT_TONE[FISHING_INDEX_VERDICT[h.index] ?? 'caution'].text }}>
                    {h.index}
                  </strong>
                  <span style={{ display: 'block', marginTop: '4px', fontSize: '13px', color: COLORS.textMuted }}>
                    파고 {h.maxWave}m · 수온 {h.waterTemp}°C
                  </span>
                  <span style={{ display: 'block', marginTop: '2px', fontSize: '13px', color: COLORS.textHint }}>
                    {h.species.map((s) => `${s.name} ${s.index}`).join(' · ')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: '13px', color: COLORS.textHint }}>바다낚시지수를 불러오지 못했어요</p>
          )}
        </section>
      );
    }
    case 'night':
      return (
        <section style={{ ...panelStyle, marginTop: '32px' }}>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>범죄주의구간 · CCTV</h2>
          {detail.crime && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '16px', textAlign: 'center' }}>
              {[
                ['반경 500m 최고', detail.crime.maxLevel],
                ['바로 앞 100m', detail.crime.nearLevel],
              ].map(([label, level]) => (
                <div key={label} style={{ padding: '12px', borderRadius: '12px', backgroundColor: COLORS.bg }}>
                  <strong style={{ display: 'block', fontSize: '20px' }}>{level === null ? '없음' : `${level}단계`}</strong>
                  <span style={{ fontSize: '13px', color: COLORS.textHint }}>{label}</span>
                </div>
              ))}
            </div>
          )}
          <p style={{ margin: '12px 0 0', fontSize: '13px', lineHeight: 1.6, color: COLORS.textHint }}>
            10단계 중 단계가 높을수록 주의가 필요한 길이에요 · 지도 색으로 추정한 값이에요. 공공 CCTV 위치는 전체 지도에서 볼 수 있어요
          </p>
          <div style={{ marginTop: '16px' }}>
            <ResultMiniMap center={center} layers={['crime']} onOpenFullMap={onOpenMap} />
          </div>
        </section>
      );
    case 'moving':
      return (
        <section style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ ...panelStyle, padding: '16px' }}>
            <ResultMiniMap center={center} layers={['crime', 'flood', 'landslide']} onOpenFullMap={onOpenMap} />
          </div>
          {detail.items.map((item) => {
            const tone = VERDICT_TONE[item.verdict];
            return (
              <div key={item.title} style={{ ...panelStyle, padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: '15px' }}>{item.title}</strong>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: tone.text }}>{item.grade}</span>
                </div>
                <div style={{ marginTop: '12px', height: '8px', borderRadius: '4px', backgroundColor: COLORS.track, overflow: 'hidden' }}>
                  <div style={{ width: `${item.ratio * 100}%`, height: '100%', borderRadius: '4px', backgroundColor: tone.dot }} />
                </div>
                <p style={{ margin: '8px 0 0', fontSize: '13px', color: COLORS.textHint }}>{item.desc}</p>
              </div>
            );
          })}
        </section>
      );
  }
}

const sectionTitleStyle = { margin: '0 0 12px', fontSize: '18px', fontWeight: 700 } as const;

const panelStyle = { padding: '20px', borderRadius: '16px', backgroundColor: COLORS.surface } as const;

const textButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  minHeight: '44px',
  padding: 0,
  border: 'none',
  background: 'none',
  cursor: 'pointer',
} as const;
