/**
 * Fishlog 타이포그래피 토큰 — 폰트 패밀리와 텍스트 스케일.
 *
 * 값은 Figma에서 그대로 옮긴다. letter-spacing은 Figma가 %, RN이 pt라서
 * (fontSize × %)로 환산해 넣는다. 예) 18 × -2% = -0.36
 */

import '@/global.css';

/**
 * 앱 전체 기본 폰트는 SUITE (SIL Open Font License).
 *
 * RN에서 커스텀 폰트는 fontWeight로 굵기를 바꾸지 않고 굵기별 패밀리를 직접 지정한다.
 * 가변(Variable) 폰트 한 장으로는 안 된다 — RN에 fontVariationSettings가 없어서
 * fontWeight가 wght 축을 움직이지 못하고 파일 기본 인스턴스로만 렌더된다.
 * (SUIT Variable로 시도했을 때 안드로이드에서 전부 Thin으로 떨어졌다)
 *
 * 폰트 로드 실패 시 시스템 폰트로 폴백되더라도 굵기 대비 유지하기 위해 fontWeight도 함께 둠
 */
export const Fonts = {
  light: 'SUITE-Light',
  regular: 'SUITE-Regular',
  medium: 'SUITE-Medium',
  semiBold: 'SUITE-SemiBold',
  bold: 'SUITE-Bold',
  extraBold: 'SUITE-ExtraBold',
} as const;

/** useFonts에 넘길 등록 맵. 로드는 app/_layout.tsx에서 한다. */
export const FontAssets = {
  [Fonts.light]: require('@/assets/fonts/SUITE-Light.ttf'),
  [Fonts.regular]: require('@/assets/fonts/SUITE-Regular.ttf'),
  [Fonts.medium]: require('@/assets/fonts/SUITE-Medium.ttf'),
  [Fonts.semiBold]: require('@/assets/fonts/SUITE-SemiBold.ttf'),
  [Fonts.bold]: require('@/assets/fonts/SUITE-Bold.ttf'),
  [Fonts.extraBold]: require('@/assets/fonts/SUITE-ExtraBold.ttf'),
} as const;

/**
 * 타이포그래피 스케일.
 *
 * 화면 코드는 fontSize/fontWeight/fontFamily를 직접 쓰지 말고 이 토큰을 펼쳐 쓴다.
 *   title: { ...Typography.sectionTitle, color: Brand.textHeading }
 *
 * 이름은 "무슨 크기"가 아니라 "무슨 역할"로 짓는다. 크기가 바뀌어도 이름이 안 틀리도록.
 */
