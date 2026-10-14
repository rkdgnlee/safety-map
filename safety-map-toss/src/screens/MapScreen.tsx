import { useCallback, useEffect, useRef, useState } from 'react';
import { useNaverMap } from '../hooks/useNaverMap';
import { useSafemapOverlay } from '../hooks/useSafemapOverlay';
import { NATURAL_HAZARD_LAYER_LIST } from '../constants/naturalHazardLayers';
import { getTossShareLink, share } from '@apps-in-toss/web-framework';
import { useNaturalHazardOverlay } from '../hooks/useNaturalHazardOverlay';
import { MAP_FREE_TYPE_CHANGES } from '../constants/ads';
import { showInterstitial } from '../services/interstitialAd';

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.9780 };

export type MapTab = 'crime' | 'hazard';

interface MapScreenProps {
  location: { lat: number; lng: number } | null;
  addressLabel: string | null; // ← 추가
  initialTab?: MapTab; // 결과 화면 미니맵에서 보던 레이어 쪽 탭으로 열기
  initialHazard?: string; // 자연재해 탭에서 처음 켤 레이어 (riverFlood, landslide)
  onBack: () => void;
}
const crimeKeyword: Record<string, string> = {
  all: '범죄 사건',
  child: '아동 어린이 범죄',
  elderly: '노인 범죄',
  sex: '성범죄 성폭력',
  violence: '폭행 폭력',
  robbery: '강도',
  theft: '절도',
};
const CRIME_TYPES = [
  { id: 'all',      label: '5대 범죄 전체' },
  { id: 'child',    label: '어린이 범죄' },
  { id: 'elderly',  label: '노인 범죄' },
  { id: 'sex',      label: '성폭력' },
  { id: 'violence', label: '폭력' },
  { id: 'robbery',  label: '강도' },
  { id: 'theft',    label: '절도' },         
];
const PROXY_BASE_URL = import.meta.env.VITE_PROXY_BASE_URL;

