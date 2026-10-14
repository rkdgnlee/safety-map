import type { Place } from '../constants/categories';

export const CURRENT_LOCATION_LABEL = '현재 위치';

export function getCurrentPlace(): Promise<Place> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('위치 서비스를 지원하지 않는 기기예요.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ label: CURRENT_LOCATION_LABEL, lat: coords.latitude, lng: coords.longitude }),
      () => reject(new Error('위치 권한이 꺼져 있어요. 설정에서 허용하거나 장소를 검색해 주세요.')),
      { timeout: 10000 },
    );
  });
}
