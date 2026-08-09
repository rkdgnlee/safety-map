// FeatureBanner.tsx
import { useState, useEffect, useRef } from 'react';

const FEATURES = [
  {
    id: 'crime',
    icon: '🛡️',
    title: '5대 범죄 통계 지도',
    desc: '경찰청 공식 데이터로 우리 동네\n범죄 위험 구간을 확인해요',
    bg: 'linear-gradient(135deg, #1a1f2e 0%, #2d3561 100%)',
    accent: '#4d7cff',
  },
  {
    id: 'cctv',
    icon: '📹',
    title: '공공 CCTV 확인 · 신청',
    desc: '내 주변 공공 CCTV 위치 확인과\n정보공개 청구를 도와드려요',
    bg: 'linear-gradient(135deg, #1a2e1f 0%, #1e4d2b 100%)',
    accent: '#4dbb6e',
  },
];

export default function FeatureBanner() {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % FEATURES.length);
    }, 3500);
  };

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const feature = FEATURES[current];

  return (
    <div style={{ position: 'relative', width: '100%', height: '96px' }}>
      {/* 배너 카드 */}
      <div style={{
        width: '100%',
        height: '96px',
        borderRadius: '18px',
        background: feature.bg,
        padding: '0 18px',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        overflow: 'hidden',
        position: 'relative',
        transition: 'background 0.4s ease',
      }}>
        {/* 배경 장식 원 */}
        <div style={{
          position: 'absolute', right: '-20px', top: '-20px',
          width: '100px', height: '100px', borderRadius: '50%',
          backgroundColor: feature.accent, opacity: 0.12,
        }} />
        <div style={{
          position: 'absolute', right: '30px', bottom: '-30px',
          width: '80px', height: '80px', borderRadius: '50%',
          backgroundColor: feature.accent, opacity: 0.08,
        }} />

        {/* 아이콘 */}
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px', flexShrink: 0,
        }}>
          {feature.icon}
        </div>

        {/* 텍스트 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: '0 0 3px',
            fontSize: '14px', fontWeight: '700', color: '#ffffff',
            letterSpacing: '-0.3px',
          }}>
            {feature.title}
          </p>
          <p style={{
            margin: 0,
            fontSize: '11px', color: 'rgba(255,255,255,0.65)',
            lineHeight: '1.5', whiteSpace: 'pre-line',
          }}>
            {feature.desc}
          </p>
        </div>

        {/* 인디케이터 */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0,
        }}>
          {FEATURES.map((_, idx) => (
            <div
              key={idx}
              onClick={() => {
                setCurrent(idx);
                if (timerRef.current) clearInterval(timerRef.current);
                startTimer();
              }}
              style={{
                width: '4px',
                height: idx === current ? '16px' : '4px',
                borderRadius: '2px',
                backgroundColor: idx === current ? '#ffffff' : 'rgba(255,255,255,0.3)',
                transition: 'height 0.3s ease',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}