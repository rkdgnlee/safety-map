// safety-map-toss/src/hooks/useSafemapOverlay.ts
import { useEffect, useRef, useState } from 'react';
import { SAFEMAP_LAYERS } from '../constants/safemapLayers';

const PROXY_BASE_URL = import.meta.env.VITE_PROXY_BASE_URL;

interface UseSafemapOverlayOptions {
  map: any;
  isMapLoaded: boolean;
  crimeType: string;
}

export function useSafemapOverlay({ map, isMapLoaded, crimeType }: UseSafemapOverlayOptions) {
  const overlayRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // 💡 빠른 지도 이동이나 칩 변경 시, 이전 비동기 요청 이미지와 꼬이지 않도록 추적하는 Ref
  const latestRequestUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isMapLoaded || !map) return;

    const layerConfig = SAFEMAP_LAYERS[crimeType] ?? SAFEMAP_LAYERS['all'];

    const updateOverlay = () => {
      const bounds = map.getBounds();
      const ne = bounds.getNE();
      const sw = bounds.getSW();
      const bbox = `${sw.lng()},${sw.lat()},${ne.lng()},${ne.lat()}`;

      const params = new URLSearchParams({
        bbox,
        endpoint: layerConfig.endpoint,
        layerName: layerConfig.layerName,
        styles: layerConfig.styles,
        width: '512',
        height: '512',
      });

      const imageUrl = `${PROXY_BASE_URL}/api/safemap-wms?${params.toString()}`;
      
      // 현재 요청을 최신 요청으로 기록하고 로딩 활성화
      latestRequestUrlRef.current = imageUrl;
      setIsLoading(true);

      // 💡 가상 Image 객체를 생성해 브라우저 캐시에 먼저 다운로드 시킵니다.
      const preloader = new Image();
      preloader.src = imageUrl;
      
      preloader.onload = () => {
        // 만약 로딩 도중 유저가 지도를 또 움직여서 최신 요청 URL이 바뀌었다면 이 결과는 폐기합니다.
        if (latestRequestUrlRef.current !== imageUrl) return;

        if (overlayRef.current) {
          overlayRef.current.setMap(null);
        }

        overlayRef.current = new window.naver.maps.GroundOverlay(
          imageUrl,
          bounds,
          { opacity: 0.7 }
        );
        overlayRef.current.setMap(map);
        
        // 다운로드가 완전히 끝나서 지도에 부착되었으므로 로딩 해제
        setIsLoading(false);
      };

      preloader.onerror = () => {
        if (latestRequestUrlRef.current !== imageUrl) return;
        setIsLoading(false);
      };
    };

    updateOverlay();

    const idleListener = window.naver.maps.Event.addListener(
      map, 'idle', updateOverlay
    );

    return () => {
      window.naver.maps.Event.removeListener(idleListener);
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
      setIsLoading(false);
    };
  }, [isMapLoaded, map, crimeType]);

  // 💡 컴포넌트에서 로딩바를 띄울 수 있도록 상태를 반환합니다.
  return { isLoading };
}