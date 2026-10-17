import { Pin, Search, Settings } from '../components/icons';
import { BANNER_AD_GROUP_ID } from '../constants/ads';
import { LATEST_CHANGELOG } from '../constants/changelog';
import { getCategory, UPCOMING_CATEGORIES, type CategoryId, type Place } from '../constants/categories';
import { COLORS, SCREEN_STYLE } from '../constants/theme';
import { preferenceActions, usePreferences } from '../hooks/usePreferences';
import BannerAdComponent from './BannerAdComponent';

interface HomeScreenProps {
  place: Place | null;
  placeStatus: string | null; // 위치 확인 중/실패 안내
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
  onOpenSearch,
  onSelectRecentSearch,
  onSelectCategory,
  onOpenSettings,
  onOpenChangelog,
}: HomeScreenProps) {
  const { categoryOrder, searchHistory, seenChangelogId } = usePreferences();
  const showWhatsNew = seenChangelogId !== LATEST_CHANGELOG.id;

  return (
    <main style={SCREEN_STYLE}>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { scrollbar-width: none; }
        .category-card { transition: transform .12s ease, filter .12s ease; }
        .category-card:active { transform: scale(.97); filter: brightness(.97); }
        .category-card .emoji-badge { transition: transform .2s ease; }
        .category-card:active .emoji-badge { transform: rotate(-8deg) scale(1.06); }
      `}</style>

      {/* 1. 위치 · 새 기능 · 설정 — 한 줄로 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={onOpenSearch}
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            minHeight: '44px',
            padding: '0 4px',
            border: 'none',
            background: 'none',
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
              color: COLORS.primary,
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
          border: `2px solid ${COLORS.primary}`,
          borderRadius: '18px',
          backgroundColor: COLORS.bg,
          color: COLORS.textHint,
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
      <section style={{ marginTop: '24px' }}>
        <h2 style={{ margin: '0 0 12px', fontSize: '20px', fontWeight: 700 }}>무엇을 하러 가세요?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {categoryOrder.map((id) => {
            const category = getCategory(id);
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
