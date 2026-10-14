export type CategoryId = 'hiking' | 'camping' | 'fishing' | 'night' | 'moving';

export interface CategoryMeta {
  id: CategoryId;
  emoji: string;
  name: string;
  description: string; // 홈 카드에 보여줄, 무엇을 확인하는지
}

export const CATEGORIES: CategoryMeta[] = [
  { id: 'hiking', emoji: '⛰️', name: '등산', description: '바람 · 산불위험 · 일몰' },
  { id: 'camping', emoji: '⛺', name: '캠핑', description: '밤 기온 · 바람 · 근처 캠핑장' },
  { id: 'fishing', emoji: '🎣', name: '바다낚시', description: '물때 · 낚시지수 · 파고' },
  { id: 'night', emoji: '🌙', name: '밤길·귀가', description: '범죄주의구간 · 날씨 · 응급실' },
  { id: 'moving', emoji: '🏠', name: '이사·자취방', description: '범죄 · 하천 범람 · 산사태' },
];

// 아직 데이터가 없어 홈에 비활성 카드로만 노출
export const UPCOMING_CATEGORIES = [{ emoji: '🏃', name: '러닝' }];

export const DEFAULT_CATEGORY_ORDER: CategoryId[] = CATEGORIES.map((c) => c.id);

export function getCategory(id: CategoryId): CategoryMeta {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}

export interface Place {
  label: string;
  lat: number;
  lng: number;
  // 주소 검색으로 고른 경우에만 있음 (현재 위치는 서버에서 추정)
  sido?: string;
  sigungu?: string;
}
