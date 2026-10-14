// 검색 기록·최근 본 장소·위치 설정을 기기(localStorage)에 저장한다.
// 여러 화면에서 같은 값을 보도록 모듈 단위 store + useSyncExternalStore 로 공유.
import { useSyncExternalStore } from 'react';
import { DEFAULT_CATEGORY_ORDER, type CategoryId, type Place } from '../constants/categories';

const STORAGE_KEY = 'safety-map:preferences:v1';
const MAX_HISTORY = 10;
const MAX_RECENT = 6;

export interface RecentView {
  place: Place;
  categoryId: CategoryId;
}

export interface Preferences {
  useCurrentLocation: boolean;
  defaultPlace: Place | null;
  searchHistory: Place[];
  recentViews: RecentView[];
  categoryOrder: CategoryId[];
}

const DEFAULT_PREFERENCES: Preferences = {
  useCurrentLocation: true,
  defaultPlace: null,
  searchHistory: [],
  recentViews: [],
  categoryOrder: DEFAULT_CATEGORY_ORDER,
};

function load(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const saved = { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) } as Preferences;
    // 카테고리가 추가·삭제돼도 순서 목록이 깨지지 않게 보정
    const known = saved.categoryOrder.filter((id) => DEFAULT_CATEGORY_ORDER.includes(id));
    const missing = DEFAULT_CATEGORY_ORDER.filter((id) => !known.includes(id));
    return { ...saved, categoryOrder: [...known, ...missing] };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

let state = load();
const listeners = new Set<() => void>();

function setState(next: Preferences) {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 저장 실패(사파리 프라이빗 모드 등)해도 현재 세션에서는 동작하게 둔다
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const samePlace = (a: Place, b: Place) => a.label === b.label && a.lat === b.lat && a.lng === b.lng;

export const preferenceActions = {
  setUseCurrentLocation(value: boolean) {
    setState({ ...state, useCurrentLocation: value });
  },
  setDefaultPlace(place: Place | null) {
    setState({ ...state, defaultPlace: place });
  },
  addSearchHistory(place: Place) {
    const rest = state.searchHistory.filter((p) => !samePlace(p, place));
    setState({ ...state, searchHistory: [place, ...rest].slice(0, MAX_HISTORY) });
  },
  removeSearchHistory(place: Place) {
    setState({ ...state, searchHistory: state.searchHistory.filter((p) => !samePlace(p, place)) });
  },
  clearSearchHistory() {
    setState({ ...state, searchHistory: [] });
  },
  addRecentView(view: RecentView) {
    const rest = state.recentViews.filter(
      (v) => !(v.categoryId === view.categoryId && samePlace(v.place, view.place)),
    );
    setState({ ...state, recentViews: [view, ...rest].slice(0, MAX_RECENT) });
  },
  clearRecentViews() {
    setState({ ...state, recentViews: [] });
  },
  moveCategory(id: CategoryId, direction: -1 | 1) {
    const order = [...state.categoryOrder];
    const from = order.indexOf(id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= order.length) return;
    [order[from], order[to]] = [order[to], order[from]];
    setState({ ...state, categoryOrder: order });
  },
};

export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, () => state);
}
