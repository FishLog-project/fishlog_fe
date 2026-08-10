import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
} from 'react-native';

import { Components, Typography } from '@/constants/theme';

type Props = {
  label: string;
  onPress?: PressableProps['onPress'];
  /** true면 비활성(회색) 스타일 + 입력 차단 */
  disabled?: boolean;
  loading?: boolean;
};

/**
 * Common/Button/Primary — "다음" 형태의 메인 액션 버튼.
 * default: 블루 그라데이션 / disabled: 회색.
 */
export function PrimaryButton({ label, onPress, disabled, loading }: Props) {
  const isOff = disabled || loading;

  const content = loading ? (
    <ActivityIndicator color={Components.button.label} />
  ) : (
    <Text style={styles.label}>{label}</Text>
  );

  if (isOff) {
    return (
      <Pressable disabled style={[styles.base, styles.disabled]}>
        {content}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.base, pressed && styles.pressed]}>
      <LinearGradient
        colors={[...Components.button.gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: Components.button.height,
    borderRadius: Components.button.radius,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  disabled: { backgroundColor: Components.button.disabled },
  pressed: { opacity: 0.85 },
  label: {
    color: Components.button.label,
    ...Typography.button,
  },
});