interface NewsItem {
  title: string;
  description: string;
  link: string;
  originallink: string;
  pubDate: string;
}
export default function MapScreen({ location, addressLabel, initialTab = 'crime', initialHazard, onBack }: MapScreenProps) {
  const [selectedType, setSelectedType] = useState('all');
  const [mapTab, setMapTab] = useState<MapTab>(initialTab);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const crimeViewCountRef = useRef(0);

  const handleSelectType = useCallback((typeId: string) => {
    if (typeId === 'all') {
      setSelectedType('all');
      return;
    }

    crimeViewCountRef.current += 1;

    // 맛보기로 몇 번은 바로 보여주고, 그다음 바꿀 때 전면 광고 후 이어서 보여준다
    if (crimeViewCountRef.current > MAP_FREE_TYPE_CHANGES) {
      crimeViewCountRef.current = 0;
      showInterstitial(() => setSelectedType(typeId));
    } else {
      setSelectedType(typeId);
    }
  }, []);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { map, isLoaded, error } = useNaverMap(mapContainerRef, {
    center: location ?? DEFAULT_CENTER,
    zoom: 16,
  });
  
  // 💡 훅에서 데이터 로딩 상태(isLoading)를 받아옵니다.
  // 지도를 많이 움직여 레이어를 여러 번 새로 불러오면 전면 광고 (화면은 그대로 유지)
  const handleOverlayAdTrigger = useCallback(() => {
    showInterstitial();
  }, []);

  const handleShare = async () => {
    try {
      const params = new URLSearchParams({
        lat: String(location?.lat ?? ''),
        lng: String(location?.lng ?? ''),
        address: addressLabel ?? '',
      });

      // 💡 intoss://<앱이름>?파라미터 형식
      const deepLink = `intoss://safety-map?${params.toString()}`;

      const tossLink = await getTossShareLink(
        deepLink,
        'https://static.toss.im/icons/png/4x/icon-share-dots-mono.png', // 공유 썸네일 이미지
      );

      await share({ message: tossLink });
    } catch (e) {
      console.error('공유 실패:', e);
    }
  };
  const { isLoading: isOverlayLoading, fetchOverlay } = useSafemapOverlay({
    map,
    isMapLoaded: isLoaded,
    crimeType: selectedType,
    onAdTrigger: handleOverlayAdTrigger,
  });
// 지금까지의 이 맵은 전부다 기존 기능으로 놔두고, 혹시 내가 이제 사용자에게 필요한 서비스가 무엇일까 고민해봤는데 포켓몬고 처럼 내 주변 뭐 1km기준으로 어떤 위험이 있는지? 예보가 발효된게 있는지 전부 보여주는거 어때? 그래서 비상 대피/편의점 뭐 경찰서 관공서 등등 경로탐색까지 가능하게끔.
  const {
    selectedHazard,
    isLoading: isHazardLoading,
    selectHazard,
    refreshSelectedHazard,
  } = useNaturalHazardOverlay({
    map,
    isMapLoaded: isLoaded,
    onAdTrigger: handleOverlayAdTrigger,
  });

  // 결과 화면에서 보던 자연재해 레이어를 지도 준비 후 한 번 켜 둔다
  const appliedInitialHazardRef = useRef(false);
  useEffect(() => {
    if (!isLoaded || !initialHazard || appliedInitialHazardRef.current) return;
    appliedInitialHazardRef.current = true;
    selectHazard(initialHazard);
  }, [isLoaded, initialHazard, selectHazard]);

  // 탭에 따라 "이 지역 검색" 버튼이 다른 레이어를 갱신하도록 분기
  const handleSearchThisArea = useCallback(() => {
    if (mapTab === 'crime') {
      fetchOverlay();
    } else {
      refreshSelectedHazard();
    }
  }, [mapTab, fetchOverlay, refreshSelectedHazard]);

  const isAnyLoading = mapTab === 'crime' ? isOverlayLoading : isHazardLoading;

  const [isNewsOpen, setIsNewsOpen] = useState(false);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState(false);

  const handleGoToNews = async () => {
    setIsNewsOpen(true);
    setIsNewsLoading(true);
    try {
      const query = `${addressLabel ?? '우리동네'} 사건 사고`;
      const res = await fetch(
        `${PROXY_BASE_URL}/api/news?query=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      setNewsItems(data.items ?? []);
    } catch {
      setNewsItems([]);
    } finally {
      setIsNewsLoading(false);
    }
  };
  // HTML 태그 + 특수문자 제거 유틸
  const stripHtml = (str: string) =>
    str.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'");

  // 날짜 포맷
  const formatDate = (pubDate: string) => {
    const d = new Date(pubDate);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

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
      {isLoaded && isAnyLoading && (
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
            <span style={{ fontSize: '16px' }}>{mapTab === 'crime' ? '🛡️' : '⚠️'}</span>
            <span className="loading-dots" style={{ fontSize: '15px', fontWeight: '700', color: '#191f28', minWidth: '155px', textAlign: 'left' }}>
              {mapTab === 'crime' ? '현재 위치 범죄 정보 가져오는 중 ' : '자연재해 정보 가져오는 중 '}
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
        {/* 탭 스위처: 범죄 지도 / 자연재해 지도 */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0 20px', width: '100%', boxSizing: 'border-box' }}>
          <div style={{
            display: 'flex',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}>
            {([
              { id: 'crime' as MapTab, label: '🛡️ 범죄' },
              { id: 'hazard' as MapTab, label: '⚠️ 자연재해' },
            ]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMapTab(tab.id)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '16px',
                  border: 'none',
                  backgroundColor: mapTab === tab.id ? '#191f28' : 'transparent',
                  color: mapTab === tab.id ? '#ffffff' : '#8b95a1',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', width: '100%', boxSizing: 'border-box' }}>
          <button
            onClick={onBack}
            aria-label="뒤로"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', borderRadius: '50%', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', cursor: 'pointer', fontSize: '16px'
            }}
          >
            ‹
          </button>

          <div style={{
            display: 'flex', flexDirection: 'row', gap: '14px',
            padding: '10px 16px',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            alignItems: 'center',
          }}>
            {mapTab === 'crime' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '600', color: '#333' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ffeb3b', border: '1px solid #e0d000', flexShrink: 0 }} />
                  빈도 낮음
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '600', color: '#333' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ff9500', flexShrink: 0 }} />
                  중간
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '600', color: '#333' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ff4d4d', flexShrink: 0 }} />
                  심함
                </div>
              </>
            ) : (
              NATURAL_HAZARD_LAYER_LIST.map((layer) => {
                const isSelected = selectedHazard === layer.id;
                return (
                  <div key={layer.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '600', color: isSelected ? '#333' : '#c1c7cd' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: layer.color, flexShrink: 0, opacity: isSelected ? 1 : 0.4 }} />
                    {layer.label}
                  </div>
                );
              })
            )}
            <button
              onClick={() => setIsInfoOpen(true)}
              style={{
                width: '18px', height: '18px', borderRadius: '50%',
                backgroundColor: '#d1d6db', border: 'none', cursor: 'pointer',
                fontSize: '11px', fontWeight: 'bold', color: '#ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 0, marginLeft: '2px', flexShrink: 0,
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

                {/* 💡 여기에 범례 추가 */}
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '700', color: '#191f28' }}>
                    📊 색상 범례
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { color: '#ffeb3b', border: '#e0d000', label: '빈도 낮음', desc: '간혹 발생하는 구간' },
                      { color: '#ff9500', border: '#ff9500', label: '중간',      desc: '주의가 필요한 구간' },
                      { color: '#ff4d4d', border: '#ff4d4d', label: '심함',      desc: '자주 발생하는 구간' },
                    ].map((item) => (
                      <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          width: '14px', height: '14px', borderRadius: '50%',
                          backgroundColor: item.color,
                          border: `1px solid ${item.border}`,
                          flexShrink: 0,
                        }} />
                        <div>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#191f28' }}>
                            {item.label}
                          </span>
                          <span style={{ fontSize: '12px', color: '#8b95a1', marginLeft: '6px' }}>
                            {item.desc}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p style={{ margin: '10px 0 0', fontSize: '11px', color: '#b0b8c1', lineHeight: '1.5' }}>
                    * 경찰청 통계 기반 밀도분석으로, 실제 위험도와 다를 수 있습니다.
                  </p>
                </div>

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
          {mapTab === 'crime' ? (
            CRIME_TYPES.map((type) => (
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
            ))
          ) : (
            NATURAL_HAZARD_LAYER_LIST.map((layer) => {
              const isActive = selectedHazard === layer.id;
              return (
                <button
                  key={layer.id}
                  onClick={() => selectHazard(layer.id)}
                  style={{
                    flexShrink: 0, padding: '10px 16px', borderRadius: '20px', border: 'none',
                    backgroundColor: isActive ? layer.color : 'rgba(255,255,255,0.9)',
                    color: isActive ? '#fff' : '#4e5968', fontSize: '13px', fontWeight: '600',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.05)', backdropFilter: 'blur(5px)', cursor: 'pointer', margin: '4px 0px'
                  }}
                >
                  {layer.label}
                </button>
              );
            })
          )}
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
          onClick={handleSearchThisArea}
          disabled={isAnyLoading || (mapTab === 'hazard' && !selectedHazard)}
          style={{
            padding: '14px 28px',
            backgroundColor: isAnyLoading ? '#4e5968' : '#191f28', // 검정 배경
            color: '#ffffff', // 흰색 텍스트
            border: 'none',
            borderRadius: '25px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: isAnyLoading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            opacity: isAnyLoading ? 0.6 : 1,
          }}
        >
          {isAnyLoading
            ? '🔍 불러오는 중...'
            : mapTab === 'hazard' && !selectedHazard
              ? '레이어를 선택해주세요'
              : '🔍 이 지역 검색'}
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
      


      {/* 뉴스 바텀시트 */}
      {isNewsOpen && (
        <div
          onClick={() => setIsNewsOpen(false)}
          style={{
            position: 'fixed', top: 0, left: 0,
            width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 2000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              backgroundColor: '#ffffff',
              borderRadius: '24px 24px 0 0',
              padding: '16px 20px 40px',
              maxHeight: '65vh',
              overflowY: 'auto',
            }}
          >
            {/* 핸들바 */}
            <div style={{
              width: '36px', height: '4px',
              backgroundColor: '#e5e8eb', borderRadius: '2px',
              margin: '0 auto 20px',
            }} />

            {/* 헤더 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#191f28' }}>
                📰 {addressLabel} 근처 뉴스
              </h3>
              <button
                onClick={() => setIsNewsOpen(false)}
                style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  backgroundColor: '#f2f4f6', border: 'none',
                  fontSize: '14px', color: '#4e5968', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {/* 로딩 */}
            {isNewsLoading && (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#8b95a1', fontSize: '14px' }}>
                뉴스 불러오는 중...
              </div>
            )}

            {/* 결과 없음 */}
            {!isNewsLoading && newsItems.length === 0 && (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#8b95a1', fontSize: '14px' }}>
                관련 뉴스가 없습니다.
              </div>
            )}

            {/* 뉴스 카드 목록 */}
            {!isNewsLoading && newsItems.map((item, idx) => ( 
              <a
                key={idx}
                href={item.originallink || item.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <div style={{
                  padding: '14px 0',
                  borderBottom: idx !== newsItems.length - 1 ? '1px solid #f2f4f6' : 'none',
                }}>
                  {/* 출처 + 날짜 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{
                      fontSize: '11px', fontWeight: '600', color: '#0064ff',
                      backgroundColor: '#eef4ff', padding: '2px 8px', borderRadius: '10px',
                    }}>
                      {item.originallink?.split('/')[2]?.replace('www.', '') ?? '뉴스'}
                    </span>
                    <span style={{ fontSize: '11px', color: '#b0b8c1' }}>
                      {formatDate(item.pubDate)}
                    </span>
                  </div>

                  {/* 제목 */}
                  <p style={{
                    margin: '0 0 4px 0',
                    fontSize: '14px', fontWeight: '600', color: '#191f28',
                    lineHeight: '1.5',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {stripHtml(item.title)}
                  </p>

                  {/* 요약 */}
                  <p style={{
                    margin: 0,
                    fontSize: '12px', color: '#8b95a1', lineHeight: '1.5',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {stripHtml(item.description)}
                  </p>
                </div>
              </a>
            ))}
            {!isNewsLoading && (
              <button
                onClick={() => {
                  const keyword = crimeKeyword[selectedType] ?? '범죄 사건';
                  const query = encodeURIComponent(`${addressLabel ?? ''} ${keyword}`);
                  window.open(
                    `https://search.naver.com/search.naver?where=news&query=${query}&sort=1`,
                    '_blank'
                  );
                }}
                style={{
                  width: '100%',
                  marginTop: '16px',
                  padding: '14px',
                  backgroundColor: '#f2f4f6',
                  color: '#4e5968',
                  border: 'none',
                  borderRadius: '14px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                🔍 네이버에서 더 많은 뉴스 보기
              </button>
            )}


          </div>
        </div>
      )}
    </div>
  );
}