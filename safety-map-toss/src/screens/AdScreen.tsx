import { useEffect } from 'react';

interface AdScreenProps {
  onClose: () => void;
}

export default function AdScreen({ onClose }: AdScreenProps) {
  
  useEffect(() => {
    // 필요 시 광고 트래킹 코드를 여기에 로드
    console.log("전면 광고 화면 로드됨");
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#000', // 전면 광고는 보통 어두운 배경
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '40px 20px',
      boxSizing: 'border-box',
      zIndex: 999
    }}>
      {/* 상단 닫기 영역 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          onClick={onClose} // 닫힘을 감지하여 () => void 실행
          style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer' }}
        >
          광고 닫기 ✕
        </button>
      </div>

      {/* 광고 콘텐츠 바디 (가지고 계신 예제로 대체 가능) */}
      <div style={{ color: '#fff', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '10px' }}>[전면 스폰서 광고]</h1>
        <p style={{ color: '#aaa' }}>여기에 가져오신 전면광고 SDK 혹은 컴포넌트를 연동하세요.</p>
      </div>

      <div style={{ textAlign: 'center', color: '#666', fontSize: '12px' }}>
        광고를 닫으면 안전 지도 분석 결과로 이동합니다.
      </div>
    </div>
  );
}