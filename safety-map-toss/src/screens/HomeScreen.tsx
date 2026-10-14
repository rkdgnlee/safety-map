import { LATEST_CHANGELOG } from '../constants/changelog';
import { getCategory, UPCOMING_CATEGORIES, type CategoryId, type Place } from '../constants/categories';
import { COLORS, SCREEN_STYLE } from '../constants/theme';
import { preferenceActions, usePreferences, type RecentView } from '../hooks/usePreferences';
import { BANNER_AD_GROUP_ID } from '../constants/ads';
import BannerAdComponent from './BannerAdComponent';

interface HomeScreenProps {
  place: Place | null;
  placeStatus: string | null; // 위치 확인 중/실패 안내
  onOpenSearch: () => void;
  onSelectCategory: (id: CategoryId) => void;
  onOpenRecent: (view: RecentView) => void;
  onOpenSettings: () => void;
  onOpenChangelog: () => void;
}

export default function HomeScreen({
  place,
  placeStatus,
  onOpenSearch,
  onSelectCategory,
  onOpenRecent,
  onOpenSettings,
  onOpenChangelog,
}: HomeScreenProps) {
  const { categoryOrder, recentViews, seenChangelogId } = usePreferences();
  const showWhatsNew = seenChangelogId !== LATEST_CHANGELOG.id;

  return (
    <main style={SCREEN_STYLE}>
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { scrollbar-width: none; }`}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <button
          onClick={onOpenSearch}
          style={{
            minHeight: '40px',
            maxWidth: 'calc(100% - 52px)',
            padding: '0 14px',
            border: 'none',
            borderRadius: '20px',
            backgroundColor: COLORS.surfaceStrong,
            color: COLORS.textSub,
            fontSize: '13px',
            fontWeight: 500,
            textAlign: 'left',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            cursor: 'pointer',
          }}
        >
          📍 {place ? place.label : placeStatus ?? '장소를 선택해 주세요'}
        </button>
        <button
          onClick={onOpenSettings}
          aria-label="더보기"
          style={{
            width: '44px',
            height: '44px',
            border: 'none',
            background: 'none',
            color: COLORS.textHint,
            fontSize: '18px',
            letterSpacing: '1px',
            cursor: 'pointer',
          }}
        >
          •••
        </button>
      </div>

      <section style={{ paddingTop: '44px' }}>
        <p style={{ margin: 0, fontSize: '15px', fontWeight: 500, color: COLORS.textHint }}>지금 거기 가도 괜찮을까?</p>
        <h1 style={{ margin: '8px 0 0', fontSize: '28px', fontWeight: 700, letterSpacing: '-1px', lineHeight: 1.35 }}>
          가려는 곳의 날씨와
          <br />
          안전 정보를 한눈에 봐요
        </h1>
      </section>

      {showWhatsNew && (
        <div
          style={{
            marginTop: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 4px 4px 16px',
            borderRadius: '14px',
            backgroundColor: COLORS.primarySoft,
          }}
        >
          <button
            onClick={() => {
              preferenceActions.markChangelogSeen(LATEST_CHANGELOG.id);
              onOpenChangelog();
            }}
            style={{ flex: 1, minHeight: '48px', padding: 0, border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' }}
          >
            <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: COLORS.primary }}>✨ 새로워졌어요</span>
            <span style={{ display: 'block', marginTop: '2px', fontSize: '14px', fontWeight: 600, color: COLORS.text }}>
              {LATEST_CHANGELOG.title} ›
            </span>
          </button>
          <button
            onClick={() => preferenceActions.markChangelogSeen(LATEST_CHANGELOG.id)}
            aria-label="업데이트 안내 닫기"
            style={{ width: '44px', height: '44px', border: 'none', background: 'none', color: COLORS.textHint, fontSize: '14px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      <button
        onClick={onOpenSearch}
        style={{
          marginTop: showWhatsNew ? '16px' : '28px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          width: '100%',
          height: '56px',
          padding: '0 16px',
          border: 'none',
          borderRadius: '16px',
          backgroundColor: COLORS.surfaceStrong,
          color: COLORS.textHint,
          fontSize: '15px',
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <span aria-hidden>🔍</span>
        <span>어디 가세요? 산, 캠핑장, 낚시터, 동네</span>
      </button>

      <section style={{ marginTop: '36px' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '19px', fontWeight: 700 }}>무엇을 하러 가세요?</h2>
        <p style={{ margin: '0 0 12px', fontSize: '12px', color: COLORS.textHint }}>고른 장소의 지금부터 6시간을 확인해 드려요</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {categoryOrder.map((id) => {
            const category = getCategory(id);
            return (
              <button
                key={id}
                onClick={() => onSelectCategory(id)}
                style={{
                  ...cardStyle,
                  backgroundColor: COLORS.surface,
                  color: COLORS.text,
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: '27px' }}>{category.emoji}</span>
                <span>
                  <strong style={{ display: 'block', fontSize: '16px' }}>{category.name}</strong>
                  <span style={{ display: 'block', marginTop: '4px', fontSize: '12px', lineHeight: 1.6, color: COLORS.textMuted }}>
                    {category.description}
                  </span>
                </span>
              </button>
            );
          })}
          {UPCOMING_CATEGORIES.map((item) => (
            <div key={item.name} style={{ ...cardStyle, backgroundColor: '#fafafa', color: COLORS.textDisabled }}>
              <span style={{ fontSize: '27px', filter: 'grayscale(1)' }}>{item.emoji}</span>
              <span>
                <strong style={{ display: 'block', fontSize: '16px' }}>{item.name}</strong>
                <span style={{ display: 'block', marginTop: '4px', fontSize: '12px' }}>곧 열려요</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {recentViews.length > 0 && (
        <section style={{ marginTop: '36px' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: '17px', fontWeight: 700 }}>최근 본 장소</h2>
          <div className="no-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {recentViews.map((view) => (
              <button
                key={`${view.categoryId}-${view.place.label}-${view.place.lat}`}
                onClick={() => onOpenRecent(view)}
                style={{
                  flexShrink: 0,
                  minHeight: '40px',
                  padding: '0 14px',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '20px',
                  background: COLORS.bg,
                  color: COLORS.textSub,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {getCategory(view.categoryId).emoji} {view.place.label} · {getCategory(view.categoryId).name}
              </button>
            ))}
          </div>
        </section>
      )}

      <div style={{ marginTop: '36px' }}>
        <BannerAdComponent adGroupId={BANNER_AD_GROUP_ID} />
      </div>
    </main>
  );
}

const cardStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  minHeight: '126px',
  padding: '16px',
  border: 'none',
  borderRadius: '16px',
  textAlign: 'left',
  boxSizing: 'border-box',
} as const;
