import React, { useState } from 'react';
import BannerScreen from './BannerScreen';

interface LocationItem {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

const RECOMMENDED_LOCATIONS: LocationItem[] = [
  { id: 'gangnam', label: '서울 강남구', lat: 37.4979, lng: 127.0276 },
  { id: 'seongsu', label: '서울 성수', lat: 37.5446, lng: 127.0565 },
  { id: 'pangyo', label: '판교', lat: 37.4020, lng: 127.1086 },
  { id: 'wirye', label: '위례', lat: 37.4722, lng: 127.1431 },
  { id: 'bupyeong', label: '인천 부평', lat: 37.4894, lng: 126.7224 },
  { id: 'bucheon', label: '부천', lat: 37.4843, lng: 126.7827 },
];

interface HomeScreenProps {
  onSearchComplete: (location: { lat: number; lng: number }) => void;
}

export default function HomeScreen({ onSearchComplete }: HomeScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // 현재 어떤 방식으로 위치가 선택되었는지 추적 ('CHIP' | 'CURRENT' | 'CUSTOM')
  const [searchType, setSearchType] = useState<'CHIP' | 'CURRENT' | 'CUSTOM'>('CUSTOM');
  
  // 현재 확정된 좌표 상태 관리
  const [activeCoordinate, setActiveCoordinate] = useState<{ lat: number; lng: number } | null>(null);

  // 1. 추천 지역 칩 클릭 -> 해당 칩 이름과 좌표 매핑
  const handleSelectChip = (loc: LocationItem) => {
    setSearchQuery(loc.label);
    setSearchType('CHIP');
    setActiveCoordinate({ lat: loc.lat, lng: loc.lng });
  };

  // 2. 현재 위치 클릭 -> 현재 위치 이름과 좌표 매핑
  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setSearchQuery('내 주변 현재 위치');
          setSearchType('CURRENT');
          setActiveCoordinate({ lat: latitude, lng: longitude });
        },
        (error) => {
          alert('현재 위치 권한을 확인해주세요.');
          setSearchQuery('광주광역시 (기본값)');
          setSearchType('CURRENT');
          setActiveCoordinate({ lat: 35.1468, lng: 126.8481 });
        }
      );
    } else {
      alert('위치 서비스를 지원하지 않는 기기입니다.');
    }
  };

  // 3. 인풋창 직접 타이핑 감지 핸들러
  const handleInputChange = (text: string) => {
    setSearchQuery(text);
    
    // 💡 글자가 입력되거나 지워지면 무조건 '사용자 정의' 모드로 전환
    setSearchType('CUSTOM');
    setActiveCoordinate(null); // 직접 입력 시 기존 칩 좌표 초기화
  };

  // 4. 하단 최종 분석 버튼 클릭
  const handleMainButtonClick = () => {
    if (!searchQuery.trim()) {
      alert('주소를 입력하거나 아래 추천 지역을 선택해주세요.');
      return;
    }

    if (searchType === 'CUSTOM') {
      console.log("✏️ 사용자 정의 검색어로 진입 시도:", searchQuery);
      // [TODO] 행정안전부 주소 검색 API 등을 붙여 검색어로 좌표를 받아와야 하는 시점입니다.
      // 지금은 API 연동 전이므로 임시로 '사용자 정의' 전용 가상 타겟 좌표를 넘깁니다.
      const customMockCoordinate = { lat: 37.5665, lng: 126.9780 }; // 예: 서울시청 중심 좌표
      onSearchComplete(customMockCoordinate);
    } else {
      // 칩이나 현재 위치 상태일 때는 저장된 고유 좌표 그대로 전송
      const finalCoord = activeCoordinate || { lat: 35.1468, lng: 126.8481 };
      onSearchComplete(finalCoord);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      padding: '24px 20px',
      boxSizing: 'border-box',
      backgroundColor: '#f9fafb',
      fontFamily: '"Pretendard", -apple-system, sans-serif'
    }}>
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      
      {/* 타이틀 */}
      <div style={{ marginTop: '24px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#191f28', margin: 0, letterSpacing: '-0.5px' }}>
          Find your area
        </h1>
      </div>

      {/* 검색창 */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#8b95a1', fontSize: '18px' }}>
          🔍
        </span>
        <input
          type="text"
          placeholder="Enter your address"
          value={searchQuery}
          onChange={(e) => handleInputChange(e.target.value)} // 💡 입력 감지 변경
          style={{
            width: '100%',
            padding: '16px 16px 16px 48px',
            borderRadius: '16px',
            border: 'none',
            backgroundColor: '#f2f4f6',
            fontSize: '16px',
            color: '#191f28',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* 횡 스크롤 칩 목록 */}
      <div 
        className="no-scrollbar"
        style={{ 
          display: 'flex', 
          gap: '8px', 
          overflowX: 'auto', 
          whiteSpace: 'nowrap',
          marginBottom: '32px',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        <button
          onClick={handleCurrentLocation}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 16px',
            backgroundColor: '#0064ff',
            color: '#ffffff',
            border: 'none',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          🌐 현재위치
        </button>

        {RECOMMENDED_LOCATIONS.map((loc) => (
          <button
            key={loc.id}
            onClick={() => handleSelectChip(loc)}
            style={{
              padding: '10px 16px',
              backgroundColor: '#eef1f4',
              color: '#4e5968',
              border: 'none',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            {loc.label}
          </button>
        ))}

        {/* 💡 사용자가 직접 타이핑 중일 때만 목록 맨 끝에 동적으로 나타나는 '사용자 정의' 탭 */}
        {searchType === 'CUSTOM' && searchQuery.trim().length > 0 && (
          <div
            style={{
              padding: '10px 16px',
              backgroundColor: '#eef1f4',
              color: '#0064ff', // 사용자 정의 상태임을 강조하기 위해 텍스트 색 변경
              border: '1px solid #0064ff',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '600',
              flexShrink: 0
            }}
          >
            ✏️ 사용자 정의
          </div>
        )}
      </div>

      {/* 배너 영역 */}
      <div style={{ flex: 1, minHeight: '150px', marginBottom: '24px' }}>
        <BannerScreen />
      </div>

      {/* 하단 액션 버튼 */}
      <div style={{ marginTop: 'auto' }}>
        <button
          onClick={handleMainButtonClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '18px',
            backgroundColor: '#0064ff',
            color: '#ffffff',
            border: 'none',
            borderRadius: '18px',
            fontSize: '16px',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(0, 100, 255, 0.2)',
            cursor: 'pointer'
          }}
        >
          🛡️ Check My Neighborhood Safety
        </button>
      </div>

    </div>
  );
}