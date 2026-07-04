import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/web-framework';
import { useState, useEffect, type CSSProperties } from 'react';

interface AdScreenProps {
  onClose: () => void;
  context?: 'home' | 'map';
}

export function AdScreen({ onClose, context = 'home' }: AdScreenProps) {
  const AD_GROUP_ID = 'ait.v2.live.e64e09ffed344652';
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const IS_DEV = import.meta.env.DEV;
  const buttonLabel = context === 'map'
  ? '🗺️ 광고 보고 지도 이어보기'
  : '🛡️ 광고 보고 안전지도 확인하기';

// 상단 안내 문구
const titleText = context === 'map'
  ? '잠깐! 다른 범죄 유형을 보려면'
  : '우리 동네 안전 지도';

const descText = context === 'map'
  ? '짧은 광고 시청 후\n다음 범죄 유형을 확인할 수 있어요.'
  : '범죄 발생 현황을 지도로 확인하고\n안전한 경로를 찾아보세요.';

const adNoticeText = isAdLoaded
  ? (context === 'map' ? '광고 후 바로 지도로 돌아갑니다' : '잠깐 광고를 시청하면 무료로 확인할 수 있어요')
  : '광고를 불러오는 중이에요...';
  useEffect(() => {
    if (IS_DEV) {
      setIsAdLoaded(true);
      return;
    }
    const unregister = loadFullScreenAd({
      options: { adGroupId: AD_GROUP_ID },
      onEvent: (event) => {
        if (event.type === 'loaded') setIsAdLoaded(true);
      },
      onError: (error) => {
        console.error('광고 로드 실패:', error);
      },
    });
    return () => unregister();
  }, []);

  const handleShowAd = () => {
    if (IS_DEV) {
      onClose();
      return;
    }
    showFullScreenAd({
      options: { adGroupId: AD_GROUP_ID },
      onEvent: (event) => {
        switch (event.type) {
          case 'dismissed':
            setIsAdLoaded(false);
            onClose();
            break;
          case 'failedToShow':
            console.error('광고 표시 실패');
            onClose();
            break;
        }
      },
      onError: (error) => {
        console.error('광고 표시 오류:', error);
        onClose();
      },
    });
  };

  return (
    <div style={s.wrapper}>
      
      {/* 상단 안내 콘텐츠 */}
      <div style={s.content}>
        <div style={s.iconWrap}>🛡️</div>
        <h1 style={s.title}>{titleText}</h1>
        <p style={s.desc}>
          {descText}
        </p>

        <div style={s.infoBox}>
          <div style={s.infoRow}>
            <span>📍</span>
            <span>어린이·노인 대상 범죄 주의구간</span>
          </div>
          <div style={s.infoRow}>
            <span>🔍</span>
            <span>5대 범죄 유형별 위험 구간</span>
          </div>
          <div style={s.infoRow}>
            <span>📊</span>
            <span>경찰청 공공데이터 기반 실시간 제공</span>
          </div>
        </div>
      </div>

      {/* 하단 광고 버튼 */}
      <div style={s.bottom}>
        <p style={s.adNotice}>
          {adNoticeText}
        </p>
        <button
          onClick={handleShowAd}
          disabled={!isAdLoaded}
          style={{
            ...s.button,
            backgroundColor: isAdLoaded ? '#0064ff' : '#f2f4f6',
            color: isAdLoaded ? '#ffffff' : '#b0b8c1',
            cursor: isAdLoaded ? 'pointer' : 'not-allowed',
          }}
        >
          {isAdLoaded ? buttonLabel : '광고 로딩 중...'}
        </button>
      </div>

    </div>
  );
}

const s: Record<string, CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '100vh',
    backgroundColor: '#f9fafb',
    fontFamily: '"Pretendard", -apple-system, sans-serif',
    boxSizing: 'border-box',
    padding: '60px 24px 34px',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    textAlign: 'center',
  },
  iconWrap: {
    fontSize: '56px',
    marginBottom: '8px',
  },
  title: {
    fontSize: '26px',
    fontWeight: 'bold',
    color: '#191f28',
    margin: 0,
    letterSpacing: '-0.5px',
  },
  desc: {
    fontSize: '15px',
    color: '#8b95a1',
    lineHeight: '1.6',
    margin: 0,
    whiteSpace: 'pre-line',
  },
  infoBox: {
    marginTop: '8px',
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    boxSizing: 'border-box',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '14px',
    color: '#4e5968',
    fontWeight: '500',
  },
  bottom: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    alignItems: 'center',
  },
  adNotice: {
    fontSize: '13px',
    color: '#b0b8c1',
    margin: 0,
  },
  button: {
    width: '100%',
    maxWidth: '440px',
    height: '56px',
    border: 'none',
    borderRadius: '16px',
    fontSize: '16px',
    fontWeight: '600',
    letterSpacing: '-0.4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s ease, color 0.2s ease',
    outline: 'none',
  },
};