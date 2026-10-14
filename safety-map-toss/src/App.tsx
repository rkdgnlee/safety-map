import { useEffect, useRef, useState } from 'react';
import PlaceSearchSheet from './components/PlaceSearchSheet';
import type { CategoryId, Place } from './constants/categories';
import { preferenceActions, usePreferences } from './hooks/usePreferences';
import AdComponent from './screens/AdComponent';
import HomeScreen from './screens/HomeScreen';
import MapScreen from './screens/MapScreen';
import ResultScreen from './screens/ResultScreen';
import SettingsScreen from './screens/SettingsScreen';
import { getCurrentPlace } from './services/locationService';

export type ScreenType = 'HOME' | 'RESULT' | 'SETTINGS' | 'LOADING_AD' | 'AD' | 'MAP';

// 딥링크(?lat=&lng=&address=)로 들어온 위치
function readDeepLinkPlace(): Place | null {
  const params = new URLSearchParams(window.location.search);
  const lat = params.get('lat');
  const lng = params.get('lng');
  if (!lat || !lng) return null;
  return { label: params.get('address') ?? '공유된 위치', lat: parseFloat(lat), lng: parseFloat(lng) };
}

export default function App() {
  const { useCurrentLocation, defaultPlace } = usePreferences();
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('HOME');
  const [place, setPlace] = useState<Place | null>(readDeepLinkPlace);
  const [placeStatus, setPlaceStatus] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<CategoryId>('hiking');
  // 카테고리를 먼저 눌렀는데 장소가 없으면 검색 후 바로 결과로 이동
  const [searchState, setSearchState] = useState<{ open: boolean; nextCategory: CategoryId | null }>({
    open: false,
    nextCategory: null,
  });
  const [adContext, setAdContext] = useState<'home' | 'map'>('home');
  const [pendingCrimeType, setPendingCrimeType] = useState<string | null>(null);
  // 사용자가 직접 고른 장소는 위치 설정이 바뀌어도 덮어쓰지 않는다
  const isManualPlace = useRef(place !== null);

  useEffect(() => {
    if (isManualPlace.current) return;

    if (!useCurrentLocation) {
      setPlace(defaultPlace);
      setPlaceStatus(null);
      return;
    }

    let cancelled = false;
    setPlaceStatus('위치를 확인하고 있어요');
    getCurrentPlace()
      .then((current) => {
        if (cancelled || isManualPlace.current) return;
        setPlace(current);
        setPlaceStatus(null);
      })
      .catch(() => {
        if (cancelled || isManualPlace.current) return;
        setPlace(defaultPlace);
        setPlaceStatus(defaultPlace ? null : '장소를 선택해 주세요');
      });
    return () => {
      cancelled = true;
    };
  }, [useCurrentLocation, defaultPlace]);

  const openResult = (nextCategory: CategoryId, nextPlace: Place) => {
    setCategoryId(nextCategory);
    preferenceActions.addRecentView({ place: nextPlace, categoryId: nextCategory });
    setCurrentScreen('RESULT');
  };

  const handleSelectCategory = (nextCategory: CategoryId) => {
    if (place) {
      openResult(nextCategory, place);
    } else {
      setSearchState({ open: true, nextCategory });
    }
  };

  const handleSelectPlace = (nextPlace: Place) => {
    isManualPlace.current = true;
    setPlace(nextPlace);
    setPlaceStatus(null);
    const { nextCategory } = searchState;
    setSearchState({ open: false, nextCategory: null });
    if (nextCategory) openResult(nextCategory, nextPlace);
  };

  // 밤길 → 범죄주의구간 지도 (기존 광고 → 지도 흐름)
  const handleOpenMap = () => {
    setAdContext('home');
    setCurrentScreen('LOADING_AD');
    setTimeout(() => setCurrentScreen('AD'), 1500);
  };

  const handleCrimeTypeAdTrigger = (crimeType: string) => {
    setPendingCrimeType(crimeType);
    setAdContext('map');
    setCurrentScreen('AD');
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', backgroundColor: '#fff', overflowX: 'hidden' }}>
      {currentScreen === 'HOME' && (
        <HomeScreen
          place={place}
          placeStatus={placeStatus}
          onOpenSearch={() => setSearchState({ open: true, nextCategory: null })}
          onSelectCategory={handleSelectCategory}
          onOpenRecent={(view) => {
            isManualPlace.current = true;
            setPlace(view.place);
            openResult(view.categoryId, view.place);
          }}
          onOpenSettings={() => setCurrentScreen('SETTINGS')}
        />
      )}

      {currentScreen === 'RESULT' && place && (
        <ResultScreen
          categoryId={categoryId}
          place={place}
          onBack={() => setCurrentScreen('HOME')}
          onChangeCategory={(next) => openResult(next, place)}
          onOpenMap={handleOpenMap}
        />
      )}

      {currentScreen === 'SETTINGS' && <SettingsScreen onBack={() => setCurrentScreen('HOME')} />}

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

      {currentScreen === 'AD' && <AdComponent onClose={() => setCurrentScreen('MAP')} context={adContext} />}

      {currentScreen === 'MAP' && (
        <MapScreen
          location={place}
          addressLabel={place?.label ?? null}
          pendingCrimeType={pendingCrimeType}
          onCrimeTypeAdTrigger={handleCrimeTypeAdTrigger}
          onBack={() => {
            setPendingCrimeType(null);
            setCurrentScreen('RESULT');
          }}
        />
      )}

      {searchState.open && (
        <PlaceSearchSheet
          onSelect={handleSelectPlace}
          onClose={() => setSearchState({ open: false, nextCategory: null })}
        />
      )}
    </div>
  );
}
