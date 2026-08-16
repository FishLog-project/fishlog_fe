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
 */
export const Layout = {
  /** 화면 좌우 공통 여백 */
  screenPadding: 20,
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
