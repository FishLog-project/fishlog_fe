/**
 * 공통 컴포넌트 디자인 토큰 (Common/Button, SearchBar, Map/FAB/Filter).
 * 색상은 colors.ts의 토큰을 조합해서만 만든다.
 */

import { Derived, Palette } from './colors';

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
  /** 홈 통계 카드 (도감 진행도 / 물고기 인증하기) */
  statCard: {
    height: 140,
    radius: 16,
    padding: 16,
    /** 카드 안쪽 은은한 발광 — Figma의 inset shadow */
    innerGlow: Derived.cardInnerGlow,
  },
  /** 도감 진행바 */
  progress: {
    height: 12,
    radius: 12,
    track: Palette.font.white,
    trackBorder: Derived.progressTrackBorder,
    trackBorderWidth: 1.5,
    fill: Derived.progressGradient,
  },
  /** 추천 스팟 리스트 행 */
  spotRow: {
    bg: Palette.blue[100],
    radius: 43,
    paddingX: 16,
    paddingY: 12,
    /** 행과 행 사이 간격 (리스트가 쓴다) */
    rowGap: 24,
    /** 핀·텍스트·화살표 사이 간격 */
    contentGap: 12,
    pinSize: 40,
    chevronSize: 28,
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
