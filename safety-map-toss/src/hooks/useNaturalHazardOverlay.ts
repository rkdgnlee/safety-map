// safety-map-toss/src/hooks/useNaturalHazardOverlay.ts
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { NATURAL_HAZARD_LAYERS } from '../constants/naturalHazardLayers';

const PROXY_BASE_URL = import.meta.env.VITE_PROXY_BASE_URL;
const AD_TRIGGER_COUNT = 8; // 기존 useSafemapOverlay와 동일 기준
const OVERLAY_OPACITY = 0.28; // 기존 0.5보다 대폭 낮춤 — 지도 가독성 확보

interface UseNaturalHazardOverlayOptions {
  map: any;
  isMapLoaded: boolean;
  onAdTrigger: () => void;
}

export function useNaturalHazardOverlay({
  map,
  isMapLoaded,
  onAdTrigger,
}: UseNaturalHazardOverlayOptions) {
  // 라디오 방식: 3개 레이어 중 최대 1개만 선택 가능 (null = 아무것도 선택 안 함)
  const [selectedHazard, setSelectedHazard] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const overlaysRef = useRef<any[]>([]);
  const fetchCountRef = useRef(0);
  const onAdTriggerRef = useRef(onAdTrigger);

  useEffect(() => {
    onAdTriggerRef.current = onAdTrigger;
  }, [onAdTrigger]);

  const clearOverlays = useCallback(() => {
    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    overlaysRef.current = [];
  }, []);

  const fetchHazard = useCallback(
    (hazardId: string | null) => {
      if (!isMapLoaded || !map || !window.naver) return;

      clearOverlays();

      if (!hazardId) {
        setIsLoading(false);
        return;
      }

      const layer = NATURAL_HAZARD_LAYERS[hazardId];
      if (!layer) return;

      setIsLoading(true);

      const bounds = map.getBounds();
      const ne = bounds.getNE();
      const sw = bounds.getSW();
      const bbox = `${sw.lng()},${sw.lat()},${ne.lng()},${ne.lat()}`;

      let loadedCount = 0;
      const totalCount = layer.endpoints.length;
      const markDone = () => {
        loadedCount += 1;
        if (loadedCount >= totalCount) setIsLoading(false);
      };

      // 하천 홍수위험처럼 endpoint가 2개 이상이면 같은 bbox로 겹쳐 그려서
      // 사용자에게는 하나의 레이어처럼 보이게 합니다.
      layer.endpoints.forEach((endpoint) => {
        const params = new URLSearchParams({
          bbox,
          endpoint,
          width: '512',
          height: '512',
        });
        const imageUrl = `${PROXY_BASE_URL}/api/safemap-wms?${params.toString()}`;

        const overlay = new window.naver.maps.GroundOverlay(imageUrl, bounds, {
          opacity: OVERLAY_OPACITY,
        });
        overlaysRef.current.push(overlay);
        overlay.setMap(map);

        const img = new Image();
        img.onload = markDone;
        img.onerror = markDone;
        img.src = imageUrl;
      });
    },
    [map, isMapLoaded, clearOverlays]
  );

  // 같은 항목 다시 누르면 선택 해제, 다른 항목 누르면 그쪽으로 전환
  const selectHazard = useCallback(
    (hazardId: string) => {
      setSelectedHazard((prev) => {
        const next = prev === hazardId ? null : hazardId;
        fetchHazard(next);
        return next;
      });
    },
    [fetchHazard]
  );

  // "이 지역 검색" 버튼 — 현재 선택된 레이어를 최신 지도 범위로 재조회
  const refreshSelectedHazard = useCallback(() => {
    if (!selectedHazard) return;

    fetchCountRef.current += 1;
    if (fetchCountRef.current > AD_TRIGGER_COUNT) {
      fetchCountRef.current = 0;
      onAdTriggerRef.current();
      return;
    }

    fetchHazard(selectedHazard);
  }, [selectedHazard, fetchHazard]);

  // cleanup
  useEffect(() => {
    return () => {
      overlaysRef.current.forEach((overlay) => overlay.setMap(null));
      overlaysRef.current = [];
    };
  }, []);

  return {
    selectedHazard,
    isLoading,
    selectHazard,
    refreshSelectedHazard,
  };
}