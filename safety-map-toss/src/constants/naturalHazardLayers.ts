// safety-map-toss/src/constants/naturalHazardLayers.ts

export interface NaturalHazardLayer {
  id: string;
  label: string;
  // 하나의 레이어가 여러 WMS 이미지를 겹쳐서 보여줄 수 있도록 배열로 관리
  // (하천 홍수위험 = 국가하천 + 지방하천 통합)
  endpoints: string[];
  color: string; // 범례/토글 UI용 대표 색상
}

export const NATURAL_HAZARD_LAYERS: Record<string, NaturalHazardLayer> = {
  earthquake: {
    id: 'earthquake',
    label: '지진 발생이력',
    endpoints: ['IF_0030_WMS'],
    color: '#ff9500',
  },
  landslide: {
    id: 'landslide',
    label: '산사태 위험',
    endpoints: ['IF_0046_WMS'],
    color: '#8b5cf6',
  },
  riverFlood: {
    id: 'riverFlood',
    label: '하천 홍수위험',
    endpoints: ['IF_0089_WMS', 'IF_0100_WMS'], // 국가하천 + 지방하천
    color: '#0064ff',
  },
};

export const NATURAL_HAZARD_LAYER_LIST = Object.values(NATURAL_HAZARD_LAYERS);