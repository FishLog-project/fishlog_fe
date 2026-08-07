/**
 * Fishlog 디자인 토큰.
 * 앱은 app.json의 `userInterfaceStyle: "light"`로 라이트 모드 고정이라
 * 라이트/다크 쌍이 아닌 단일 팔레트로 관리한다.
 */

import '@/global.css';

/**
 * Fishlog 공식 컬러 팔레트 — 디자인 원본.
 * Figma "관광데이터 공모전" > Variable collection (17개)을 그대로 옮긴 것이다.
 *
 * 이름과 값은 Figma를 따라가며 임의로 바꾸지 않는다.
 * 화면 코드는 Palette를 직접 쓰지 말고 아래 의미 기반 토큰(Brand/Components)을 쓴다.
 * 그래야 팔레트가 바뀌어도 고칠 곳이 여기 한 군데로 끝난다.
 */
export const Palette = {
  blue: {
    /** 연한 배경 블루 (카드/칩 배경) */
    100: '#F5FCFF',
    /** 메인 블루 */
    200: '#00A0F0',
    /** 진한 블루 (제목/강조) */
    300: '#0079CA',
  },
  bluegray: {
    100: '#F3F8FB',
    200: '#96B0C2',
    300: '#4A7694',
    400: '#28597A',
    500: '#00375C',
  },
  font: {
    white: '#FFFFFF',
    black: '#1C1C1C',
    dark: '#4A4A4A',
    gray: '#767676',
    grayDisabled: '#999999',
  },
  line: {
    black: '#111111',
    white: '#FFFFFF',
    disabled: '#CFD9DD',
    regular: '#F1F1F5',
  },
} as const;

/**
 * 팔레트에 아직 없는 파생 색상.
 *
 * 그라데이션이나 히어로 배경처럼 Variable collection에 등록되지 않은 값만 모은다.
 * 디자인에서 정식 변수로 올라오면 Palette로 옮기고 여기서 지운다.
 */
export const Derived = {
  /** 히어로 카드 배경 그라데이션 */
  heroGradient: ['#1D79E9', '#2E9BF5'] as const,
  /** 통계 카드 배경 그라데이션 */
  cardGradient: ['#F5FCFF', '#DCF5FF'] as const,
  /** 진행바 그라데이션 */
  progressGradient: ['#8DD9FF', '#00AAFF'] as const,
  /** Primary 버튼 그라데이션 */
  buttonGradient: ['#5BC8FF', '#0085DE'] as const,
  /** 리스트 우측 화살표 */
  chevron: '#9DC4DD',
  /** 구분선 · 일러스트 플레이스홀더 회색 */
  neutral: '#D9D9D9',
  /** 입력 언더라인 기본(비활성) */
  underline: '#E1E1E1',
  /** 칩/FAB 그림자 */
  shadow: '#004E7C',
  /** 입력 오류 문구 */
  error: '#E5484D',
} as const;

/**
 * Fishlog 브랜드 컬러 — 팔레트에 의미를 붙인 층.
 * 화면 코드는 "무슨 색"이 아니라 "무슨 역할"로 이 토큰을 참조한다.
 */
export const Brand = {
  /** 로고/포인트 블루 */
  primary: Palette.blue[200],
  /** 진한 블루 (제목/강조 텍스트) */
  primaryDark: Palette.blue[300],
  /** 화면 기본 배경 */
  background: Palette.font.white,
  /** 연한 블루 배경 (스팟 카드 등) */
  surfaceSoft: Palette.blue[100],
  /** 본문 텍스트 */
  textStrong: Palette.font.black,
  /** 보조 텍스트 (거리/어종) */
  textMuted: Palette.bluegray[300],
  /** 약한 보조 텍스트 */
  textWeak: Palette.font.gray,
  /** 비활성 텍스트/아이콘 */
  textDisabled: Palette.font.grayDisabled,
  /** 비활성 아이콘/트랙 회색 */
  inactive: Palette.line.disabled,
} as const;

/**
 * 공통 컴포넌트 디자인 토큰 (Common/Button, SearchBar, Map/FAB/Filter).
 */
export const Components = {
  button: {
    /** Primary 버튼 그라데이션 (default) */
    gradient: Derived.buttonGradient,
    /** disabled 배경 */
    disabled: Palette.line.disabled,
    radius: 12,
    height: 56,
    label: Palette.font.white,
  },
  searchBar: {
    bg: Palette.bluegray[100],
    radius: 50,
    height: 44,
    /** 검색 전 placeholder */
    placeholder: Palette.bluegray[200],
    /** 검색 중 입력 텍스트 & 아이콘 */
    active: Palette.bluegray[300],
  },
  chip: {
    bgDefault: Palette.font.white,
    bgSelected: Palette.blue[100],
    textDefault: Palette.font.black,
    textSelected: Palette.bluegray[500],
    /** 관광지/음식점 아이콘 — 팔레트에 없는 카테고리 색 */
    food: '#FF6A45',
    /** 화장실/주차장 아이콘 — 팔레트에 없는 카테고리 색 */
    parking: '#00AD76',
    height: 40,
  },
  /** 인증 화면 입력 요소 (로그인 박스형 / 회원가입 언더라인형) */
  authInput: {
    /** 로그인 화면의 박스형 입력 배경 */
    boxBg: Palette.line.regular,
    boxRadius: 12,
    boxHeight: 56,
    /** 입력창 안쪽 텍스트 여백 (화면 여백과는 별개) */
    boxPaddingX: 20,
    /** placeholder 텍스트 */
    placeholder: Palette.font.gray,
    /** 입력 텍스트 */
    text: Palette.font.black,
    /** 언더라인 기본(비활성) */
    underline: Derived.underline,
    /** 언더라인 활성 */
    underlineActive: Palette.blue[200],
    /** clear(X) 버튼 원형 배경 */
    clearBg: Palette.line.disabled,
  },
  /** 로딩·빈 화면·오류를 표시하는 ScreenState 카드 */
  state: {
    surface: Palette.font.white,
    border: '#E3EAF0',
    /** 빈 화면 심볼 배경 */
    soft: '#E8F7FF',
    error: '#C93B3B',
    /** 오류 심볼 배경 */
    errorSoft: '#FDECEC',
    radius: 20,
  },
} as const;

/**
 * 앱 전체 기본 폰트는 SUITE.
 *
 * RN에서 커스텀 폰트는 fontWeight로 굵기를 바꾸지 않고 굵기별 패밀리를 직접 지정한다.
 * (안드로이드에서 fontWeight가 무시되거나 가짜 볼드로 렌더되는 걸 피하기 위함)
 * 실제 로드는 app/_layout.tsx의 useFonts에서 한다.
 */
export const Fonts = {
  regular: 'SUITE-Regular',
  medium: 'SUITE-Medium',
  semiBold: 'SUITE-SemiBold',
  bold: 'SUITE-Bold',
  extraBold: 'SUITE-ExtraBold',
} as const;

/**
 * 타이포그래피 스케일.
 *
 * Figma의 letter-spacing은 %이고 RN은 pt라서 (fontSize × %)로 환산해 넣는다.
 * 예) 18 × -2% = -0.36
 */
export const Typography = {
  /** 헤더 타이틀 — SUITE Medium 18 / 28 / -2% */
  header: {
    fontFamily: Fonts.medium,
    // SUITE 로드 전에는 fontFamily가 무시되고 이 굵기로 떨어진다.
    // 폰트를 넣고 나면 fontFamily가 우선하므로 그대로 둬도 된다.
    fontWeight: '500',
    fontSize: 18,
    lineHeight: 28,
    letterSpacing: -0.36,
  },
} as const;

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
