"use client"
import { useEffect, useRef, useState, useCallback } from 'react';
import { SAFEMAP_LAYERS } from '../constants/safemapLayers';

const PROXY_BASE_URL = import.meta.env.VITE_PROXY_BASE_URL;
const AD_TRIGGER_COUNT = 8;

interface UseSafemapOverlayOptions {
  map: any;
  isMapLoaded: boolean;
  crimeType: string;
  onAdTrigger: () => void;
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
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    onAdTriggerRef.current = onAdTrigger;
  }, [onAdTrigger]);

  // 💡 idle 자동 갱신 제거 — 수동 호출용 함수만 반환
  const fetchOverlay = useCallback(() => {
    if (!isMapLoaded || !map) return;

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
      endpoint: SAFEMAP_LAYERS[crimeType]?.endpoint ?? SAFEMAP_LAYERS['all'].endpoint,
      layerName: SAFEMAP_LAYERS[crimeType]?.layerName ?? SAFEMAP_LAYERS['all'].layerName,
      styles: SAFEMAP_LAYERS[crimeType]?.styles ?? SAFEMAP_LAYERS['all'].styles,
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
  }, [isMapLoaded, map, crimeType]);

  // cleanup
  useEffect(() => {
    return () => {
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
    };
  }, []);

  return { isLoading, fetchOverlay }; // ← fetchOverlay 반환
}