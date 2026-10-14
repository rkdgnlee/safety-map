// 결과 화면 안의 작은 지도. 반경 500m 원 위에 생활안전정보 레이어를 겹쳐 보여주고,
// 누르면 전체 지도 화면으로 넘어간다. (미니맵은 손가락으로 움직이지 않게 고정)
import { useEffect, useRef, useState } from 'react';
import { NATURAL_HAZARD_LAYERS } from '../constants/naturalHazardLayers';
import { SAFEMAP_LAYERS } from '../constants/safemapLayers';
import { COLORS } from '../constants/theme';
import { useNaverMap } from '../hooks/useNaverMap';

const PROXY_BASE_URL = import.meta.env.VITE_PROXY_BASE_URL;
const RADIUS_M = 500;
const OVERLAY_HALF_SIZE_M = 800; // 원보다 조금 넓게 레이어를 깔아 경계가 잘려 보이지 않게
const MAP_HEIGHT = 200;

export type MiniMapLayerId = 'crime' | 'flood' | 'landslide';

interface WmsSource {
  endpoint: string;
  layerName?: string;
  styles?: string;
}

const LAYERS: Record<MiniMapLayerId, { label: string; sources: WmsSource[]; opacity: number; legend: string }> = {
  crime: {
    label: '범죄주의구간',
    sources: [SAFEMAP_LAYERS.all],
    opacity: 0.95, // 원본 이미지가 이미 반투명이라 거의 그대로 깐다
    legend: '노란색에서 빨간색으로 갈수록 주의가 필요한 길이에요',
  },
  flood: {
    label: '하천 범람',
    sources: NATURAL_HAZARD_LAYERS.riverFlood.endpoints.map((endpoint) => ({ endpoint })),
    opacity: 0.45,
    legend: '색이 칠해진 곳은 하천이 범람하면 잠길 수 있는 구역이에요',
  },
  landslide: {
    label: '산사태',
    sources: NATURAL_HAZARD_LAYERS.landslide.endpoints.map((endpoint) => ({ endpoint })),
    opacity: 0.45,
    legend: '빨간색일수록 산사태 위험 등급이 높아요',
  },
};

// 미니맵은 스크롤 중 지도가 끌려가지 않도록 조작을 막는다
const STATIC_MAP_OPTIONS = {
  draggable: false,
  pinchZoom: false,
  scrollWheel: false,
  keyboardShortcuts: false,
  disableDoubleTapZoom: true,
  disableDoubleClickZoom: true,
  disableTwoFingerTapZoom: true,
  scaleControl: false,
  mapDataControl: false,
};

interface ResultMiniMapProps {
  center: { lat: number; lng: number };
  layers: MiniMapLayerId[];
  onOpenFullMap: (layer: MiniMapLayerId) => void;
}

function boundsAround(lat: number, lng: number, halfSizeM: number) {
  const dLat = halfSizeM / 111_320;
  const dLng = halfSizeM / (111_320 * Math.cos((lat * Math.PI) / 180));
  return { south: lat - dLat, west: lng - dLng, north: lat + dLat, east: lng + dLng };
}

export default function ResultMiniMap({ center, layers, onOpenFullMap }: ResultMiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeLayer, setActiveLayer] = useState<MiniMapLayerId>(layers[0]);
  const [mapCenter] = useState(center); // 지도는 한 번만 만들고, 바뀐 위치는 아래 effect 로 옮긴다
  const { map, isLoaded, error } = useNaverMap(containerRef, { center: mapCenter, zoom: 15, mapOptions: STATIC_MAP_OPTIONS });

  // 중심 마커 + 반경 원
  useEffect(() => {
    if (!isLoaded || !map) return;
    const position = new window.naver.maps.LatLng(center.lat, center.lng);
    map.setCenter(position);
    const marker = new window.naver.maps.Marker({ position, map });
    const circle = new window.naver.maps.Circle({
      map,
      center: position,
      radius: RADIUS_M,
      strokeColor: COLORS.primary,
      strokeOpacity: 0.9,
      strokeWeight: 2,
      fillOpacity: 0,
    });
    return () => {
      marker.setMap(null);
      circle.setMap(null);
    };
  }, [isLoaded, map, center.lat, center.lng]);

  // 선택한 레이어 오버레이
  useEffect(() => {
    if (!isLoaded || !map) return;
    const { south, west, north, east } = boundsAround(center.lat, center.lng, OVERLAY_HALF_SIZE_M);
    const bounds = new window.naver.maps.LatLngBounds(
      new window.naver.maps.LatLng(south, west),
      new window.naver.maps.LatLng(north, east),
    );
    const layer = LAYERS[activeLayer];
    const overlays = layer.sources.map((source) => {
      const params = new URLSearchParams({ bbox: `${west},${south},${east},${north}`, endpoint: source.endpoint, width: '512', height: '512' });
      if (source.layerName) params.set('layerName', source.layerName);
      if (source.styles) params.set('styles', source.styles);
      const overlay = new window.naver.maps.GroundOverlay(`${PROXY_BASE_URL}/api/safemap-wms?${params.toString()}`, bounds, {
        opacity: layer.opacity,
      });
      overlay.setMap(map);
      return overlay;
    });
    return () => overlays.forEach((overlay) => overlay.setMap(null));
  }, [isLoaded, map, center.lat, center.lng, activeLayer]);

  return (
    <div>
      {layers.length > 1 && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
          {layers.map((id) => {
            const active = id === activeLayer;
            return (
              <button
                key={id}
                onClick={() => setActiveLayer(id)}
                style={{
                  minHeight: '36px',
                  padding: '0 12px',
                  border: 'none',
                  borderRadius: '18px',
                  backgroundColor: active ? COLORS.primary : COLORS.bg,
                  color: active ? '#ffffff' : COLORS.textSub,
                  fontSize: '13px',
                  fontWeight: active ? 600 : 500,
                  cursor: 'pointer',
                }}
              >
                {LAYERS[id].label}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ position: 'relative', height: MAP_HEIGHT, borderRadius: '12px', overflow: 'hidden', backgroundColor: COLORS.track }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        {error && (
          <p style={{ position: 'absolute', inset: 0, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: COLORS.textMuted }}>
            지도를 불러오지 못했어요
          </p>
        )}
        {/* 미니맵 전체를 누르면 전체 지도로 */}
        <button
          onClick={() => onOpenFullMap(activeLayer)}
          aria-label="전체 지도로 보기"
          style={{ position: 'absolute', inset: 0, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
        >
          <span
            style={{
              position: 'absolute',
              right: '8px',
              top: '8px',
              padding: '6px 10px',
              borderRadius: '14px',
              backgroundColor: 'rgba(255,255,255,0.92)',
              color: COLORS.primary,
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            전체 지도 ›
          </span>
        </button>
      </div>
      <p style={{ margin: '8px 0 0', fontSize: '12px', lineHeight: 1.6, color: COLORS.textHint }}>
        반경 500m · {LAYERS[activeLayer].legend}
      </p>
    </div>
  );
}
