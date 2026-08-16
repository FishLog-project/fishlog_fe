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
    lineHeight: 28,
    letterSpacing: -0.56,
  },
  /** 화면 헤더 타이틀 (Figma I316:668;315:713) */
  header: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 18,
    lineHeight: 28,
    letterSpacing: -0.36,
  },
  /** 단계 안내 문구 — 회원가입·비밀번호찾기 스텝 */
  heading: {
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    fontSize: 24,
    lineHeight: 34,
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
  /** 순위 배지 숫자 — 스팟 핀 안의 1·2·3 (Figma 72:1218) */
  badge: {
    fontFamily: Fonts.extraBold,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: -0.325,
  },
  /** 버튼 라벨 (Figma 147:1131) */
  button: {
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: -0.32,
  },
  /** 입력 텍스트 — 박스형(로그인) */
  input: {
    fontFamily: Fonts.regular,
    fontWeight: '400',
    fontSize: 16,
  },
  /** 입력 텍스트 — 언더라인형(회원가입 스텝) */
  inputLarge: {
    fontFamily: Fonts.regular,
    fontWeight: '400',
    fontSize: 18,
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
} as const;
