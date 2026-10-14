// 이사·자취방 리포트 예시 데이터.
// 범죄주의구간·침수흔적은 지금 지도 이미지(WMS)로만 받고 있어 수치화 API 를 붙이기 전까지 예시로 보여준다.
import type { CategoryReport } from '../types/report';

export const MOCK_MOVING_REPORT: CategoryReport = {
  verdict: 'good',
  neutral: true,
  verdictText: '양호 3 · 보통 1',
  headline: '구 평균과 비교한\n동네 안전 리포트예요',
  reasons: [],
  passed: [],
  unavailable: [],
  detail: {
    kind: 'moving',
    items: [
      { title: '범죄', grade: '양호', verdict: 'good', ratio: 0.72, desc: '구 평균보다 12% 낮아요' },
      { title: '침수흔적', grade: '양호', verdict: 'good', ratio: 0.9, desc: '침수 이력이 없어요' },
      { title: '산사태·급경사지', grade: '보통', verdict: 'caution', ratio: 0.5, desc: '구 평균과 비슷해요' },
      { title: '치안시설 거리', grade: '양호', verdict: 'good', ratio: 0.8, desc: '파출소까지 450m' },
    ],
  },
  hospital: null,
  sources: ['생활안전정보 범죄주의구간·산사태 위험', '침수흔적도', '행정안전부 CCTV 정보'],
  isMock: true,
};
