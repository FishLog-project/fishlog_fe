import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Components } from '@/constants/theme';

type Variant = 'food' | 'parking';

type Props = {
  label: string;
  variant: Variant;
  selected?: boolean;
  onPress?: () => void;
};

/** variant별 선행 아이콘 */
function LeadingIcon({ variant }: { variant: Variant }) {
  if (variant === 'food') {
    return (
      <Ionicons name="restaurant" size={15} color={Components.chip.food} />
    );
  }
  // 주차장: 초록 원 안에 흰 P
  return (
    <View style={[styles.pBadge, { backgroundColor: Components.chip.parking }]}>
      <Text style={styles.pText}>P</Text>
    </View>
  );
}

/**
 * Map/FAB/Filter — 지도 상단/하단의 필터 pill 칩.
 * default(흰 배경) / selected(연블루 배경) 상태.
 */
export function FilterChip({ label, variant, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected
            ? Components.chip.bgSelected
            : Components.chip.bgDefault,
        },
        pressed && styles.pressed,
      ]}>
      <LeadingIcon variant={variant} />
      <Text
        style={[
          styles.label,
          {
            color: selected
              ? Components.chip.textSelected
              : Components.chip.textDefault,
          },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: Components.chip.height,
    borderRadius: Components.chip.height / 2,
    paddingHorizontal: 14,
    // 디자인의 은은한 그림자
    shadowColor: '#004E7C',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  pressed: { opacity: 0.85 },
  label: { fontSize: 14, fontWeight: '500' },
  pBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
});
