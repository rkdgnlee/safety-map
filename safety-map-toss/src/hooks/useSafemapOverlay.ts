"use client"
import { useEffect, useRef, useState } from 'react';
import { SAFEMAP_LAYERS } from '../constants/safemapLayers';

const PROXY_BASE_URL = import.meta.env.VITE_PROXY_BASE_URL;
const AD_TRIGGER_COUNT = 8; // 6번 후 7번째에 광고

interface UseSafemapOverlayOptions {
  map: any;
  isMapLoaded: boolean;
  crimeType: string;
  onAdTrigger: () => void; // ← 추가
}

export function useSafemapOverlay({
  map,
  isMapLoaded,
  crimeType,
  onAdTrigger,
}: UseSafemapOverlayOptions) {
  const overlayRef = useRef<any>(null);
  const overlayCountRef = useRef(0);
  const onAdTriggerRef = useRef(onAdTrigger);
  const [isLoading, setIsLoading] = useState(false); // ← 추가
  const idleListenerRef = useRef<any>(null);
  useEffect(() => {
    onAdTriggerRef.current = onAdTrigger;
  }, [onAdTrigger]);

  useEffect(() => {
    if (!isMapLoaded || !map) return;

    const layerConfig = SAFEMAP_LAYERS[crimeType] ?? SAFEMAP_LAYERS['all'];

    const updateOverlay = () => {
      overlayCountRef.current += 1;

      if (overlayCountRef.current > AD_TRIGGER_COUNT) {
        overlayCountRef.current = 0;
        onAdTriggerRef.current();
        return;
      }

      setIsLoading(true);

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

      if (overlayRef.current) {
        overlayRef.current.setMap(null);
      }

      const overlay = new window.naver.maps.GroundOverlay(imageUrl, bounds, { opacity: 0.45 });
      overlayRef.current = overlay;
      overlayRef.current.setMap(map);

      const img = new Image();
      img.onload = () => setIsLoading(false);
      img.onerror = () => setIsLoading(false);
      img.src = imageUrl;
    };

    // 💡 idle 한 번 기다린 후 첫 overlay 로드
    const firstIdleListener = window.naver.maps.Event.addListener(
      map,
      'idle',
      () => {
        window.naver.maps.Event.removeListener(firstIdleListener);
        updateOverlay(); // 첫 번째 호출
        
        // 이후 idle마다 갱신
        const idleListener = window.naver.maps.Event.addListener(
          map, 'idle', updateOverlay
        );

        // cleanup을 위해 저장
        idleListenerRef.current = idleListener;
      }
    );

    return () => {
      window.naver.maps.Event.removeListener(firstIdleListener);
      if (idleListenerRef.current) {
        window.naver.maps.Event.removeListener(idleListenerRef.current);
      }
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
    };
  }, [isMapLoaded, map, crimeType]);

  return { isLoading }; // ← 반환
}