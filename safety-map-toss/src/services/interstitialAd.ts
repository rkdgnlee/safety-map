// 토스 전면 광고: 미리 불러두었다가 필요한 순간에 바로 보여준다.
// 광고가 준비되지 않았거나 실패하면 사용자를 기다리게 하지 않고 바로 다음 동작으로 넘어간다.
import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/web-framework';

const AD_GROUP_ID = 'ait.v2.live.64146e16af264d03';
const IS_DEV = import.meta.env.DEV;

let isLoaded = false;
let isLoading = false;
let isShowing = false;

export function preloadInterstitial() {
  if (IS_DEV || isLoaded || isLoading) return;
  isLoading = true;
  try {
    loadFullScreenAd({
      options: { adGroupId: AD_GROUP_ID },
      onEvent: (event) => {
        if (event.type === 'loaded') {
          isLoaded = true;
          isLoading = false;
        }
      },
      onError: (error) => {
        console.error('[ad] 전면 광고 로드 실패:', error);
        isLoading = false;
      },
    });
  } catch (error) {
    console.error('[ad] 전면 광고 로드 실패:', error);
    isLoading = false;
  }
}

// 지금 바로 보여줄 수 있는 광고가 있는지 — 없으면 안내 시트도 띄우지 않는다
export function isInterstitialReady(): boolean {
  return IS_DEV || isLoaded;
}

export function showInterstitial(onDone: () => void = () => {}) {
  if (IS_DEV || !isLoaded || isShowing) {
    onDone();
    preloadInterstitial();
    return;
  }
  isShowing = true;
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    isShowing = false;
    isLoaded = false;
    onDone();
    preloadInterstitial(); // 다음 광고 미리 준비
  };

  try {
    showFullScreenAd({
      options: { adGroupId: AD_GROUP_ID },
      onEvent: (event) => {
        if (event.type === 'dismissed' || event.type === 'failedToShow') finish();
      },
      onError: (error) => {
        console.error('[ad] 전면 광고 표시 실패:', error);
        finish();
      },
    });
  } catch (error) {
    console.error('[ad] 전면 광고 표시 실패:', error);
    finish();
  }
}
