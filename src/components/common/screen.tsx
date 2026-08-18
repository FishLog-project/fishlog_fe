import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
} from 'react-native-reanimated';
import {
  SafeAreaView,
  useSafeAreaInsets,
  type Edge,
} from 'react-native-safe-area-context';

import { Brand, Layout } from '@/constants/theme';

type ScreenProps = {
  children: ReactNode;
  /** 상단 고정 영역. 보통 <ScreenHeader /> */
  header?: ReactNode;
  /** 하단 고정 영역. 스크롤과 무관하게 바닥에 붙는다 */
  footer?: ReactNode;
  /** 본문을 스크롤시킬지 */
  scroll?: boolean;
  /**
   * 본문 좌우 여백을 끈다. 지도처럼 화면 끝까지 채워야 할 때만 쓰고,
   * 그 안에서 여백이 필요하면 Layout.screenPadding을 참조한다.
   */
  edgeToEdge?: boolean;
  /** 키보드가 올라올 때 본문을 밀어 올린다 (입력이 있는 화면) */
  keyboardAvoiding?: boolean;
  /**
   * 본문 좌우 여백을 화면군 전용 값으로 바꾼다 (Layout.stepPadding 등).
   * 하단 footer는 이 값과 무관하게 항상 Layout.screenPadding을 쓴다 —
   * 디자인이 본문과 버튼의 여백을 다르게 잡은 화면이 있어서다.
   */
  contentPadding?: number;
  /** 기본은 상단만. 탭이 없는 화면은 ['top', 'bottom'] */
  edges?: readonly Edge[];
  background?: string;
};

/**
 * 모든 화면의 최상위 컨테이너.
 *
 * 좌우 여백(Layout.screenPadding)을 여기서 한 번만 적용한다.
 * 화면이나 카드가 각자 paddingHorizontal을 다시 주지 않는다.
 */
export function Screen({
  children,
  header,
  footer,
  scroll = false,
  edgeToEdge = false,
  keyboardAvoiding = false,
  contentPadding,
  edges = ['top'],
  background = Brand.background,
}: ScreenProps) {
  const padding = edgeToEdge ? 0 : (contentPadding ?? Layout.screenPadding);
  const insets = useSafeAreaInsets();
  const keyboard = useAnimatedKeyboard();

  /**
   * 키보드 회피를 KeyboardAvoidingView가 아니라 실제 키보드 인셋으로 처리한다.
   *
   * 이유가 두 가지다.
   * 1. 안드로이드는 edgeToEdgeEnabled=true라 매니페스트의 adjustResize가 무효다.
   *    창이 줄지 않으므로 회피를 앱이 직접 해야 한다.
   * 2. KeyboardAvoidingView는 자기 위치를 measure해서 계산하는데, 화면 전환
   *    애니메이션 도중 autoFocus로 키보드가 뜨면 전환 중 좌표를 재서 회피량이
   *    0이 된다. (인증번호 화면에서 하단 버튼이 키보드에 가려지던 원인)
   *
   * safe-area 하단 여백은 SafeAreaView가 이미 넣으므로 그만큼 빼고 더한다.
   */
  const keyboardStyle = useAnimatedStyle(() => ({
    paddingBottom: keyboardAvoiding
      ? Math.max(keyboard.height.value - insets.bottom, 0)
      : 0,
  }));

  // 키보드가 올라오면 본문 높이가 줄어든다. 스크롤이 없으면 그만큼 잘리므로
  // 입력이 있는 화면은 스크롤을 강제로 함께 켠다.
  const scrollable = scroll || keyboardAvoiding;

  const body = scrollable ? (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={[styles.scrollContent, { paddingHorizontal: padding }]}
      showsVerticalScrollIndicator={false}
      // 키보드가 올라온 상태에서 버튼을 한 번에 누를 수 있게 한다.
      // (기본값이면 첫 탭이 키보드 내리기로 먹힌다)
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, { paddingHorizontal: padding }]}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: background }]} edges={edges}>
      <Animated.View style={[styles.fill, keyboardStyle]}>
        {header}
        {body}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  fill: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: Layout.scrollPaddingBottom },
  footer: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Layout.footerPaddingTop,
    paddingBottom: Layout.footerPaddingBottom,
  },
});
