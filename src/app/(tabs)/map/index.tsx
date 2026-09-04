import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen, ScreenHeader, SearchBar } from '@/components/common';
import { Brand, Components, Layout, Typography } from '@/constants/theme';

const MAP = Components.map;

const MAP_ACTIONS = [
  { icon: require('@/assets/images/map/grid.svg'), label: '격자로 보기' },
  { icon: require('@/assets/images/map/sea-info.svg'), label: '해양 정보 보기' },
  { icon: require('@/assets/images/map/fishing-disabled.svg'), label: '낚시 금지 구역 보기' },
  { icon: require('@/assets/images/map/fish-scan.svg'), label: '어종 탐색' },
] as const;

const SPOTS = [
  { name: '땡땡저수지', left: '31%', top: '40%' },
  { name: '청명호', left: '72%', top: '67%' },
  { name: '하늘연못', left: '27%', top: '79%' },
] as const;

/**
 * 지도 화면의 카카오 지도 연결 전 UI.
 * 실제 SDK 연결 시 mapCanvas의 정적 이미지만 지도 뷰로 교체한다.
 */
export default function MapScreen() {
  const [query, setQuery] = useState('');

  return (
    <Screen edgeToEdge header={<ScreenHeader title="지도" />}>
      <View style={styles.searchArea}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="낚시터 검색"
          returnKeyType="search"
        />
      </View>

      <View style={styles.mapCanvas}>
        <Image
          source={require('@/assets/images/map/map-placeholder.png')}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition="center"
        />
        <View pointerEvents="none" style={styles.mapShade} />

        <View style={styles.actionColumn}>
          {MAP_ACTIONS.map((action) => (
            <MapAction key={action.label} {...action} />
          ))}
        </View>

        {SPOTS.map((spot) => (
          <MapMarker key={spot.name} {...spot} />
        ))}

        <Image
          source={require('@/assets/images/map/current-location.svg')}
          style={styles.currentMarker}
          contentFit="contain"
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="현재 위치로 이동"
          style={({ pressed }) => [styles.locationButton, pressed && styles.pressed]}>
          <Image
            source={require('@/assets/images/map/my-location.svg')}
            style={styles.actionIcon}
            contentFit="contain"
          />
        </Pressable>
      </View>
    </Screen>
  );
}

function MapAction({ icon, label }: (typeof MAP_ACTIONS)[number]) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
      <Image source={icon} style={styles.actionIcon} contentFit="contain" />
    </Pressable>
  );
}

function MapMarker({ name, left, top }: (typeof SPOTS)[number]) {
  return (
    <View pointerEvents="none" style={[styles.marker, { left, top }]}>
      <Text style={styles.markerLabel}>{name}</Text>
      <Image
        source={require('@/assets/images/map/marker.svg')}
        style={styles.markerImage}
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchArea: {
    height: MAP.searchHeight,
    justifyContent: 'flex-start',
    paddingHorizontal: Layout.screenPadding,
    paddingTop: MAP.searchTop,
    backgroundColor: Brand.background,
  },
  mapCanvas: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#D7EAF4',
  },
  mapShade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
  },
  actionColumn: {
    position: 'absolute',
    top: MAP.overlayInset,
    left: MAP.overlayInset,
    gap: MAP.actionGap,
  },
  actionButton: {
    width: MAP.actionSize,
    height: MAP.actionSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: MAP.actionSize / 2,
    backgroundColor: Brand.background,
    shadowColor: '#004E7C',
    shadowOffset: { width: 1, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 5,
  },
  actionIcon: { width: MAP.actionIconSize, height: MAP.actionIconSize },
  pressed: { opacity: 0.72 },
  locationButton: {
    position: 'absolute',
    right: MAP.overlayInset,
    bottom: MAP.overlayInset,
    width: MAP.actionSize,
    height: MAP.actionSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: MAP.actionSize / 2,
    backgroundColor: Brand.background,
    shadowColor: '#004E7C',
    shadowOffset: { width: 1, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 5,
  },
  marker: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -32 }, { translateY: -10 }],
  },
  markerLabel: {
    ...Typography.badge,
    marginBottom: MAP.markerLabelGap,
    color: Brand.textStrong,
    fontSize: 12,
    lineHeight: 20,
  },
  markerImage: { width: 34, height: 46 },
  currentMarker: {
    position: 'absolute',
    left: '62%',
    top: '41%',
    width: 67,
    height: 67,
  },
});
