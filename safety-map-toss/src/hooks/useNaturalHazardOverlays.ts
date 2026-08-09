// safety-map-toss/src/hooks/useNaturalHazardOverlays.ts
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { NATURAL_HAZARD_LAYERS } from '../constants/naturalHazardLayers';

const PROXY_BASE_URL = import.meta.env.VITE_PROXY_BASE_URL;
const AD_TRIGGER_COUNT = 8; // 기존 useSafemapOverlay와 동일 기준

interface UseNaturalHazardOverlaysOptions {
  map: any;
  isMapLoaded: boolean;
  onAdTrigger: () => void;
}

export function useNaturalHazardOverlays({
  map,
  isMapLoaded,
  onAdTrigger,
}: UseNaturalHazardOverlaysOptions) {
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set());
  const [loadingLayers, setLoadingLayers] = useState<Set<string>>(new Set());

  const overlaysRef = useRef<Map<string, any>>(new Map());
  const fetchCountRef = useRef(0);
  const onAdTriggerRef = useRef(onAdTrigger);

  useEffect(() => {
    onAdTriggerRef.current = onAdTrigger;
  }, [onAdTrigger]);

  const removeOverlay = useCallback((layerId: string) => {
    const overlay = overlaysRef.current.get(layerId);
    if (overlay) {
      overlay.setMap(null);
      overlaysRef.current.delete(layerId);
    }
  }, []);

  const fetchLayer = useCallback(
    (layerId: string) => {
      if (!isMapLoaded || !map || !window.naver) return;

      const layer = NATURAL_HAZARD_LAYERS[layerId];
      if (!layer) return;

      setLoadingLayers((prev) => new Set(prev).add(layerId));

      const bounds = map.getBounds();
      const ne = bounds.getNE();
      const sw = bounds.getSW();
      const bbox = `${sw.lng()},${sw.lat()},${ne.lng()},${ne.lat()}`;

      const params = new URLSearchParams({
        bbox,
        endpoint: layer.endpoint,
        width: '512',
        height: '512',
      });
      if (layer.layerName) params.set('layerName', layer.layerName);
      if (layer.styles) params.set('styles', layer.styles);

      const imageUrl = `${PROXY_BASE_URL}/api/safemap-wms?${params.toString()}`;

      removeOverlay(layerId);

      const overlay = new window.naver.maps.GroundOverlay(imageUrl, bounds, { opacity: 0.5 });
      overlaysRef.current.set(layerId, overlay);
      overlay.setMap(map);

      const img = new Image();
      const clearLoading = () =>
        setLoadingLayers((prev) => {
          const next = new Set(prev);
          next.delete(layerId);
          return next;
        });
      img.onload = clearLoading;
      img.onerror = clearLoading;
      img.src = imageUrl;
    },
    [map, isMapLoaded, removeOverlay]
  );

  // 레이어 켜기/끄기
  const toggleLayer = useCallback(
    (layerId: string) => {
      setActiveLayers((prev) => {
        const next = new Set(prev);
        if (next.has(layerId)) {
          next.delete(layerId);
          removeOverlay(layerId);
        } else {
          next.add(layerId);
          fetchLayer(layerId);
        }
        return next;
      });
    },
    [fetchLayer, removeOverlay]
  );

  // "이 지역 검색" 같은 버튼에서 호출 — 현재 활성 레이어 전부 새 위치 기준으로 재조회
  const refreshActiveLayers = useCallback(() => {
    if (!isMapLoaded || !map || activeLayers.size === 0) return;

    fetchCountRef.current += 1;
    if (fetchCountRef.current > AD_TRIGGER_COUNT) {
      fetchCountRef.current = 0;
      onAdTriggerRef.current();
      return;
    }

    activeLayers.forEach((layerId) => fetchLayer(layerId));
  }, [isMapLoaded, map, activeLayers, fetchLayer]);

  // cleanup
  useEffect(() => {
    return () => {
      overlaysRef.current.forEach((overlay) => overlay.setMap(null));
      overlaysRef.current.clear();
    };
  }, []);

  return {
    activeLayers,
    loadingLayers,
    isLoading: loadingLayers.size > 0,
    toggleLayer,
    refreshActiveLayers,
  };
}