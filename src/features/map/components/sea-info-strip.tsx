import { StyleSheet, Text, View } from 'react-native';

import { Brand, Components, Fonts } from '@/constants/theme';
import type { SpotLabelValue } from '@/features/map/use-spot-view-model';

const STRIP = Components.map.seaStrip;

/**
 * 해양 정보 스트립 (Figma 지도 해양 정보 634:1495).
 *
 * 좌측 FAB의 "해양 정보 보기"를 켜면 지도 위쪽 오른쪽에 뜬다.
 * 시안은 풍속·돌풍·기온·강수 4칸 고정이라, 값이 없어도 칸을 빼지 않고 '-'로 채운다.
 *
 * ⚠️ 서버 계약에 돌풍·강수가 없고 스팟을 고르기 전에는 예보 자체가 없다.
 *    지금은 선택된 스팟의 예보를 쓰고, 없으면 전 칸이 '-'다.
 */
export function SeaInfoStrip({ values }: { values: readonly SpotLabelValue[] | null }) {
  const items = values ?? PLACEHOLDER;

  return (
    <View style={styles.strip}>
      {items.map((item, index) => (
        <View key={item.label} style={styles.itemRow}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <View style={styles.item}>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.value}>{item.value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const PLACEHOLDER: readonly SpotLabelValue[] = [
  { label: '풍속', value: '-' },
  { label: '돌풍', value: '-' },
  { label: '기온', value: '-' },
  { label: '강수', value: '-' },
];

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: STRIP.paddingX,
    paddingVertical: STRIP.paddingY,
    borderRadius: STRIP.radius,
    backgroundColor: Brand.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.19,
    shadowRadius: 2.6,
    elevation: 3,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: STRIP.dividerHeight,
    marginHorizontal: STRIP.gap,
    backgroundColor: Brand.divider,
  },
  item: { width: STRIP.itemWidth, alignItems: 'center', gap: STRIP.labelGap },
  // 시안은 라벨 SUITE SemiBold 11, 값 Pretendard Medium 12 — 앱 기본 서체가 SUITE라 값도 SUITE로 맞춘다.
  label: {
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: -0.22,
    color: Brand.textWeak,
    textAlign: 'center',
  },
  value: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.24,
    color: Brand.textMuted,
    textAlign: 'center',
  },
});
