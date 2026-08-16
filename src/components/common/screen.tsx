import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

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
  edges = ['top'],
  background = Brand.background,
}: ScreenProps) {
  const padding = edgeToEdge ? 0 : Layout.screenPadding;

  // 키보드 회피는 컨테이너 높이를 줄이는 방식이라(iOS behavior="padding") 스크롤이 없으면
  // 줄어든 만큼 본문이 잘린다. 입력이 있는 화면은 스크롤을 강제로 함께 켠다.
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

  const content = (
    <>
      {header}
      {body}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: background }]} edges={edges}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  fill: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 24 },
  footer: {
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: 8,
  },
});
