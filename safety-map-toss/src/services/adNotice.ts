// 전면 광고 안내 상태. 광고는 항상 안내 시트(AdNoticeSheet)로 먼저 알리고,
// 사용자가 "광고 보고 계속하기"를 눌렀을 때만 띄운다. 취소하면 지금 화면에 그대로 머문다.
import { useSyncExternalStore } from 'react';
import { isInterstitialReady } from './interstitialAd';

export interface AdNoticeRequest {
  title: string;
  description: string;
  confirmLabel: string;
  onContinue: () => void;
}

let pending: AdNoticeRequest | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/**
 * 광고가 준비돼 있으면 안내 시트를 띄우고, 준비돼 있지 않으면 광고 없이 바로 진행한다.
 * (보여줄 광고가 없는데 "광고가 나와요"라고 안내하지 않는다)
 */
export function requestAdWithNotice(request: AdNoticeRequest) {
  if (!isInterstitialReady()) {
    request.onContinue();
    return;
  }
  pending = request;
  emit();
}

export function isAdNoticeOpen() {
  return pending !== null;
}

export function closeAdNotice() {
  pending = null;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAdNoticeOpen(): boolean {
  return useSyncExternalStore(subscribe, () => pending !== null);
}

export function useAdNoticeRequest(): AdNoticeRequest | null {
  return useSyncExternalStore(subscribe, () => pending);
}
