import { useState, type ReactNode } from 'react';
import PlaceSearchSheet from '../components/PlaceSearchSheet';
import { ChevronRight, Close } from '../components/icons';
import { CHANGELOG } from '../constants/changelog';
import { COLORS, FONT_FAMILY, SCREEN_STYLE } from '../constants/theme';
import { preferenceActions, usePreferences } from '../hooks/usePreferences';

type InfoSection = 'sources' | 'guide' | 'changelog';

interface SettingsScreenProps {
  initialInfo?: InfoSection; // 홈 '새로워졌어요'에서 들어오면 업데이트 내역을 펼친 채로
}

type ConfirmTarget = 'history' | 'recent' | null;

const DATA_SOURCES = [
  '기상청 초단기예보 · 단기예보 · 기상특보',
  '한국환경공단 에어코리아 대기오염정보',
  '한국천문연구원 출몰시각',
  '산림청 국립산림과학원 산악기상 · 산불위험예보',
  '한국관광공사 고캠핑',
  '국립해양조사원 조석예보 · 바다낚시지수',
  '행정안전부 생활안전정보 · CCTV 정보',
  '국립중앙의료원 응급의료기관 정보',
];

const VERDICT_GUIDE = [
  ['좋음', '확인한 항목 중 기준을 넘는 게 없어요'],
  ['주의', '바람·산불위험·파고 등 한 가지 이상이 주의 기준을 넘었어요'],
  ['비추천', '기상특보가 발효됐거나 여러 항목이 위험 기준을 넘었어요'],
];

