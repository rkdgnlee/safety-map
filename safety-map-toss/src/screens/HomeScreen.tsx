import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Pin, Search, Settings } from '../components/icons';
import { BANNER_AD_GROUP_ID } from '../constants/ads';
import { LATEST_CHANGELOG } from '../constants/changelog';
import { CATEGORIES, UPCOMING_CATEGORIES, type CategoryId, type Place } from '../constants/categories';
import { COLORS, SCREEN_STYLE } from '../constants/theme';
import { preferenceActions, usePreferences } from '../hooks/usePreferences';
import BannerAdComponent from './BannerAdComponent';

interface HomeScreenProps {
  place: Place | null;
  placeStatus: string | null; // 위치 확인 중/실패 안내
  placeNudge: number; // 홈에서 장소만 고를 때마다 1씩 늘어난다
  onOpenSearch: () => void;
  onSelectRecentSearch: (place: Place) => void;
  onSelectCategory: (id: CategoryId) => void;
  onOpenSettings: () => void;
  onOpenChangelog: () => void;
}

// 상단 내비게이션(뒤로가기·더보기)은 토스가 그려주므로 화면 안에는 그리지 않는다
export default function HomeScreen({
  place,
  placeStatus,
  placeNudge,
  onOpenSearch,
  onSelectRecentSearch,
  onSelectCategory,
  onOpenSettings,
  onOpenChangelog,
}: HomeScreenProps) {
  const { searchHistory, seenChangelogId } = usePreferences();
  const showWhatsNew = seenChangelogId !== LATEST_CHANGELOG.id;

  // 장소를 고르면: 위쪽 위치 줄을 반짝여 바뀐 걸 보여주고, 카테고리 카드로 내려가 고르도록 안내한다
  const categoryRef = useRef<HTMLElement>(null);
  const lastNudge = useRef(placeNudge); // 결과에서 돌아왔을 때는 다시 안내하지 않는다
  const [guiding, setGuiding] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  useEffect(() => {
    if (placeNudge === lastNudge.current) return;
    lastNudge.current = placeNudge;
    setGuiding(true);
    setFlashKey((k) => k + 1);
    const timer = window.setTimeout(() => {
      const el = categoryRef.current;
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 16, behavior: 'smooth' });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [placeNudge]);

  return (
    <main style={SCREEN_STYLE}>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { scrollbar-width: none; }
        .category-card { transition: transform .12s ease, filter .12s ease; }
        .category-card:active { transform: scale(.97); filter: brightness(.97); }
        .category-card .emoji-badge { transition: transform .2s ease; }
        .category-card:active .emoji-badge { transform: rotate(-8deg) scale(1.06); }
        @keyframes place-flash { 0%, 60% { background-color: ${COLORS.primarySoft}; } 100% { background-color: transparent; } }
        .place-flash { animation: place-flash 1.6s ease-out; }
        @keyframes guide-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
        @keyframes card-nudge { 0%, 100% { transform: none; } 40% { transform: translateY(-4px); } }
        .guiding .category-card { animation: card-nudge .5s ease-in-out 1s 2; }
        @keyframes arrow-bob { 0%, 100% { transform: none; } 50% { transform: translateY(3px); } }
        @media (prefers-reduced-motion: reduce) { .place-flash, .guiding .category-card, .guide-arrow { animation: none !important; } }
      `}</style>

      {/* 1. 위치 · 새 기능 · 설정 — 한 줄로 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          key={flashKey}
          className={flashKey > 0 ? 'place-flash' : undefined}
          onClick={onOpenSearch}
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            minHeight: '44px',
            padding: '0 8px',
            border: 'none',
            borderRadius: '12px',
            backgroundColor: 'transparent',
            color: COLORS.text,
            fontSize: '15px',
            fontWeight: 600,
            textAlign: 'left',
            cursor: 'pointer',
          }}
        >
          <span style={{ display: 'flex', flexShrink: 0, color: COLORS.primary }}>
            <Pin size={18} />
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {place ? place.label : placeStatus ?? '장소를 선택해 주세요'}
          </span>
        </button>
        {showWhatsNew && (
          <button
            onClick={() => {
              preferenceActions.markChangelogSeen(LATEST_CHANGELOG.id);
              onOpenChangelog();
            }}
            style={{
              flexShrink: 0,
              minHeight: '44px',
              padding: '0 12px',
              border: 'none',
              borderRadius: '22px',
              backgroundColor: COLORS.primarySoft,
              color: COLORS.primaryStrong,
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ✨ 새 기능
          </button>
        )}
        <button
          onClick={onOpenSettings}
          aria-label="설정"
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '44px',
            height: '44px',
            border: 'none',
            borderRadius: '22px',
            backgroundColor: COLORS.surfaceStrong,
            color: COLORS.textSub,
            cursor: 'pointer',
          }}
        >
          <Settings size={20} />
        </button>
      </div>

      {/* 2. 앱 소개 한 줄 — 무슨 앱인지 바로 알 수 있게 */}
      <section style={{ marginTop: '16px' }}>
        <p style={{ margin: 0, fontSize: '15px', fontWeight: 500, color: COLORS.textHint }}>지금 거기 가도 괜찮을까?</p>
        <h1 style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.4 }}>
          가려는 곳의 날씨와
          <br />
          안전 정보를 한눈에 봐요
        </h1>
      </section>

      {/* 3. 검색 — 첫 화면의 주인공 */}
      <button
        onClick={onOpenSearch}
        style={{
          marginTop: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          width: '100%',
          height: '60px',
          padding: '0 18px',
          border: `2px solid ${COLORS.primaryLine}`,
          borderRadius: '18px',
          backgroundColor: COLORS.primarySoft,
          color: COLORS.textSub,
          fontSize: '16px',
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <span style={{ display: 'flex', color: COLORS.primary }}>
          <Search size={22} />
        </span>
        <span>어디 가세요? 산, 캠핑장, 낚시터, 동네</span>
      </button>

      {/* 4. 최근 검색 */}
      {searchHistory.length > 0 && (
        <div className="no-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', margin: '12px -20px 0', padding: '0 20px' }}>
          {searchHistory.map((item) => (
            <button
              key={`${item.label}-${item.lat}`}
              onClick={() => onSelectRecentSearch(item)}
              style={{
                flexShrink: 0,
                minHeight: '44px',
                padding: '0 14px',
                border: `1px solid ${COLORS.border}`,
                borderRadius: '22px',
                backgroundColor: COLORS.bg,
                color: COLORS.textSub,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              🕘 {item.label}
            </button>
          ))}
        </div>
      )}

      {/* 5. 배너 광고 — 배너 컨테이너는 화면 너비와 같아야 해서 좌우 여백을 상쇄한다 */}
      <div style={{ margin: '24px -20px 0' }}>
        <BannerAdComponent adGroupId={BANNER_AD_GROUP_ID} variant="card" />
      </div>

      {/* 6. 카테고리 */}
      <section ref={categoryRef} className={guiding ? 'guiding' : undefined} style={{ marginTop: '24px' }}>
        {guiding && place && (
          <div
            role="status"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '12px',
              padding: '12px 14px',
              borderRadius: '14px',
              backgroundColor: COLORS.primarySoft,
              animation: 'guide-in .3s ease-out',
            }}
          >
            <span style={{ display: 'flex', flexShrink: 0, color: COLORS.primary }}>
              <Pin size={18} />
            </span>
            <span style={{ flex: 1, minWidth: 0, fontSize: '15px', lineHeight: 1.5, color: COLORS.text }}>
              <strong style={{ fontWeight: 700, color: COLORS.primaryStrong }}>{place.label}</strong>
              {', 어떤 정보가 궁금하세요?'}
              <br />
              <span style={{ color: COLORS.textSub }}>아래에서 하려는 일을 골라 주세요</span>
            </span>
            <span className="guide-arrow" style={{ display: 'flex', flexShrink: 0, color: COLORS.primary, animation: 'arrow-bob 1s ease-in-out infinite' }}>
              <ChevronDown size={20} />
            </span>
          </div>
        )}
        <h2 style={{ margin: '0 0 12px', fontSize: '20px', fontWeight: 700 }}>무엇을 하러 가세요?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {CATEGORIES.map((category) => {
            const id = category.id;
            return (
              <button
                key={id}
                className="category-card"
                onClick={() => onSelectCategory(id)}
                style={{
                  ...cardStyle,
                  background: `linear-gradient(145deg, ${category.tint[0]} 0%, ${category.tint[1]} 100%)`,
                  color: COLORS.text,
                  cursor: 'pointer',
                }}
              >
                <span
                  className="emoji-badge"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '48px',
                    height: '48px',
                    borderRadius: '24px',
                    backgroundColor: 'rgba(255,255,255,0.85)',
                    fontSize: '26px',
                  }}
                >
                  {category.emoji}
                </span>
                <span>
                  <strong style={{ display: 'block', fontSize: '17px', fontWeight: 700 }}>{category.name}</strong>
                  <span style={{ display: 'block', marginTop: '4px', fontSize: '13px', lineHeight: 1.5, color: category.accent }}>
                    {category.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {UPCOMING_CATEGORIES.map((item) => (
          <div
            key={item.name}
            style={{
              marginTop: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              height: '60px',
              padding: '0 16px',
              borderRadius: '18px',
              backgroundColor: COLORS.surface,
              color: COLORS.textDisabled,
            }}
          >
            <span style={{ fontSize: '24px', filter: 'grayscale(1)' }}>{item.emoji}</span>
            <strong style={{ fontSize: '16px', fontWeight: 700 }}>{item.name}</strong>
            <span style={{ marginLeft: 'auto', fontSize: '14px' }}>곧 열려요</span>
          </div>
        ))}
      </section>
    </main>
  );
}

const cardStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '16px',
  minHeight: '148px',
  padding: '16px',
  border: 'none',
  borderRadius: '20px',
  textAlign: 'left',
  boxSizing: 'border-box',
} as const;
