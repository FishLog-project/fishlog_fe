import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet } from 'react-native';

import { Brand } from '@/constants/theme';

type Props = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  active?: boolean;
  onPress?: () => void;
  size?: number;
};

/**
 * Map/FAB — 지도 위 원형 토글 버튼.
 * default: 흰 배경 + 검정 아이콘 / active: 블루 그라데이션 + 흰 아이콘.
 * (Figma "Icon" 세트의 원형 버튼 변형)
 */
export function FabButton({ icon, active, onPress, size = 52 }: Props) {
  const dim = { width: size, height: size, borderRadius: size / 2 };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        dim,
        !active && styles.white,
        pressed && styles.pressed,
      ]}>
      {active && (
        <LinearGradient
          colors={['#5BC8FF', '#0085DE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
        />
      )}
      <Ionicons
        name={icon}
        size={size * 0.44}
        color={active ? '#FFFFFF' : '#1C1C1C'}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#004E7C',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  white: { backgroundColor: '#FFFFFF' },
  pressed: { opacity: 0.9 },
});