export default function SettingsScreen({ initialInfo }: SettingsScreenProps) {
  const prefs = usePreferences();
  const [confirm, setConfirm] = useState<ConfirmTarget>(null);
  const [isPickingDefault, setIsPickingDefault] = useState(false);
  const [openInfo, setOpenInfo] = useState<InfoSection | null>(initialInfo ?? null);

  const handleConfirm = () => {
    if (confirm === 'history') preferenceActions.clearSearchHistory();
    if (confirm === 'recent') preferenceActions.clearRecentViews();
    setConfirm(null);
  };

  return (
    <main style={SCREEN_STYLE}>
      <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, letterSpacing: '-1px' }}>더보기</h1>

      <Section title="위치">
        <Row
          title="현재 위치 사용"
          detail="앱을 열 때 지금 있는 곳을 기준으로 보여드려요"
          action={
            <Toggle
              checked={prefs.useCurrentLocation}
              label="현재 위치 사용"
              onChange={preferenceActions.setUseCurrentLocation}
            />
          }
        />
        <Row
          title="기본 위치"
          detail={prefs.defaultPlace ? prefs.defaultPlace.label : '현재 위치를 쓰지 않을 때 보여줄 장소'}
          onClick={() => setIsPickingDefault(true)}
          action={
            prefs.defaultPlace ? (
              <button onClick={(e) => { e.stopPropagation(); preferenceActions.setDefaultPlace(null); }} style={smallTextButtonStyle}>
                해제
              </button>
            ) : undefined
          }
        />
      </Section>

      <Section title="기록">
        {prefs.searchHistory.length === 0 && <Row title="최근 검색 기록이 없어요" muted />}
        {prefs.searchHistory.map((place) => (
          <Row
            key={`${place.label}-${place.lat}`}
            title={place.label}
            action={
              <button
                onClick={() => preferenceActions.removeSearchHistory(place)}
                aria-label={`${place.label} 검색 기록 삭제`}
                style={{ width: '44px', height: '44px', border: 'none', background: 'none', color: COLORS.textDisabled, fontSize: '16px', cursor: 'pointer' }}
              >
                <Close size={16} />
              </button>
            }
          />
        ))}
        <Row
          title="검색 기록 전체 삭제"
          onClick={prefs.searchHistory.length > 0 ? () => setConfirm('history') : undefined}
          muted={prefs.searchHistory.length === 0}
          action={<span />}
        />
        <Row
          title="최근 본 장소 지우기"
          detail={prefs.recentViews.length > 0 ? `${prefs.recentViews.length}곳` : '최근 본 장소가 없어요'}
          onClick={prefs.recentViews.length > 0 ? () => setConfirm('recent') : undefined}
          muted={prefs.recentViews.length === 0}
          action={<span />}
        />
      </Section>

      <Section title="정보">
        <Row title="업데이트 내역" detail={`최근 ${CHANGELOG[0].date}`} onClick={() => setOpenInfo(openInfo === 'changelog' ? null : 'changelog')} />
        {openInfo === 'changelog' && (
          <div style={infoBoxStyle}>
            {CHANGELOG.map((entry, index) => (
              <div key={entry.id} style={{ marginTop: index === 0 ? 0 : '20px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: COLORS.textHint }}>{entry.date}</p>
                <p style={{ margin: '2px 0 6px', fontSize: '15px', fontWeight: 700, color: COLORS.text }}>{entry.title}</p>
                {entry.items.map((item) => (
                  <p key={item} style={{ margin: '0 0 4px' }}>
                    · {item}
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}
        <Row title="판정 기준 안내" onClick={() => setOpenInfo(openInfo === 'guide' ? null : 'guide')} />
        {openInfo === 'guide' && (
          <div style={infoBoxStyle}>
            {VERDICT_GUIDE.map(([label, desc]) => (
              <p key={label} style={{ margin: '0 0 8px' }}>
                <strong>{label}</strong> · {desc}
              </p>
            ))}
            <p style={{ margin: 0, color: COLORS.textHint }}>참고용 정보이며 현장 상황과 다를 수 있어요.</p>
          </div>
        )}
        <Row title="데이터 출처" onClick={() => setOpenInfo(openInfo === 'sources' ? null : 'sources')} />
        {openInfo === 'sources' && (
          <div style={infoBoxStyle}>
            {DATA_SOURCES.map((source) => (
              <p key={source} style={{ margin: '0 0 6px' }}>
                {source}
              </p>
            ))}
          </div>
        )}
      </Section>

      {confirm && (
        <ConfirmSheet
          title={confirm === 'history' ? '검색 기록을 모두 지울까요?' : '최근 본 장소를 모두 지울까요?'}
          description="지운 기록은 되돌릴 수 없어요."
          confirmLabel="지우기"
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {isPickingDefault && (
        <PlaceSearchSheet
          title="기본 위치 설정"
          onSelect={(place) => {
            preferenceActions.setDefaultPlace(place);
            setIsPickingDefault(false);
          }}
          onClose={() => setIsPickingDefault(false)}
        />
      )}
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: '32px' }}>
      <h2 style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 600, color: COLORS.textHint }}>{title}</h2>
      {children}
    </section>
  );
}

function Row({
  title,
  detail,
  action,
  onClick,
  muted,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
  onClick?: () => void;
  muted?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        minHeight: '56px',
        padding: '8px 0',
        borderBottom: `1px solid ${COLORS.divider}`,
        cursor: onClick ? 'pointer' : 'default',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '15px', fontWeight: 500, color: muted ? COLORS.textDisabled : COLORS.text }}>{title}</p>
        {detail && <p style={{ margin: '4px 0 0', fontSize: '13px', color: COLORS.textHint }}>{detail}</p>}
      </div>
      {action ?? (onClick && <span style={{ display: 'flex', color: COLORS.textDisabled }}><ChevronRight size={18} /></span>)}
    </div>
  );
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (value: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        flexShrink: 0,
        width: '50px',
        height: '30px',
        padding: '3px',
        border: 'none',
        borderRadius: '15px',
        backgroundColor: checked ? COLORS.primary : COLORS.track,
        cursor: 'pointer',
        transition: 'background-color 0.2s',
      }}
    >
      <span
        style={{
          display: 'block',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          transform: checked ? 'translateX(20px)' : 'translateX(0)',
          transition: 'transform 0.2s',
        }}
      />
    </button>
  );
}

function ConfirmSheet({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.4)', fontFamily: FONT_FAMILY }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '28px 20px calc(20px + env(safe-area-inset-bottom))',
          borderRadius: '24px 24px 0 0',
          backgroundColor: COLORS.bg,
        }}
      >
        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: COLORS.text }}>{title}</h3>
        <p style={{ margin: '8px 0 24px', fontSize: '15px', color: COLORS.textMuted }}>{description}</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onCancel} style={{ ...sheetButtonStyle, backgroundColor: COLORS.surfaceStrong, color: COLORS.textSub }}>
            취소
          </button>
          <button onClick={onConfirm} style={{ ...sheetButtonStyle, backgroundColor: COLORS.primaryButton, color: '#ffffff' }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const smallTextButtonStyle = {
  minHeight: '44px',
  padding: '0 4px',
  border: 'none',
  background: 'none',
  color: COLORS.primaryStrong,
  fontSize: '13px',
  cursor: 'pointer',
} as const;

const infoBoxStyle = {
  margin: '8px 0',
  padding: '16px',
  borderRadius: '12px',
  backgroundColor: COLORS.surface,
  fontSize: '13px',
  lineHeight: 1.6,
  color: COLORS.textSub,
} as const;

const sheetButtonStyle = {
  flex: 1,
  height: '52px',
  border: 'none',
  borderRadius: '14px',
  fontSize: '16px',
  fontWeight: 600,
  cursor: 'pointer',
} as const;
