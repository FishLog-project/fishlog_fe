import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Brand, Components, Spacing, Typography } from '@/constants/theme';

type Props = {
  /** 보여줄 값 */
  value: string;
  /** 우측 Ionicons 이름 (생략하면 아이콘 없음) */
  icon?: keyof typeof Ionicons.glyphMap;
  /** 스크린리더가 읽을 이름 ("이메일" 등) */
  label?: string;
};

/**
 * 값을 고쳐 쓸 수 없이 다시 확인만 시키는 박스 필드.
 * 인증번호 화면에서 앞 단계에 입력한 이메일을 되짚어 줄 때 쓴다.
 *
 * 입력이 아니라 표시이므로 TextInput을 editable={false}로 두지 않고 Text로 그린다.
 * (비활성 입력처럼 보이면 눌러서 고칠 수 있다고 오해하게 된다)
 */
export function ReadonlyField({ value, icon, label }: Props) {
  return (
    <View
      style={styles.box}
      accessible
      accessibilityRole="text"
      accessibilityLabel={label ? `${label} ${value}` : value}>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
      {icon ? (
        <Ionicons name={icon} size={Components.icon.fieldTrailing} color={Brand.primary} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: Components.authInput.boxHeight,
    borderRadius: Components.authInput.boxRadius,
    borderWidth: 1,
    borderColor: Components.authInput.readonlyBorder,
    backgroundColor: Brand.background,
    paddingHorizontal: Components.authInput.boxPaddingX,
  },
  value: { ...Typography.input, color: Components.authInput.text, flex: 1 },
});
