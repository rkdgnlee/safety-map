import { graniteEvent } from '@apps-in-toss/web-framework';
import { useEffect, useRef, useState } from 'react';
import AdNoticeHost from './components/AdNoticeSheet';
import { closeAdNotice, requestAdWithNotice, useAdNoticeOpen } from './services/adNotice';
import PlaceSearchSheet from './components/PlaceSearchSheet';
import type { MiniMapLayerId } from './components/ResultMiniMap';
import { RESULT_VIEWS_PER_AD } from './constants/ads';
import { getCategory, type CategoryId, type Place } from './constants/categories';
import { preferenceActions, usePreferences } from './hooks/usePreferences';
import HomeScreen from './screens/HomeScreen';
import MapScreen, { type MapTab } from './screens/MapScreen';
import ResultScreen from './screens/ResultScreen';
import SettingsScreen from './screens/SettingsScreen';
import { preloadInterstitial } from './services/interstitialAd';
import { getCurrentPlace } from './services/locationService';

export type ScreenType = 'HOME' | 'RESULT' | 'SETTINGS' | 'MAP';

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
  const [settingsInfo, setSettingsInfo] = useState<'changelog' | undefined>(undefined);
  const [place, setPlace] = useState<Place | null>(readDeepLinkPlace);
  const [placeStatus, setPlaceStatus] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<CategoryId>('hiking');
  // 카테고리를 먼저 눌렀는데 장소가 없으면 검색 후 바로 결과로 이동
  const [searchState, setSearchState] = useState<{ open: boolean; nextCategory: CategoryId | null }>({
    open: false,
    nextCategory: null,
  });
  // 앱을 켠 동안 결과를 본 횟수 — 많이 보는 사용자에게만 전면 광고
  const resultViewCount = useRef(0);
  // 결과 하나를 오래·깊이 읽은 사용자에게, 다음 결과로 넘어갈 때 안내 후 한 번만 전면 광고
  const dwellAdPending = useRef(false);
  const dwellAdShown = useRef(false);
  const [mapTab, setMapTab] = useState<MapTab>('crime');
  const [mapHazard, setMapHazard] = useState<string | undefined>(undefined);
  // 사용자가 직접 고른 장소는 위치 설정이 바뀌어도 덮어쓰지 않는다
  const isManualPlace = useRef(place !== null);

  useEffect(() => {
    preloadInterstitial();
  }, []);

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

  // 결과로 넘어가는 모든 경로(카드·칩·최근 본 장소·다른 장소)는 여기를 거친다.
  // 광고 차례면 안내 시트로 먼저 알리고, 사용자가 동의했을 때만 광고 후 이동한다. 뒤로가기에는 광고가 없다.
  const openResult = (nextCategory: CategoryId, nextPlace: Place) => {
    const show = () => {
      setCategoryId(nextCategory);
      preferenceActions.addRecentView({ place: nextPlace, categoryId: nextCategory });
      setCurrentScreen('RESULT');
    };
    const isCountTurn = (resultViewCount.current + 1) % RESULT_VIEWS_PER_AD === 0;
    const isDwellTurn = dwellAdPending.current && !dwellAdShown.current;
    if (!isCountTurn && !isDwellTurn) {
      resultViewCount.current += 1;
      show();
      return;
    }
    const category = getCategory(nextCategory);
    requestAdWithNotice({
      title: '다음 결과 전에 광고가 한 번 나와요',
      description: `광고가 끝나면 바로 ${category.emoji} ${category.name} 결과를 보여드려요.`,
      confirmLabel: '광고 보고 계속하기',
      onContinue: () => {
        if (isDwellTurn) {
          dwellAdPending.current = false;
          dwellAdShown.current = true;
          resultViewCount.current = 0; // 방금 광고를 봤으니 횟수는 처음부터 다시 센다
        } else {
          resultViewCount.current += 1;
        }
        show();
      },
    });
  };

  const handleSelectCategory = (nextCategory: CategoryId) => {
    if (place) {
      openResult(nextCategory, place);
    } else {
      setSearchState({ open: true, nextCategory });
    }
  };

  const handleSelectPlace = (nextPlace: Place) => {
    const { nextCategory } = searchState;
    setSearchState({ open: false, nextCategory: null });
    isManualPlace.current = true;
    setPlace(nextPlace);
    setPlaceStatus(null);
    if (nextCategory) openResult(nextCategory, nextPlace);
  };

  // 토스 앱의 뒤로가기: 홈이 아닐 때는 앱을 닫지 않고 이전 화면으로
  const adNoticeOpen = useAdNoticeOpen();
  const handleNativeBack = () => {
    if (adNoticeOpen) closeAdNotice();
    else if (searchState.open) setSearchState({ open: false, nextCategory: null });
    else if (currentScreen === 'MAP') setCurrentScreen('RESULT');
    else setCurrentScreen('HOME');
  };
  const nativeBackRef = useRef(handleNativeBack);
  nativeBackRef.current = handleNativeBack;
  const needsBackHandling = currentScreen !== 'HOME' || searchState.open || adNoticeOpen;

  useEffect(() => {
    // 홈에서는 등록하지 않아 기본 동작(미니앱 닫기)을 그대로 둔다
    if (!needsBackHandling) return;
    try {
      return graniteEvent.addEventListener('backEvent', {
        onEvent: () => nativeBackRef.current(),
        onError: (error) => console.error('[back] 뒤로가기 처리 실패:', error),
      });
    } catch (error) {
      // 브라우저 개발 환경 등 네이티브 이벤트가 없는 곳
      console.warn('[back] backEvent 를 등록하지 못했어요:', error);
    }
  }, [needsBackHandling]);

  // 밤길 → 범죄주의구간 지도. 맛보기로 바로 열고, 지도 안에서 많이 둘러보면 전면 광고
  const handleOpenMap = (layer: MiniMapLayerId) => {
    setMapTab(layer === 'crime' ? 'crime' : 'hazard');
    setMapHazard(layer === 'flood' ? 'riverFlood' : layer === 'landslide' ? 'landslide' : undefined);
    setCurrentScreen('MAP');
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', backgroundColor: '#fff', overflowX: 'hidden' }}>
      {currentScreen === 'HOME' && (
        <HomeScreen
          place={place}
          placeStatus={placeStatus}
          onOpenSearch={() => setSearchState({ open: true, nextCategory: null })}
          onSelectCategory={handleSelectCategory}
          onSelectRecentSearch={(item) => {
            isManualPlace.current = true;
            setPlace(item);
            setPlaceStatus(null);
            preferenceActions.addSearchHistory(item); // 최근에 쓴 순서로 맨 앞으로
          }}
          onOpenSettings={() => {
            setSettingsInfo(undefined);
            setCurrentScreen('SETTINGS');
          }}
          onOpenChangelog={() => {
            setSettingsInfo('changelog');
            setCurrentScreen('SETTINGS');
          }}
        />
      )}

      {currentScreen === 'RESULT' && place && (
        <ResultScreen
          categoryId={categoryId}
          place={place}
          onChangeCategory={(next) => openResult(next, place)}
          onOpenMap={handleOpenMap}
          onSearchPlace={() => setSearchState({ open: true, nextCategory: categoryId })}
          onEngaged={() => {
            if (!dwellAdShown.current) dwellAdPending.current = true;
          }}
        />
      )}

      {currentScreen === 'SETTINGS' && <SettingsScreen initialInfo={settingsInfo} />}

      {currentScreen === 'MAP' && (
        <MapScreen
          location={place}
          addressLabel={place?.label ?? null}
          initialTab={mapTab}
          initialHazard={mapHazard}
        />
      )}

      <AdNoticeHost />

      {searchState.open && (
        <PlaceSearchSheet
          title={
            searchState.nextCategory
              ? `${getCategory(searchState.nextCategory).emoji} ${getCategory(searchState.nextCategory).name}, 어디로 가세요?`
              : undefined
          }
          onSelect={handleSelectPlace}
          onClose={() => setSearchState({ open: false, nextCategory: null })}
        />
      )}
    </div>
  );
}
