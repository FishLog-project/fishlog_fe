import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Brand, Components, Spacing, Typography } from '@/constants/theme';

type Props = {
  /** null·빈 문자열이면 아무것도 그리지 않는다 */
  message?: string | null;
};

/**
 * 입력 아래에 붙는 오류 문구 (아이콘 + 빨간 텍스트).
 *
 * 오류가 없을 때 자리를 비워두지 않는다. 오류가 떴다 사라질 때 아래 요소가
 * 밀리는 게 곤란한 화면은 쓰는 쪽에서 최소 높이를 잡는다.
 */
export function FormError({ message }: Props) {
  if (!message) return null;

  return (
    <View style={styles.row} accessibilityLiveRegion="polite">
      <Ionicons name="alert-circle" size={Components.icon.error} color={Brand.textError} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  text: { ...Typography.footnote, color: Brand.textError, flex: 1 },
});
