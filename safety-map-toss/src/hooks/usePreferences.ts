// 검색 기록·최근 본 장소·위치 설정을 기기(localStorage)에 저장한다.
// 여러 화면에서 같은 값을 보도록 모듈 단위 store + useSyncExternalStore 로 공유.
import { useSyncExternalStore } from 'react';
import { type CategoryId, type Place } from '../constants/categories';

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
  seenChangelogId: string | null; // 홈 '새로워졌어요' 카드를 닫은 버전
}

const DEFAULT_PREFERENCES: Preferences = {
  useCurrentLocation: true,
  defaultPlace: null,
  searchHistory: [],
  recentViews: [],
  seenChangelogId: null,
};

function load(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    // 예전에 저장한 categoryOrder 는 더 이상 쓰지 않는다 (홈 카드 순서는 categories.ts 에 고정)
    const saved = JSON.parse(raw);
    delete saved.categoryOrder;
    return { ...DEFAULT_PREFERENCES, ...saved } as Preferences;
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
  markChangelogSeen(id: string) {
    setState({ ...state, seenChangelogId: id });
  },
};

export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, () => state);
}
