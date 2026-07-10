import { useCallback, useRef, useState } from 'react';
import { useNaverMap } from '../hooks/useNaverMap';
import { useSafemapOverlay } from '../hooks/useSafemapOverlay';

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.9780 };

interface MapScreenProps {
  location: { lat: number; lng: number } | null;
  address: string | null;                 
  pendingCrimeType: string | null;        
  onCrimeTypeAdTrigger: (crimeType: string) => void;
  onBack: () => void;
}

const CRIME_TYPES = [
  { id: 'all', label: '5대 범죄 전체' },
  { id: 'child', label: '어린이 대상 범죄' },
  { id: 'violence', label: '폭력' },
  { id: 'fraud', label: '사기' },
  { id: 'robbery', label: '강도' },
  { id: 'murder', label: '살인' },
  { id: 'sex', label: '성범죄' },
];
const AD_TRIGGER_COUNT = 2;

export default function MapScreen({ location, address, pendingCrimeType, onCrimeTypeAdTrigger, onBack }: MapScreenProps) {
  const handleGoToNews = () => {
    const baseAddress = address || "우리 동네";
    const searchKeyword = `${baseAddress} 범죄 사건사고`;
    const naverNewsUrl = `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(searchKeyword)}`;
    window.open(naverNewsUrl, '_blank');
  };
  
  const [selectedType, setSelectedType] = useState(pendingCrimeType ?? 'all');
  const [isHomeModalOpen, setIsHomeModalOpen] = useState(false);

  const crimeViewCountRef = useRef(0);

  const handleSelectType = useCallback((typeId: string) => {
    if (typeId === 'all') {
      setSelectedType('all');
      return;
    }

    crimeViewCountRef.current += 1;

    if (crimeViewCountRef.current > AD_TRIGGER_COUNT) {
      crimeViewCountRef.current = 0;
      onCrimeTypeAdTrigger(typeId); 
    } else {
      setSelectedType(typeId);
    }
  }, [onCrimeTypeAdTrigger]);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { map, isLoaded, error } = useNaverMap(mapContainerRef, {
    center: location ?? DEFAULT_CENTER,
    zoom: 15,
  });
  
  // 💡 훅에서 데이터 로딩 상태(isLoading)를 받아옵니다.
  const { isLoading: isOverlayLoading } = useSafemapOverlay({ 
    map, 
    isMapLoaded: isLoaded, 
    crimeType: selectedType 
  });

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      backgroundColor: '#f2f4f6',
      overflow: 'hidden',
      fontFamily: '"Pretendard", sans-serif'
    }}>
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        @keyframes dynamicDots {
          0% { content: ''; }
          25% { content: '.'; }
          50% { content: '..'; }
          75% { content: '...'; }
          100% { content: ''; }
        }
        .loading-dots::after {
          content: '';
          animation: dynamicDots 2s infinite;
        }

        @keyframes pulseDim {
          0%, 100% { background-color: rgba(25, 31, 40, 0.25); }
          50% { background-color: rgba(25, 31, 40, 0.4); }
        }
        .shimmer-bg {
          animation: pulseDim 1.8s infinite ease-in-out;
        }
      `}</style>
      
      {/* 1. 지도 영역 */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#e5e8eb',
        }}
      >
        {!isLoaded && !error && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <p style={{ color: '#8b95a1' }}>지도를 불러오는 중...</p>
          </div>
        )}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <p style={{ color: '#f04452' }}>{error}</p>
          </div>
        )}
      </div>

      {/* 💡 1-2. 전체 화면 잠금 및 딤드 로딩 오버레이: z-index를 최상위(3000)로 올려 조작을 완전히 잠금 처리합니다. */}
      {isLoaded && isOverlayLoading && (
        <div 
          className="shimmer-bg"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000, // 칩스나 모달, 하단 버튼까지 모두 뒤로 밀어 터치를 완전히 잠금합니다.
            transition: 'all 0.3s ease',
            cursor: 'not-allowed' // 클릭 불가 시각적 힌트
          }}
          onClick={(e) => e.stopPropagation()} // 클릭 이벤트 전파 차단
        >
          <div style={{
            padding: '16px 28px',
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.12)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '16px' }}>🛡️</span>
            <span className="loading-dots" style={{ fontSize: '15px', fontWeight: '700', color: '#191f28', minWidth: '155px', textAlign: 'left' }}>
              안전 등급 데이터 분석 중
            </span>
          </div>
        </div>
      )}

      {/* 2. 우측 상단 통합 제어 섹션 */}
      <div style={{
        position: 'absolute',
        top: '20px', right: '0px', left: '0px',
        display: 'flex', flexDirection: 'column', gap: '12px',
        zIndex: 1000, 
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', width: '100%', boxSizing: 'border-box' }}>
          <button
            onClick={() => setIsHomeModalOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', borderRadius: '50%', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', cursor: 'pointer', fontSize: '16px'
            }}
          >
            🏠
          </button>

          <div style={{ display: 'flex', flexDirection: 'row', gap: '14px', padding: '10px 16px', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#333' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FFFBC4', boxShadow: '0 1px 3px rgba(0,0,0,0.2), inset 0 0 0 0.5px rgba(0,0,0,0.1)' }} /> 쾌적
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#333' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ff9500', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} /> 보통
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#333' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ff4d4d', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} /> 경계
            </div>
          </div>
        </div>

        <div className="no-scrollbar" style={{ width: '100%', display: 'flex', gap: '8px', overflowX: 'auto', whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch', padding: '0 20px 4px 20px', boxSizing: 'border-box' }}>
          {CRIME_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => handleSelectType(type.id)} 
              style={{
                flexShrink: 0, padding: '10px 16px', borderRadius: '20px', border: 'none',
                backgroundColor: selectedType === type.id ? '#191f28' : 'rgba(255,255,255,0.9)',
                color: selectedType === type.id ? '#fff' : '#4e5968', fontSize: '13px', fontWeight: '600',
                boxShadow: '0 4px 10px rgba(0,0,0,0.05)', backdropFilter: 'blur(5px)', cursor: 'pointer', margin: '4px 0px'
              }}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. 하단 오버레이 영역 */}
      <div style={{
        position: 'absolute', bottom: '40px', left: '0', width: '100%', padding: '0 20px',
        display: 'flex', flexDirection: 'column', gap: '14px', boxSizing: 'border-box', zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 18px', backgroundColor: '#fff', borderRadius: '25px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', alignSelf: 'center' }}>
          <span style={{ color: '#0064ff' }}>📍</span>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#4e5968' }}>
            {address || `위도 ${location?.lat.toFixed(4)} · 경도 ${location?.lng.toFixed(4)}`}
          </span>
        </div>

        <button
          onClick={() => handleGoToNews()}
          style={{
            width: '100%', padding: '18px', backgroundColor: '#0064ff', color: '#fff', border: 'none', borderRadius: '18px', fontSize: '16px', fontWeight: 'bold', boxShadow: '0 8px 20px rgba(0, 100, 255, 0.25)', cursor: 'pointer'
          }}
        >
          🔍 이 근처 뉴스 결과로 이동
        </button>
      </div>

      {/* 4. 홈화면 이동 여부를 묻는 모달 */}
      {isHomeModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px'
        }}>
          <div style={{
            position: 'relative', width: '100%', maxWidth: '320px', backgroundColor: '#ffffff', borderRadius: '26px', padding: '28px 24px 24px 24px', boxShadow: '0 20px 40px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxSizing: 'border-box'
          }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '700', color: '#191f28', lineHeight: '1.4' }}>
              홈 화면으로 돌아가시겠습니까?
            </h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', fontWeight: '600', color: '#f04452', lineHeight: '1.4' }}>
              (광고를 다시 시청해야합니다)
            </p>

            <div style={{ display: 'flex', width: '100%', gap: '12px' }}>
              <button onClick={() => setIsHomeModalOpen(false)} style={{ flex: 1, padding: '14px', backgroundColor: '#f2f4f6', color: '#4e5968', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
                취소
              </button>
              <button
                onClick={() => {
                  setIsHomeModalOpen(false);
                  onBack();
                }}
                style={{ flex: 1, padding: '14px', backgroundColor: '#191f28', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}