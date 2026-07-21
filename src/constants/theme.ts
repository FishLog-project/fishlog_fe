/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Fishlog 공식 컬러 팔레트.
 * (Figma "관광데이터 공모전" > Variable collection 에 정의된 토큰)
 */
export const Palette = {
  /** 연한 배경 블루 (카드/칩 배경) */
  light: '#F5FCFF',
  /** 메인 블루 */
  blue: '#00A0F0',
} as const;

/**
 * Fishlog 브랜드 컬러.
 * 공식 팔레트(Palette) + 홈/공통 컴포넌트 디자인에서 추출한 파생 색상.
 */
export const Brand = {
  /** 로고/포인트 라이트 블루 */
  primary: '#00A7FA',
  /** 진한 블루 (제목/강조 텍스트) */
  primaryDark: '#0079CA',
  /** 히어로 카드 배경 블루 */
  hero: '#1D79E9',
  /** 카드 그라데이션 */
  cardGradient: ['#F5FCFF', '#DCF5FF'] as const,
  /** 스팟 카드 배경 */
  spotBg: '#F5FCFF',
  /** 진행바 그라데이션 */
  progress: ['#8DD9FF', '#00AAFF'] as const,
  /** 본문 텍스트 */
  textStrong: '#1C1C1C',
  /** 보조 텍스트 (거리/어종) */
  textMuted: '#4A7694',
  /** 비활성 아이콘/트랙 회색 */
  inactive: '#CFD9DD',
} as const;

/**
 * 공통 컴포넌트 디자인 토큰 (Common/Button, SearchBar, Map/FAB/Filter).
 */
export const Components = {
  button: {
    /** Primary 버튼 그라데이션 (default) */
    gradient: ['#5BC8FF', '#0085DE'] as const,
    /** disabled 배경 */
    disabled: '#CFD9DD',
    radius: 12,
    height: 56,
    label: '#FFFFFF',
  },
  searchBar: {
    bg: '#F3F8FB',
    radius: 50,
    height: 44,
    /** 검색 전 placeholder */
    placeholder: '#96B0C2',
    /** 검색 중 입력 텍스트 & 아이콘 */
    active: '#4A7694',
  },
  chip: {
    bgDefault: '#FFFFFF',
    bgSelected: '#F5FCFF',
    textDefault: '#1C1C1C',
    textSelected: '#00375C',
    /** 관광지/음식점 아이콘 */
    food: '#FF6A45',
    /** 화장실/주차장 아이콘 */
    parking: '#00AD76',
    height: 40,
  },
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
