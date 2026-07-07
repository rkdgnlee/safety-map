// useNaverMap.ts
import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    naver: any;
    navermap_authFailure?: () => void;
  }
}

const NAVER_MAPS_CLIENT_ID = import.meta.env.VITE_NAVER_MAPS_CLIENT_ID;
const SCRIPT_ID = 'naver-maps-sdk';

interface UseNaverMapOptions {
  center: { lat: number; lng: number };
  zoom?: number;
}

export function useNaverMap(
  containerRef: React.RefObject<HTMLDivElement>,
  options: UseNaverMapOptions
) {
  const mapInstanceRef = useRef<any>(null);
  const [isSdkLoaded, setIsSdkLoaded] = useState(false); // SDK 로드 완료
  const [isReady, setIsReady] = useState(false);          // 지도 idle 완료 ← 핵심
  const [error, setError] = useState<string | null>(null);

  // 1. SDK 스크립트 로드
  useEffect(() => {
    if (!NAVER_MAPS_CLIENT_ID) {
      setError('네이버 지도 Client ID가 설정되지 않았습니다.');
      return;
    }

    window.navermap_authFailure = () => {
      setError('네이버 지도 인증에 실패했습니다.');
    };

    if (window.naver && window.naver.maps) {
      setIsSdkLoaded(true);
      return;
    }

    if (document.getElementById(SCRIPT_ID)) return;

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NAVER_MAPS_CLIENT_ID}`;
    script.async = true;
    script.onload = () => setIsSdkLoaded(true);
    script.onerror = () => setError('네이버 지도 SDK 로드에 실패했습니다.');
    document.head.appendChild(script);

    return () => {
      window.navermap_authFailure = undefined;
    };
  }, []);

  // 2. SDK 로드 완료 → 지도 생성 → idle 대기
  useEffect(() => {
    if (!isSdkLoaded || !containerRef.current || mapInstanceRef.current) return;

    try {
      const mapInstance = new window.naver.maps.Map(containerRef.current, {
        center: new window.naver.maps.LatLng(options.center.lat, options.center.lng),
        zoom: options.zoom ?? 15,
      });

      mapInstanceRef.current = mapInstance;

      // 💡 지도가 완전히 준비된 후(idle) isReady를 true로
      const idleListener = window.naver.maps.Event.addListener(
        mapInstance,
        'idle',
        () => {
          setIsReady(true);
          window.naver.maps.Event.removeListener(idleListener);
        }
      );
    } catch (e) {
      setError('지도 초기화 중 오류가 발생했습니다.');
    }
  }, [isSdkLoaded, containerRef, options.center, options.zoom]);

  return {
    map: mapInstanceRef.current,
    isLoaded: isReady, // ← idle 완료 후 true
    error,
  };
}