import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Components, Typography } from '@/constants/theme';

const SEGMENT = Components.segment;

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

/**
 * Common/SegmentControl — 같은 화면의 보기 방식을 바꾸는 두 칸짜리 전환기
 * (Figma Ranking/SegmentControl 323:1020).
 *
 * 칸 너비는 flex로 균등 분배한다. 개수가 늘어도 좌표를 다시 잡을 필요가 없다.
 */
export function SegmentControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.item,
              selected && styles.itemSelected,
              pressed && !selected && styles.pressed,
            ]}>
            <Text style={selected ? styles.labelSelected : styles.label}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    height: SEGMENT.height,
    borderRadius: SEGMENT.radius,
    backgroundColor: SEGMENT.track,
    padding: SEGMENT.padding,
    gap: SEGMENT.padding,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SEGMENT.thumbRadius,
  },
  itemSelected: {
    backgroundColor: SEGMENT.thumb,
    boxShadow: `0px 0px ${SEGMENT.thumbShadowBlur}px ${SEGMENT.thumbShadow}`,
  },
  pressed: { opacity: 0.6 },
  label: { ...Typography.segmentLabelIdle, color: SEGMENT.labelIdle },
  labelSelected: { ...Typography.segmentLabel, color: SEGMENT.labelActive },
});
