import React, { useState } from 'react';
import HomeScreen from './screens/HomeScreen';
import MapScreen from './screens/MapScreen';
import AdScreen from './screens/AdScreen';

export type ScreenType = 'HOME' | 'LOADING_AD' | 'AD' | 'MAP';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('HOME');
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);

  // 1. 홈 화면에서 하단 최종 버튼을 눌렀을 때 호출
  const handleStartProcess = (locationData: { lat: number; lng: number }) => {
    setSelectedLocation(locationData);
    setCurrentScreen('LOADING_AD'); // 1단계: 광고 로딩 상태로 변경

    // 1.5초 동안 로딩 애니메이션을 보여준 뒤 실제 전면 광고 화면으로 전환
    setTimeout(() => {
      setCurrentScreen('AD'); // 2단계: 전면 광고 진입
    }, 1500);
  };

  // 2. 전면 광고 닫힘 감지
  const handleAdClose = () => {
    setCurrentScreen('MAP'); // 3단계: 최종 지도 결과 화면
  };

  const handleGoBackHome = () => {
    setSelectedLocation(null);
    setCurrentScreen('HOME');
  };

  return (
    <div style={{ width: '100%', height: '100vh', backgroundColor: '#fff', overflowX: 'hidden' }}>
      {currentScreen === 'HOME' && (
        <HomeScreen onSearchComplete={handleStartProcess} />
      )}
      
      {/* ⏳ 광고 로딩 화면 인터페이스 */}
      {currentScreen === 'LOADING_AD' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#ffffff',
          fontFamily: '"Pretendard", sans-serif'
        }}>
          {/* 토스 스타일의 깔끔한 인디케이터나 이모지 */}
          <div style={{ fontSize: '40px', marginBottom: '16px', animation: 'infinite' }}>🛡️</div>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#191f28', margin: '0 0 8px 0' }}>
            안전 분석 결과를 가져오고 있어요
          </h3>
          <p style={{ fontSize: '14px', color: '#8b95a1', margin: 0 }}>
            잠시 후 광고 시청 후 지도가 나타납니다.
          </p>
        </div>
      )}
      
      {currentScreen === 'AD' && (
        <AdScreen onClose={handleAdClose} />
      )}
      
      {currentScreen === 'MAP' && (
        <MapScreen location={selectedLocation} onBack={handleGoBackHome} />
      )}
    </div>
  );
}