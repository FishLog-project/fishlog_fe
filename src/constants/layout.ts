/**
 * Fishlog 간격·레이아웃 토큰.
 */

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/**
 * 화면 레이아웃 공통 값.
 *
 * 좌우 여백은 화면이나 카드마다 따로 주지 않는다. Screen 컨테이너가
 * screenPadding을 한 번 적용하고, 안쪽 요소는 부모 안에서 flex로만 배치한다.
 * 화면군마다 여백이 다른 경우만 아래 전용 토큰을 Screen의 contentPadding으로 넘긴다.
 */
export const Layout = {
  /** 화면 좌우 공통 여백 */
  screenPadding: 20,
  /**
   * 인증 스텝(회원가입·비밀번호찾기) 본문 좌우 여백.
   *
   * 안내 문구와 입력은 28, 하단 버튼은 screenPadding(20)이다 — 디자인이
   * 본문과 버튼의 여백을 다르게 잡았다. (Figma 634:2583 x=28 / 147:1132 x=20)
   */
  stepPadding: 28,
  /** 마이페이지 본문 좌우 여백 (Figma 634:3038 x=32) */
  profilePadding: 32,
  /** 하단 고정 footer의 위/아래 여백 (Figma 버튼 y734+56=790, 홈인디케이터 810) */
  footerPaddingTop: 8,
  footerPaddingBottom: 20,
  /** 스크롤 본문이 바닥에서 남기는 여백 */
  scrollPaddingBottom: 24,
  /** 헤더 높이 (상단 상태바 44는 safe-area가 따로 잡는다) */
  headerHeight: 56,
  /** 앱 탭바 높이. OS 네비게이션 바 높이는 런타임에 safe-area로 더한다 */
  tabBarHeight: 52,
  /** 탭 버튼 하나의 터치 영역 */
  tabItemSize: 52,
  /** 탭 아이콘 크기 */
  tabIconSize: 36,
  maxContentWidth: 800,
} as const;
