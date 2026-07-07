import { TossAds, TossAdsAttachBannerOptions } from '@apps-in-toss/web-framework';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function BannerAdComponent({ adGroupId }: { adGroupId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isInitialized, attachBanner } = useTossBanner();

  useEffect(() => {
    if (!isInitialized || !containerRef.current) return;

    // 배너 부착
    const attached = attachBanner(adGroupId, containerRef.current, {
      theme: 'auto', // 시스템 설정에 따라 자동 전환
      tone: 'blackAndWhite', // 흰색/검정색 배경
      variant: 'expanded', // 전체 너비 확장 형태
      callbacks: {
        onAdRendered: (payload) => {
          console.log('광고 렌더링 완료:', payload.slotId);
        },
        onAdImpression: (payload) => {
          console.log('광고 노출됨:', payload.slotId);
        },
        onAdViewable: (payload) => {
          console.log('광고 노출 기록됨 (수익 발생):', payload.slotId);
        },
        onAdClicked: (payload) => {
          console.log('광고 클릭됨:', payload.slotId);
        },
        onNoFill: (payload) => {
          console.warn('표시할 광고가 없습니다:', payload.slotId);
        },
        onAdFailedToRender: (payload) => {
          console.error('광고 렌더링 실패:', payload.error.message);
        },
      },
    });

    // 클린업: destroy 호출
    return () => {
      attached?.destroy();
    };
  }, [isInitialized, adGroupId, attachBanner]);

  // 고정형 배너: width 100% + height 96px
  return <div ref={containerRef} style={{ width: '100%', height: '96px' }} />;
}

// 초기화 및 배너 부착을 위한 커스텀 훅
function useTossBanner() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (isInitialized) return;

    TossAds.initialize({
      callbacks: {
        onInitialized: () => setIsInitialized(true),
        onInitializationFailed: (error) => {
          console.error('Toss Ads SDK initialization failed:', error);
        },
      },
    });
  }, [isInitialized]);

  const attachBanner = useCallback(
    (adGroupId: string, element: HTMLElement, options?: TossAdsAttachBannerOptions) => {
      if (!isInitialized) return;
      return TossAds.attachBanner(adGroupId, element, options);
    },
    [isInitialized],
  );

  return { isInitialized, attachBanner };
}

