import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Brand, Components, Typography } from '@/constants/theme';

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
};

/**
 * Settings/ListItem/Base — 라벨 + 우측 화살표 한 줄 (Figma 566:1246).
 * 마이페이지의 "기타"·"설정" 목록이 쓴다.
 *
 * 디자인상 모든 항목의 라벨은 같은 검정이다. 계정 탈퇴도 예외가 아니라
 * 색으로 경고하지 않는다 — 경고는 눌러서 들어간 화면이 맡는다.
 */
export function SettingsListItem({ label, onPress, disabled }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.off]}>
      <Text style={styles.label}>{label}</Text>
      <Image
        source={require('@/assets/images/profile/chevron-20.svg')}
        style={styles.chevron}
        contentFit="contain"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Components.profile.listItem.paddingY,
  },
  pressed: { opacity: 0.6 },
  off: { opacity: 0.4 },
  label: { ...Typography.listItem, color: Brand.textStrong },
  chevron: {
    width: Components.profile.listItem.chevronSize,
    height: Components.profile.listItem.chevronSize,
  },
});
