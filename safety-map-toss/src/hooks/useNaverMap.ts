// safety-map-toss/src/hooks/useNaverMap.ts
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
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. SDK 스크립트 로드 (한 번만)
  useEffect(() => {
    if (!NAVER_MAPS_CLIENT_ID) {
      setError('네이버 지도 Client ID가 설정되지 않았습니다.');
      return;
    }

    // 인증 실패 감지
    window.navermap_authFailure = () => {
      setError('네이버 지도 인증에 실패했습니다. Client ID 또는 등록된 도메인을 확인해주세요.');
    };

    // 이미 로드되어 있으면 바로 완료 처리
    if (window.naver && window.naver.maps) {
      setIsLoaded(true);
      return;
    }

    // 이미 script 태그가 주입되어 있으면 중복 삽입 방지
    if (document.getElementById(SCRIPT_ID)) {
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NAVER_MAPS_CLIENT_ID}`;
    script.async = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => setError('네이버 지도 SDK 로드에 실패했습니다.');

    document.head.appendChild(script);

    return () => {
      window.navermap_authFailure = undefined;
    };
  }, []);

  // 2. SDK 로드 완료 + 컨테이너 준비되면 지도 인스턴스 생성
  useEffect(() => {
    if (!isLoaded || !containerRef.current || mapInstanceRef.current) {
      return;
    }

    try {
      mapInstanceRef.current = new window.naver.maps.Map(containerRef.current, {
        center: new window.naver.maps.LatLng(options.center.lat, options.center.lng),
        zoom: options.zoom ?? 15,
      });
    } catch (e) {
      setError('지도 초기화 중 오류가 발생했습니다.');
    }
  }, [isLoaded, containerRef, options.center, options.zoom]);

  return { map: mapInstanceRef.current, isLoaded, error };
}