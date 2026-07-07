import { useState } from 'react';
import HomeScreen from './screens/HomeScreen';
import MapScreen from './screens/MapScreen';
import AdComponent from './screens/AdComponent';

export type ScreenType = 'HOME' | 'LOADING_AD' | 'AD' | 'MAP';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('HOME');
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [adContext, setAdContext] = useState<'home' | 'map'>('home'); // ← 추가
  const [pendingCrimeType, setPendingCrimeType] = useState<string | null>(null); // ← 추가

  // 1. 홈 → 광고
  const handleStartProcess = (locationData: { lat: number; lng: number }, addressText: string) => {
    setSelectedLocation(locationData);
    setSelectedAddress(addressText); // 💡 받아온 한글 주소를 상태에 저장!
    setAdContext('home');
    setCurrentScreen('LOADING_AD');

    setTimeout(() => {
      setCurrentScreen('AD');
    }, 1500);
  };

  // 2. MapScreen에서 범죄유형 변경 시 광고 트리거
  const handleCrimeTypeAdTrigger = (crimeType: string) => {
    setPendingCrimeType(crimeType);
    setAdContext('map');
    setCurrentScreen('AD');
  };

  // 3. 광고 닫힘
  const handleAdClose = () => {
    setCurrentScreen('MAP');
  };

  const handleGoBackHome = () => {
    setSelectedLocation(null);
    setSelectedAddress(''); // 💡 홈으로 갈 때 주소 초기화
    setPendingCrimeType(null);
    setCurrentScreen('HOME');
  };

  return (
    <div style={{ width: '100%', height: '100vh', backgroundColor: '#fff', overflowX: 'hidden' }}>
      {currentScreen === 'HOME' && (
        <HomeScreen onSearchComplete={handleStartProcess} />
      )}

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
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🛡️</div>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#191f28', margin: '0 0 8px 0' }}>
            안전 분석 결과를 가져오고 있어요
          </h3>
          <p style={{ fontSize: '14px', color: '#8b95a1', margin: 0 }}>
            잠시 후 광고 시청 후 지도가 나타납니다.
          </p>
        </div>
      )}

      {currentScreen === 'AD' && (
        <AdComponent
          onClose={handleAdClose}
          context={adContext} // ← 수정
        />
      )}

      {currentScreen === 'MAP' && (
        <MapScreen
          location={selectedLocation}
          address={selectedAddress}
          pendingCrimeType={pendingCrimeType} // ← 추가
          onCrimeTypeAdTrigger={handleCrimeTypeAdTrigger} // ← 추가
          onBack={handleGoBackHome}
        />
      )}
    </div>
  );
}

// 인천부평 37.4894 경도 126.7224
// 위례: 37.4722 경도 127.1431 
// 뉴스 결과 링크 붙이기 -> 범죄 로딩 체크하기 