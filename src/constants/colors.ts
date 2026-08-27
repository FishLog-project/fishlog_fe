/**
 * Fishlog 색상 토큰.
 * 앱은 app.json의 `userInterfaceStyle: "light"`로 라이트 모드 고정이라
 * 라이트/다크 쌍이 아닌 단일 팔레트로 관리한다.
 *
 * 층위는 Palette(원본) → Derived(미등록 파생) → Brand(의미) 순이다.
 * 화면 코드는 Brand를 참조하고, Palette/Derived 직접 참조는 피한다.
 */

/**
 * Fishlog 공식 컬러 팔레트 — 디자인 원본.
 * Figma "관광데이터 공모전" > Variable collection (17개)을 그대로 옮긴 것이다.
 *
 * 이름과 값은 Figma를 따라가며 임의로 바꾸지 않는다.
 * 화면 코드는 Palette를 직접 쓰지 말고 아래 의미 기반 토큰(Brand)을 쓴다.
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
  /** 모달 뒤를 덮는 막 (알파가 필요해 rgba 표기) */
  scrim: 'rgba(0, 0, 0, 0.4)',
  /** 세그먼트 컨트롤의 선택된 칸이 떠 보이게 하는 그림자 (Figma 323:1045) */
  segmentShadow: 'rgba(17, 82, 125, 0.18)',
  /** 진행바 트랙 테두리 (Figma 74:1764) */
  progressTrackBorder: '#69CDFF',
  /** 통계 카드 안쪽 그림자 (알파가 필요해 이 항목만 rgba 표기) */
  cardInnerGlow: 'rgba(153, 221, 255, 0.73)',

  // 도감 수조 (Figma 도감2안 103:173)
  /** 수조 윗면 테두리 띠 */
  tankRim: '#B3E3F8',
  /** 수조 안쪽 상단에 드리우는 그림자 */
  tankShade: '#A6C7DD',
  /** 도감 완성도 카드 배경 */
  dexSummary: '#D7F1FC',
  /** 완성도 막대 채움 */
  dexBarGradient: ['#EEF9FF', '#84D6FF'] as const,
  /** 어종 카드 안쪽 그림 칸 배경 */
  dexTileGradient: ['#F5FCFF', '#BCE9FF'] as const,
  /** 어종 카드 안쪽 그림 칸 테두리 */
  dexTileBorder: '#B1DFFF',
  /** 어종 카드 그림자 (알파 필요) */
  dexCardShadow: 'rgba(0, 94, 170, 0.69)',
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

  // 텍스트 · 아이콘
  /** 본문 텍스트 */
  textStrong: Palette.font.black,
  /** 보조 텍스트 (거리/어종) */
  textMuted: Palette.bluegray[300],
  /** 약한 보조 텍스트 */
  textWeak: Palette.font.gray,
  /** 비활성 텍스트/아이콘 */
  textDisabled: Palette.font.grayDisabled,
  /** 오류 문구 텍스트 */
  textError: Derived.error,
  /** 섹션 제목 (Figma Bluegray/500) — 카드 제목의 primaryDark보다 진한 남색 */
  textHeading: Palette.bluegray[500],
  /** 수치 강조 — 랭킹 점수·순위처럼 값 자체를 읽어야 하는 자리 */
  textAccent: Palette.bluegray[400],
  /** 선택되지 않은 항목의 라벨 (세그먼트 컨트롤의 비활성 칸 등) */
  textSubtle: Palette.bluegray[200],
  /**
   * 컬러 면 위에 얹는 글자/아이콘.
   *
   * 값은 background와 같은 흰색이지만 역할이 다르다. 배경을 연회색으로 바꾸는
   * 변경이 히어로 카드 글자까지 회색으로 만들면 안 되므로 토큰을 분리해 둔다.
   */
  onPrimary: Palette.font.white,
  /** 리스트 우측 화살표 아이콘 */
  chevron: Derived.chevron,
  /** 비활성 아이콘/트랙 회색 */
  inactive: Palette.line.disabled,
  /** 구분선 · 일러스트 플레이스홀더 */
  divider: Derived.neutral,
  /** 떠 있는 요소(칩/FAB)의 그림자 */
  shadow: Derived.shadow,
  /** 모달이 떠 있을 때 뒤를 덮는 막 */
  scrim: Derived.scrim,

  // 그라데이션 — 쓰는 쪽에서 [...Brand.xxx] 로 펼쳐 넣는다
  /** 히어로 카드 배경 */
  heroSurface: Derived.heroGradient,
  /** 통계 카드 배경 */
  cardSurface: Derived.cardGradient,
  /** 진행바 채움 */
  progressFill: Derived.progressGradient,
  /** Primary 버튼 채움 */
  buttonFill: Derived.buttonGradient,
} as const;
