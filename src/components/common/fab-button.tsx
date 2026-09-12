import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet } from 'react-native';

import { Brand } from '@/constants/theme';

type Props = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  /** 아이콘만 있는 버튼이라 스크린리더용 이름이 필요하다. */
  label: string;
  active?: boolean;
  onPress?: () => void;
  size?: number;
};

/**
 * Map/FAB — 지도 위 원형 토글 버튼.
 * default: 흰 배경 + 검정 아이콘 / active: 블루 그라데이션 + 흰 아이콘.
 * (Figma "Icon" 세트의 원형 버튼 변형)
 */
export function FabButton({ icon, label, active, onPress, size = 52 }: Props) {
  const dim = { width: size, height: size, borderRadius: size / 2 };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      style={({ pressed }) => [
        styles.base,
        dim,
        !active && styles.white,
        pressed && styles.pressed,
      ]}>
      {active && (
        <LinearGradient
          colors={[...Brand.buttonFill]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
        />
      )}
      <Ionicons
        name={icon}
        size={size * 0.44}
        color={active ? Brand.onPrimary : Brand.textStrong}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    // overflow: 'hidden'은 쓰지 않는다. 안드로이드에서 elevation 그림자가 잘린다.
    // 그라데이션은 자기 borderRadius로 이미 원형이라 클리핑이 필요 없다.
    shadowColor: Brand.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  white: { backgroundColor: Brand.background },
  pressed: { opacity: 0.9 },
});