export const Typography = {
  /** 브랜드 로고 — 홈 헤더의 "Fishlog" (Figma 72:1116) */
  brand: {
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    fontSize: 28,
    // Figma는 28(=fontSize)이지만 그대로 쓰면 'g'의 꼬리가 잘린다
    lineHeight: 36,
    letterSpacing: -0.56,
  },
  /** 브랜드 로고 — 온보딩 스플래시의 큰 "Fishlog" (Figma 634:2541) */
  brandSplash: {
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    fontSize: 52,
    // 디센더가 잘리지 않게 Figma(52)보다 넉넉히
    lineHeight: 66,
    letterSpacing: -1.04,
  },
  /** 브랜드 로고 — 로그인 화면 (Figma 634:2564) */
  brandAuth: {
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    fontSize: 38,
    // 디센더가 잘리지 않게 Figma(37.8)보다 넉넉히
    lineHeight: 48,
    letterSpacing: -0.76,
  },
  /** 화면 헤더 타이틀 (Figma I316:668;315:713) */
  header: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 18,
    lineHeight: 28,
    letterSpacing: -0.36,
  },
  /** 단계 안내 문구 — 회원가입·비밀번호찾기 스텝 (Figma 634:2583) */
  heading: {
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.48,
  },
  /** 섹션 제목 — "추천 낚시 스팟 Top 3" (Figma 72:1211) */
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 18,
    lineHeight: 28,
    letterSpacing: -0.45,
  },
  /** 카드 제목 — "도감 진행도" (Figma 74:1766) */
  cardTitle: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  /** 목록 항목 제목 — "지역/스팟명" (Figma 72:1220) */
  itemTitle: {
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  /** 목록 보조 정보 — "00km / 광어, 멸치, 개복치" (Figma 72:1221) */
  itemMeta: {
    fontFamily: Fonts.regular,
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 28,
    letterSpacing: -0.35,
  },
  /** 위 보조 정보 안의 구분자 "I" — 디자인상 유일한 Light 사용처 */
  itemMetaDivider: {
    fontFamily: Fonts.light,
    fontWeight: '300',
  },
  /** 히어로 라벨 — "오늘의 추천 어종" (Figma 72:1121) */
  heroLabel: {
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: -0.3,
  },
  /** 히어로 타이틀 — "광어 잡기 좋은 날!" (Figma 72:1120) */
  heroTitle: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.5,
  },
  /** 통계 수치 — "34" (Figma 74:1763) */
  statNumber: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 28,
    lineHeight: 28,
    letterSpacing: -0.8,
  },
  /** 통계 단위 — "/150종" */
  statUnit: {
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  /** 카드 안 작은 설명 — 도감 "도감 완성도" (Figma 103:195) */
  cardCaption: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 13,
    lineHeight: 24,
    letterSpacing: -0.26,
  },
  /** 막대·배지 안에 얹는 가장 작은 수치 — 도감 완성도 "99%" (Figma 103:224) */
  microLabel: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 10,
    lineHeight: 16,
    letterSpacing: -0.2,
  },
  /** 어종 상세 카드 제목 — "개복치" (Figma 106:455) */
  detailTitle: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 18,
    lineHeight: 40,
    letterSpacing: -0.36,
  },
  /** 어종 상세 설명 (Figma 106:461) */
  detailBody: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.24,
  },
  /** 칩 안의 문구 — "주요 서식지: 강" (Figma 130:185) */
  chipLabel: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: -0.22,
  },
  /** 순위 배지 숫자 — 스팟 핀 안의 1·2·3 (Figma 72:1218) */
  badge: {
    fontFamily: Fonts.extraBold,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: -0.325,
  },
  /** 버튼 라벨 (Figma 147:1131) */
  button: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 32,
    letterSpacing: -0.32,
  },
  /** 입력 텍스트 — 박스형(로그인, Figma 634:2562) */
  input: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 16,
    letterSpacing: -0.32,
  },
  /**
   * 입력 텍스트 — 언더라인형(회원가입 스텝)의 빈 상태 (Figma 634:2586).
   *
   * lineHeight는 일부러 넣지 않는다. 안드로이드 TextInput은 lineHeight를 주면
   * 글자가 위아래로 잘리는 경우가 있어, 줄 높이는 컴포넌트에서 height로 잡는다.
   */
  inputLarge: {
    fontFamily: Fonts.regular,
    fontWeight: '400',
    fontSize: 18,
    letterSpacing: -0.36,
  },
  /** 위와 같은 입력에 값이 들어간 상태 — 한 단계 굵어진다 (Figma 634:2648) */
  inputLargeFilled: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 18,
    letterSpacing: -0.36,
  },
  /** 본문 */
  body: {
    fontFamily: Fonts.regular,
    fontWeight: '400',
    fontSize: 16,
  },
  /** 보조 문구 · 링크 */
  caption: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 14,
  },
  /** 오류·안내 등 가장 작은 문구 */
  footnote: {
    fontFamily: Fonts.regular,
    fontWeight: '400',
    fontSize: 13,
  },
  /** 세그먼트 컨트롤의 선택된 칸 라벨 (Figma 323:1046) */
  segmentLabel: {
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 28,
    letterSpacing: -0.28,
  },
  /** 세그먼트 컨트롤의 선택되지 않은 칸 라벨 — 한 단계 얇다 (Figma 323:1049) */
  segmentLabelIdle: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 28,
    letterSpacing: -0.28,
  },
  /** 랭킹 4위 이하의 순위 숫자 (Figma 323:884) */
  rankNumber: {
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    fontSize: 18,
    lineHeight: 28,
    letterSpacing: -0.45,
  },
  /** 카드 안의 보조 수치 — "12/50종 (22%)" (Figma 634:2292) */
  cardMeta: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: -0.325,
  },
  /** 인증번호 한 자리 숫자 (Figma 634:2726) */
  otpDigit: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 20,
    lineHeight: 32,
    letterSpacing: -0.4,
  },
  /** 설정 목록 항목 라벨 (Figma 566:1243) */
  listItem: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.4,
  },
  /** 목록 위 구분 라벨 — "기타" · "설정" (Figma 634:3038) */
  sectionLabel: {
    fontFamily: Fonts.regular,
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.35,
  },
  /** 마이페이지 닉네임 (Figma 634:3036) */
  profileName: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.5,
  },
  /** 마이페이지 이메일 (Figma 634:3037) */
  profileEmail: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.35,
  },
  /** 바로가기 카드 라벨 — "내 도감" (Figma 634:3045) */
  quickLabel: {
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 28,
    letterSpacing: -0.35,
  },
} as const;
