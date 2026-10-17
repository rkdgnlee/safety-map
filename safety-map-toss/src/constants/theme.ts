// 앱 전역 색상. 메인 컬러는 apps-in-toss.config.ts 의 brand.primaryColor 와 맞춘다.
export const COLORS = {
  // 세이지 민트 포인트 + 차콜 버튼 — 화면은 연하게, 색은 넓은 면과 선에만 쓴다
  primary: '#3A7D64', // 아이콘·토글·지도 원·막대 (흰 배경 대비 4.9:1)
  primaryLine: '#A8D8C2', // 검색창·선택된 칩 테두리 (장식 선, 연한 배경과 함께 쓴다)
  primaryStrong: '#2F7058', // 세이지 색 글자 (흰 배경 5.9:1, 연한 배경 5.4:1)
  primarySoft: '#EEF8F3', // 검색창·선택된 칩·알약·요약 카드 배경
  primaryButton: '#333D4B', // 흰 글자 버튼 채움 — 차콜 (11:1)

  text: '#191f28',
  textSub: '#4e5968',
  textMuted: '#6b7684',
  textHint: '#8b95a1',
  textDisabled: '#b0b8c1',

  bg: '#ffffff',
  surface: '#f7f8fa',
  surfaceStrong: '#f2f4f6',
  border: '#e5e8eb',
  divider: '#f0f1f3',
  track: '#e4e8ed',
} as const;

export type Verdict = 'good' | 'caution' | 'bad';

// 판정 색은 메인 컬러와 겹치지 않게 유지. 색만으로 구분하지 않도록 label 을 항상 같이 쓴다.
export const VERDICT_TONE: Record<Verdict, { label: string; dot: string; text: string; bg: string; ring: string }> = {
  good: { label: '좋음', dot: '#03B26C', text: '#008c5a', bg: '#e9f9f2', ring: '#9fe3c4' },
  caution: { label: '주의', dot: '#FFB331', text: '#b87800', bg: '#fff5df', ring: '#ffcf70' },
  bad: { label: '비추천', dot: '#F04452', text: '#d22030', bg: '#ffeeee', ring: '#ffb3b9' },
};

// 이모지는 Tossface 로 렌더한다. Tossface 는 키캡 이모지용 숫자 글리프도 갖고 있어 시스템 폰트 뒤에 둔다
// (숫자·한글은 시스템 폰트, 시스템 폰트에 없는 이모지만 Tossface 로 넘어간다)
export const FONT_FAMILY = '"Pretendard", -apple-system, BlinkMacSystemFont, system-ui, "Tossface", sans-serif';

export const SCREEN_STYLE = {
  minHeight: '100vh',
  boxSizing: 'border-box',
  backgroundColor: COLORS.bg,
  color: COLORS.text,
  fontFamily: FONT_FAMILY,
  // 상단은 토스 내비게이션 바 바로 아래부터 시작한다
  padding: '16px 20px calc(32px + env(safe-area-inset-bottom))',
} as const;
