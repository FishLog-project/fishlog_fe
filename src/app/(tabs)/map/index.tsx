import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen, ScreenHeader, SearchBar } from '@/components/common';
import { Brand, Components, Layout } from '@/constants/theme';
import { FishlogKakaoMap } from '@/features/map/kakao-map';

const MAP = Components.map;

const MAP_ACTIONS = [
  { icon: require('@/assets/images/map/grid.svg'), label: '격자로 보기' },
  { icon: require('@/assets/images/map/sea-info.svg'), label: '해양 정보 보기' },
  { icon: require('@/assets/images/map/fishing-disabled.svg'), label: '낚시 금지 구역 보기' },
  { icon: require('@/assets/images/map/fish-scan.svg'), label: '어종 탐색' },
] as const;

export default function MapScreen() {
  const [query, setQuery] = useState('');
  const [recenterSignal, setRecenterSignal] = useState(0);

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
        <FishlogKakaoMap recenterSignal={recenterSignal} />
        <View pointerEvents="none" style={styles.mapShade} />

        <View style={styles.actionColumn}>
          {MAP_ACTIONS.map((action) => (
            <MapAction key={action.label} {...action} />
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="현재 위치로 이동"
          onPress={() => setRecenterSignal((signal) => signal + 1)}
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
});
