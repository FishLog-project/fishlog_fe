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
  /** true면 비활성 스타일 + 입력 차단 */
  disabled?: boolean;
  loading?: boolean;
  /**
   * solid: 블루 그라데이션 채움 (기본)
   * outline: 흰 배경 + 남색 테두리 — 로그인 화면의 "로그인 없이 둘러보기"
   */
  variant?: 'solid' | 'outline';
};

/**
 * Common/Button/Primary — "다음" 형태의 메인 액션 버튼 (Figma 147:1133).
 *
 * 두 변형은 크기·라운드가 같고 채움만 다르다. 비활성은
 * solid가 회색으로 채워지고(147:1132), outline은 테두리를 유지한 채 흐려진다.
 */
export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'solid',
}: Props) {
  const isOff = disabled || loading;
  const outline = variant === 'outline';

  const content = loading ? (
    <ActivityIndicator color={outline ? Components.button.outlineLabel : Components.button.label} />
  ) : (
    <Text style={outline ? styles.outlineLabel : styles.label}>{label}</Text>
  );

  if (isOff) {
    return (
      <Pressable
        disabled
        style={[styles.base, outline ? [styles.outline, styles.faded] : styles.disabled]}>
        {content}
      </Pressable>
    );
  }

  if (outline) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.base, styles.outline, pressed && styles.pressed]}>
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
  outline: {
    backgroundColor: Components.button.outlineBg,
    borderWidth: Components.button.outlineWidth,
    borderColor: Components.button.outlineBorder,
  },
  faded: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  label: {
    color: Components.button.label,
    ...Typography.button,
  },
  outlineLabel: {
    color: Components.button.outlineLabel,
    ...Typography.button,
  },
});
