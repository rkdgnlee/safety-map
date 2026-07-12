import { useCallback, useRef, useState } from 'react';
import { useNaverMap } from '../hooks/useNaverMap';
import { useSafemapOverlay } from '../hooks/useSafemapOverlay';

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.9780 };

interface MapScreenProps {
  location: { lat: number; lng: number } | null;
  addressLabel: string | null; // ← 추가
  pendingCrimeType: string | null;
  onCrimeTypeAdTrigger: (crimeType: string) => void;
  onBack: () => void;
}

const CRIME_TYPES = [
  { id: 'all',      label: '5대 범죄 전체' },
  { id: 'child',    label: '어린이 범죄' },
  { id: 'elderly',  label: '노인 범죄' },
  { id: 'sex',      label: '성폭력' },
  { id: 'violence', label: '폭력' },
  { id: 'robbery',  label: '강도' },
  { id: 'theft',    label: '절도' },         
];
const AD_TRIGGER_COUNT = 2;

export default function MapScreen({ location, addressLabel, pendingCrimeType, onCrimeTypeAdTrigger, onBack }: MapScreenProps) {
  const handleGoToNews = () => {
    const baseAddress = addressLabel || "우리 동네";
    const searchKeyword = `${baseAddress} 사건 사고`;
    const naverNewsUrl = `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(searchKeyword)}`;
    window.open(naverNewsUrl, '_blank');
  };
  
  const [selectedType, setSelectedType] = useState(pendingCrimeType ?? 'all');
  const [isHomeModalOpen, setIsHomeModalOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
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
    zoom: 16,
  });
  
  // 💡 훅에서 데이터 로딩 상태(isLoading)를 받아옵니다.
  const handleOverlayAdTrigger = useCallback(() => {
    onCrimeTypeAdTrigger(selectedType); // 현재 타입 보존한 채로 광고 화면으로
  }, [onCrimeTypeAdTrigger, selectedType]);

  const handleShare = () => {
    const baseUrl = window.location.origin; // 또는 토스 미니앱 딥링크 URL
    const params = new URLSearchParams({
      lat: String(location?.lat ?? ''),
      lng: String(location?.lng ?? ''),
      address: addressLabel ?? '',
    });
    const shareUrl = `${baseUrl}?${params.toString()}`;

    if (navigator.share) {
      navigator.share({
        title: '우리 동네 안전지도',
        text: `${addressLabel} 범죄 주의구간을 확인해보세요!`,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('링크가 복사되었습니다.');
    }
  };
  const { isLoading: isOverlayLoading, fetchOverlay } = useSafemapOverlay({
    map,
    isMapLoaded: isLoaded,
    crimeType: selectedType,
    onAdTrigger: handleOverlayAdTrigger,
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
      {/* {isLoaded && !isOverlayLoading && (
        <FirstGuideToast />
      )} */}
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
              현재 위치 범죄 정보 가져오는 중 
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

          <div style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '14px',
            padding: '10px 16px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            alignSelf: 'flex-end',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#333' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }} /> 안전
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#333' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ff9500' }} /> 주의
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#333' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ff4d4d' }} /> 위험
            </div>

            <button
              onClick={() => setIsInfoOpen(true)}
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#d1d6db',
                border: 'none',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 'bold',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                marginLeft: '2px',
                flexShrink: 0,
              }}
            >
              i
            </button>
          </div>
          {isInfoOpen && (
            <div
              onClick={() => setIsInfoOpen(false)}
              style={{
                position: 'fixed',
                top: 0, left: 0,
                width: '100vw', height: '100vh',
                backgroundColor: 'rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 200,
                padding: '20px',
                boxSizing: 'border-box',
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: '100%',
                  maxWidth: '320px',
                  backgroundColor: '#ffffff',
                  borderRadius: '20px',
                  padding: '24px',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#191f28' }}>
                    데이터 출처
                  </h3>
                  <button
                    onClick={() => setIsInfoOpen(false)}
                    style={{
                      width: '28px', height: '28px',
                      borderRadius: '50%',
                      backgroundColor: '#f2f4f6',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#4e5968',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ✕
                  </button>
                </div>

                <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#4e5968', lineHeight: '1.6' }}>
                  본 서비스는 경찰청에서 제공하는 행정구역별 범죄 밀도분석 공간정보를 활용합니다.
                </p>

                <div style={{
                  backgroundColor: '#f9fafb',
                  borderRadius: '12px',
                  padding: '14px',
                }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#8b95a1', fontWeight: '600' }}>
                    출처
                  </p>
                  <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#191f28', fontWeight: '500' }}>
                    행정안전부 제공 생활안전지도
                  </p>
                  <a
                    href="https://www.safemap.go.kr"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '13px', color: '#0064ff', textDecoration: 'none' }}
                  >
                    https://www.safemap.go.kr
                  </a>

                </div>
              </div>
            </div>
          )}
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
      <div style={{
        position: 'absolute',
        bottom: '40px',
        left: '0',
        width: '100%',
        padding: '0 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        boxSizing: 'border-box',
        zIndex: 10
      }}>
        {/* 이 지역 검색 — 전체 너비 */}
        <button
          onClick={fetchOverlay}
          disabled={isOverlayLoading}
          style={{
            padding: '14px 28px',
            backgroundColor: isOverlayLoading ? '#4e5968' : '#191f28', // 검정 배경
            color: '#ffffff', // 흰색 텍스트
            border: 'none',
            borderRadius: '25px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: isOverlayLoading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            opacity: isOverlayLoading ? 0.6 : 1,
          }}
        >
          {isOverlayLoading ? '🔍 불러오는 중...' : '🔍 이 지역 검색'}
        </button>

        {/* 뉴스 | 공유 — 2열 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          width: '100%',
        }}>
          <button
            onClick={handleGoToNews}
            style={{
              padding: '14px',
              backgroundColor: '#ffffff',
              color: '#191f28',
              border: '1px solid #e5e8eb',
              borderRadius: '16px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            }}
          >
            📰 이 근처 뉴스
          </button>
          <button
            onClick={handleShare}
            style={{
              padding: '14px',
              backgroundColor: '#ffffff',
              color: '#191f28',
              border: '1px solid #e5e8eb',
              borderRadius: '16px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            }}
          >
            🔗 지도 공유
          </button>
        </div>
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