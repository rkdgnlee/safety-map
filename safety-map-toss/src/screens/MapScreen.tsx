import { useState } from 'react';

interface MapScreenProps {
  location: { lat: number; lng: number } | null;
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

export default function MapScreen({ location, onBack }: MapScreenProps) {
  const [selectedType, setSelectedType] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      `}</style>
      
      {/* 1. 지도 영역 */}
      <div style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#e5e8eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <p style={{ color: '#8b95a1' }}>[V-World 지도 + {selectedType} 히트맵 레이어]</p>
      </div>

      {/* 2. 우측 상단 통합 제어 섹션 (범례 + 그 아래 칩스) */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '0px', // 전체 터치 영역 확보를 위해 0으로 변경
        left: '0px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 10,
        boxSizing: 'border-box'
      }}>
        
        {/* 2-1. 기존대로 횡방향으로 배치된 위험도 범례 (Legend) */}
        <div style={{
          display: 'flex',
          flexDirection: 'row', 
          gap: '14px',
          padding: '10px 16px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          marginRight: '20px', // 오른쪽에 딱 붙도록 마진 부여
          alignSelf: 'flex-end' // 범례 박스'만' 우측 정렬
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
        </div>

        {/* 2-2. 범례 아래쪽에 가로(횡방향)로 흐르는 범죄 유형 칩스 */}
        <div 
          className="no-scrollbar" 
          style={{
            width: '100%', 
            display: 'flex',
            gap: '8px',
            overflowX: 'auto', // 💡 이제 정상적으로 스크롤이 트리거됩니다!
            whiteSpace: 'nowrap',
            WebkitOverflowScrolling: 'touch',
            padding: '0 20px 4px 20px', // 양옆에 20px 여백을 주어 스크롤이 부드럽게 잘리도록 처리
            boxSizing: 'border-box'
          }}
        >
          {CRIME_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              style={{
                flexShrink: 0,
                padding: '10px 16px',
                borderRadius: '20px',
                border: 'none',
                backgroundColor: selectedType === type.id ? '#191f28' : 'rgba(255,255,255,0.9)',
                color: selectedType === type.id ? '#fff' : '#4e5968',
                fontSize: '13px',
                fontWeight: '600',
                boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                backdropFilter: 'blur(5px)',
                cursor: 'pointer'
              }}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. 하단 오버레이 영역 */}
      <div style={{
        position: 'absolute',
        bottom: '40px',
        left: '0',
        width: '100%',
        padding: '0 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxSizing: 'border-box',
        zIndex: 10
      }}>
        
        {/* 현재 검색 좌표 표시 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '10px 18px',
          backgroundColor: '#fff',
          borderRadius: '25px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          alignSelf: 'center'
        }}>
          <span style={{ color: '#0064ff' }}>📍</span>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#4e5968' }}>
            위도 {location?.lat.toFixed(4)} · 경도 {location?.lng.toFixed(4)}
          </span>
        </div>

        {/* 메인 액션 버튼 */}
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            width: '100%',
            padding: '18px',
            backgroundColor: '#0064ff',
            color: '#fff',
            border: 'none',
            borderRadius: '18px',
            fontSize: '16px',
            fontWeight: 'bold',
            boxShadow: '0 8px 20px rgba(0, 100, 255, 0.25)',
            cursor: 'pointer'
          }}
        >
          🔍 안전 상세 보고서 보기
        </button>
      </div>

      {/* 4. 디테일 보고서 다이얼로그 (모달) */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '350px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '30px',
            padding: '30px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#191f28' }}>
                  Safety Report
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#8b95a1' }}>
                  상세 지역 안전 분석 정보입니다.
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  backgroundColor: '#f2f4f6', border: 'none',
                  fontSize: '16px', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: '#4e5968'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{
              flex: 1,
              minHeight: '200px',
              backgroundColor: '#f9fafb',
              borderRadius: '20px',
              border: '1px dashed #d1d6db',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8b95a1',
              fontSize: '14px'
            }}>
              [Safety Content Area]
            </div>

            <button
              onClick={onBack}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: '#191f28',
                color: '#fff',
                border: 'none',
                borderRadius: '16px',
                fontSize: '15px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              홈 화면으로 이동
            </button>
          </div>
        </div>
      )}
    </div>
  );
}