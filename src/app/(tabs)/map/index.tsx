import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen, ScreenHeader, SearchBar } from '@/components/common';
import { Brand, Components, Layout } from '@/constants/theme';
import { useAuth } from '@/features/auth';
import { SeaInfoStrip } from '@/features/map/components/sea-info-strip';
import { SpotDetailSheet } from '@/features/map/components/spot-detail-sheet';
import { FishlogKakaoMap } from '@/features/map/kakao-map';
import { createApiSpotDataSource } from '@/features/map/spot-api';
import { createFixtureSpotDataSource } from '@/features/map/spot-data';
import { useSpotsViewModel } from '@/features/map/use-spot-view-model';
import { USE_FIXTURE } from '@/lib/data-source-mode';

const MAP = Components.map;

/** 해양 정보만 토글이다 (Figma 634:1495) — 나머지 셋은 아직 동작이 정해지지 않았다 */
const MAP_ACTIONS = [
  { key: 'grid', icon: require('@/assets/images/map/grid.svg'), label: '격자로 보기' },
  { key: 'sea', icon: require('@/assets/images/map/sea-info.svg'), label: '해양 정보 보기' },
  {
    key: 'prohibited',
    icon: require('@/assets/images/map/fishing-disabled.svg'),
    label: '낚시 금지 구역 보기',
  },
  { key: 'fish', icon: require('@/assets/images/map/fish-scan.svg'), label: '어종 탐색' },
] as const;

export default function MapScreen() {
  const { token } = useAuth();
  const [recenterSignal, setRecenterSignal] = useState(0);
  const [seaInfoOpen, setSeaInfoOpen] = useState(false);
  const [selectedSpotId, setSelectedSpotId] = useState<number | null>(null);

  const dataSource = useMemo(
    () => (USE_FIXTURE ? createFixtureSpotDataSource() : createApiSpotDataSource(token)),
    [token],
  );
  const { markers, allSpots, query, setQuery } = useSpotsViewModel(dataSource);
  // 검색으로 걸러진 markers 가 아니라 원본에서 찾는다 — 검색 중에도 즐겨찾기 표시가 유지되도록.
  const selectedSpot = allSpots?.find((spot) => spot.id === selectedSpotId) ?? null;

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
        <FishlogKakaoMap
          recenterSignal={recenterSignal}
          spots={markers ?? undefined}
          onSpotPress={setSelectedSpotId}
        />
        <View pointerEvents="none" style={styles.mapShade} />

        <View style={styles.actionColumn}>
          {MAP_ACTIONS.map((action) => (
            <MapAction
              key={action.key}
              icon={action.icon}
              label={action.label}
              selected={action.key === 'sea' && seaInfoOpen}
              onPress={action.key === 'sea' ? () => setSeaInfoOpen((open) => !open) : undefined}
            />
          ))}
        </View>

        {/*
          ⚠️ 시안(634:1495)은 지도 위쪽에 풍속·돌풍·기온·강수를 띄우지만,
             지도 영역 단위의 날씨 엔드포인트가 아직 없다. 값이 없으면 '-'로 자리만 지킨다.
        */}
        {seaInfoOpen ? (
          <View style={styles.seaStrip}>
            <SeaInfoStrip values={null} />
          </View>
        ) : null}

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

      <SpotDetailSheet
        dataSource={dataSource}
        spotId={selectedSpotId}
        isFavorite={selectedSpot?.isFavorite ?? false}
        onClose={() => setSelectedSpotId(null)}
      />
    </Screen>
  );
}

function MapAction({
  icon,
  label,
  selected,
  onPress,
}: {
  icon: number;
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        selected && styles.actionButtonSelected,
        pressed && styles.pressed,
      ]}>
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
  seaStrip: {
    position: 'absolute',
    top: MAP.seaStrip.top,
    right: MAP.overlayInset,
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
  actionButtonSelected: { backgroundColor: Brand.surfaceSoft },
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
