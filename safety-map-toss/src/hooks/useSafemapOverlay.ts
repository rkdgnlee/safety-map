// safety-map-toss/src/hooks/useSafemapOverlay.ts
import { useEffect, useRef } from 'react';
import { SAFEMAP_LAYERS } from '../constants/safemapLayers';

const PROXY_BASE_URL = import.meta.env.VITE_PROXY_BASE_URL;

interface UseSafemapOverlayOptions {
  map: any;
  isMapLoaded: boolean;
  crimeType: string; // 'all' | 'child' | 'violence' | ...
}

export function useSafemapOverlay({ map, isMapLoaded, crimeType }: UseSafemapOverlayOptions) {
  const overlayRef = useRef<any>(null);

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

      if (overlayRef.current) {
        overlayRef.current.setMap(null);
      }

      overlayRef.current = new window.naver.maps.GroundOverlay(
        imageUrl,
        bounds,
        { opacity: 0.7 }
      );
      overlayRef.current.setMap(map);
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
    };
  }, [isMapLoaded, map, crimeType]); // crimeType 바뀔 때마다 재실행
}