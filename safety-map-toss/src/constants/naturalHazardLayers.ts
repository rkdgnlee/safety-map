// safety-map-toss/src/constants/naturalHazardLayers.ts

export interface NaturalHazardLayer {
  id: string;
  label: string;
  endpoint: string;
  // 지진/산사태/하천홍수 WMS는 layers·styles 파라미터가 없는 단일목적 서비스입니다.
  // (범죄 레이어처럼 서브타입 구분이 필요해지면 여기 추가)
  layerName?: string;
  styles?: string;
  color: string; // 범례/토글 UI용 대표 색상
}

export const NATURAL_HAZARD_LAYERS: Record<string, NaturalHazardLayer> = {
  earthquake: {
    id: 'earthquake',
    label: '지진 발생이력',
    endpoint: 'IF_0030_WMS',
    color: '#ff9500',
  },
  landslide: {
    id: 'landslide',
    label: '산사태 위험',
    endpoint: 'IF_0046_WMS',
    color: '#8b5cf6',
  },
  riverFloodNational: {
    id: 'riverFloodNational',
    label: '국가하천 홍수위험',
    endpoint: 'IF_0089_WMS',
    color: '#0064ff',
  },
  riverFloodLocal: {
    id: 'riverFloodLocal',
    label: '지방하천 홍수위험',
    endpoint: 'IF_0100_WMS',
    color: '#00a3ff',
  },
};

export const NATURAL_HAZARD_LAYER_LIST = Object.values(NATURAL_HAZARD_LAYERS);