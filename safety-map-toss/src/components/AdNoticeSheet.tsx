// 전면 광고 안내 시트 — 상태와 요청 함수는 services/adNotice.ts
import { COLORS, FONT_FAMILY } from '../constants/theme';
import { closeAdNotice, useAdNoticeRequest } from '../services/adNotice';
import { showInterstitial } from '../services/interstitialAd';

export default function AdNoticeHost() {
  const request = useAdNoticeRequest();
  if (!request) return null;

  const handleConfirm = () => {
    closeAdNotice();
    showInterstitial(request.onContinue);
  };

  return (
    <div
      onClick={closeAdNotice}
      style={{ position: 'fixed', inset: 0, zIndex: 2000, backgroundColor: 'var(--dim, rgba(0,0,0,0.4))', fontFamily: FONT_FAMILY }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ad-notice-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '28px 20px calc(20px + max(env(safe-area-inset-bottom), 14px))',
          borderRadius: '24px 24px 0 0',
          backgroundColor: COLORS.bg,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            padding: '4px 8px',
            borderRadius: '6px',
            backgroundColor: COLORS.surfaceStrong,
            color: COLORS.textSub,
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          광고 안내
        </span>
        <h3 id="ad-notice-title" style={{ margin: '12px 0 0', fontSize: '20px', fontWeight: 700, lineHeight: 1.4, color: COLORS.text }}>
          {request.title}
        </h3>
        <p style={{ margin: '8px 0 24px', fontSize: '15px', lineHeight: 1.6, color: COLORS.textSub }}>{request.description}</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={closeAdNotice} style={{ ...buttonStyle, backgroundColor: COLORS.surfaceStrong, color: COLORS.textSub }}>
            취소
          </button>
          <button onClick={handleConfirm} style={{ ...buttonStyle, flex: 2, backgroundColor: COLORS.primary, color: '#ffffff' }}>
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const buttonStyle = {
  flex: 1,
  height: '52px',
  border: 'none',
  borderRadius: '14px',
  fontSize: '16px',
  fontWeight: 600,
  cursor: 'pointer',
} as const;
