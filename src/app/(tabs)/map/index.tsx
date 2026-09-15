import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Screen, ScreenHeader, SearchBar } from '@/components/common';
import { Brand, Components, Layout } from '@/constants/theme';
import { useAuth } from '@/features/auth';
import { SeaInfoStrip } from '@/features/map/components/sea-info-strip';
import { SpotDetailSheet } from '@/features/map/components/spot-detail-sheet';
import { FishlogKakaoMap } from '@/features/map/kakao-map';
import { createApiSpotDataSource } from '@/features/map/spot-api';
import { createFixtureSpotDataSource } from '@/features/map/spot-data';
import type { Coords } from '@/features/map/tour-data';
import { TourFacilities, useTourFacilities } from '@/features/map/tour-facilities';
import { setSpotFavorite } from '@/features/map/spot-list-store';
import { useSpotsViewModel } from '@/features/map/use-spot-view-model';
import { USE_FIXTURE } from '@/lib/data-source-mode';

const MAP = Components.map;

/** 주변 시설·해양 정보는 토글이다 (Figma 634:1495) — 금지 구역은 아직 동작이 정해지지 않았다 */
const MAP_ACTIONS: readonly { key: string; icon: number; label: string }[] = [
  { key: 'facilities', icon: require('@/assets/images/map/grid.svg'), label: '주변 시설' },
  // { key: 'sea', icon: require('@/assets/images/map/sea-info.svg'), label: '해양 정보 보기' },
  // {
  //   key: 'prohibited',
  //   icon: require('@/assets/images/map/fishing-disabled.svg'),
  //   label: '낚시 금지 구역 보기',
  // },
  { key: 'fish', icon: require('@/assets/images/map/fish-scan.svg'), label: '물고기 인증하기' },
] as const;

export default function MapScreen() {
  const router = useRouter();
  const { token, sessionId } = useAuth();
  const [recenterSignal, setRecenterSignal] = useState(0);
  const [seaInfoOpen, setSeaInfoOpen] = useState(false);
  const [facilitiesOpen, setFacilitiesOpen] = useState(false);
  /**
   * 카메라가 멈출 때마다 바뀌는 지도 중심. 시설을 조회하는 순간에만 읽으므로
   * 드래그마다 화면을 다시 그리지 않게 state 가 아니라 ref 에 둔다.
   */
  const mapCenter = useRef<Coords | null>(null);
  const getMapCenter = useCallback(() => mapCenter.current, []);
  const rememberMapCenter = useCallback((center: Coords) => {
    mapCenter.current = { lat: center.lat, lng: center.lng };
  }, []);
  const [selectedSpotId, setSelectedSpotId] = useState<number | null>(null);
  const sessionKey = USE_FIXTURE ? 'fixture' : `session-${sessionId}`;
  const rememberFavorite = useCallback((spotId: number, isFavorite: boolean) => {
    setSpotFavorite(sessionKey, spotId, isFavorite);
  }, [sessionKey]);
  const facilities = useTourFacilities(getMapCenter);

  const dataSource = useMemo(
    () => (USE_FIXTURE ? createFixtureSpotDataSource() : createApiSpotDataSource(token)),
    [token],
  );
  const { markers, allSpots, refresh, refreshing } = useSpotsViewModel(
    dataSource,
    sessionKey,
  );
  const selectedSpot = allSpots?.find((spot) => spot.id === selectedSpotId) ?? null;
  const selectedIsFavorite = selectedSpot?.isFavorite ?? false;

  /**
   * 검색 화면에서 고른 스팟을 연다.
   *
   * 같은 spotId 로 목록이 다시 들어와도 시트를 또 열지 않도록 처리한 값을 기억한다.
   */
  const { spotId: requestedSpotId, searchRequest } = useLocalSearchParams<{ spotId?: string; searchRequest?: string }>();
  const requestKey = requestedSpotId ? `${requestedSpotId}:${searchRequest ?? ''}` : null;
  const [handledSpotId, setHandledSpotId] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lng: number; nonce: number } | null>(null);

  /**
   * 다른 탭에 갔다 돌아오면 처음 상태로 되돌린다.
   *
   * 탭 화면은 마운트된 채 남아서, 보고 있던 시설 상세와 스팟 시트가 그대로 남아 있었다.
   * 첫 진입은 마운트 때 이미 현재 위치를 잡으므로 건너뛴다.
   */
  const returned = useRef(false);
  /**
   * useTourFacilities 는 렌더마다 새 객체를 돌려준다.
   * 그대로 의존성에 넣으면 렌더할 때마다 초기화가 다시 돌아, 방금 연 시설을 곧바로 닫는다.
   */
  const facilitiesRef = useRef(facilities);
  useEffect(() => {
    facilitiesRef.current = facilities;
  }, [facilities]);
  useFocusEffect(useCallback(() => {
    if (!returned.current) {
      returned.current = true;
      return;
    }
    facilitiesRef.current.close();
    setFacilitiesOpen(false);
    setSeaInfoOpen(false);
    setSelectedSpotId(null);
    setFocus(null);
    setRecenterSignal((signal) => signal + 1);
  }, []));


  // effect 가 아니라 렌더 중에 맞춘다 — 파라미터라는 "바깥 값"에 상태를 맞추는 경우라
  // effect 로 두면 한 번 그린 뒤 다시 그리게 된다.
  if (requestedSpotId && requestKey !== handledSpotId && allSpots) {
    const spot = allSpots.find((item) => item.id === Number(requestedSpotId));
    if (spot) {
      setHandledSpotId(requestKey);
      setSelectedSpotId(spot.id);
      setFocus({ lat: spot.lat, lng: spot.lng, nonce: (focus?.nonce ?? 0) + 1 });
    }
  }

  return (
    <Screen edgeToEdge header={<ScreenHeader title="지도" />}>
      {/* 검색은 별도 화면에서 한다 — 여기서는 들어가는 입구 역할만 */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="낚시터 검색"
        onPress={() => router.push('/search')}
        style={styles.searchArea}>
        <View pointerEvents="none">
          <SearchBar value={selectedSpot?.name ?? ''} placeholder="낚시터 검색" />
        </View>
      </Pressable>

      <View style={styles.mapCanvas}>
        <FishlogKakaoMap
          recenterSignal={recenterSignal}
          spots={markers ?? undefined}
          onSpotPress={(id) => { facilities.close(); setSelectedSpotId(id); }}
          tourPlaces={facilitiesOpen ? facilities.markers : undefined}
          onTourPress={(id) => { setSelectedSpotId(null); facilities.selectPlace(id); }}
          // 시트가 올라와 있을 때 지도를 누르면 내린다
          onMapPress={() => { facilities.close(); setSelectedSpotId(null); }}
          focus={focus}
          onCameraIdle={rememberMapCenter}
        />
        <View pointerEvents="none" style={styles.mapShade} />

        <View style={styles.actionColumn}>
          {MAP_ACTIONS.map((action) => (
            <MapAction
              key={action.key}
              icon={action.icon}
              label={action.label}
              selected={
                (action.key === 'facilities' && facilitiesOpen) ||
                (action.key === 'sea' && seaInfoOpen)
              }
              onPress={
                action.key === 'facilities'
                  ? () => { facilities.close(); setFacilitiesOpen((open) => !open); }
                  : action.key === 'sea'
                    ? () => setSeaInfoOpen((open) => !open)
                    : action.key === 'fish'
                      ? () => router.push('/catch')
                      : undefined
              }
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

        {/*
          ⚠️ 시안에 없는 버튼이다. 스팟 목록은 한 번 받아 두고 재사용하므로
             서버 값을 다시 받고 싶을 때 누른다. 위치는 현재 위치 버튼 위에 임시로 둔다.
        */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="낚시터 목록 새로고침"
          accessibilityState={{ busy: refreshing, disabled: refreshing }}
          disabled={refreshing}
          onPress={refresh}
          style={({ pressed }) => [styles.locationButton, styles.refreshButton, pressed && styles.pressed]}>
          {refreshing ? (
            <ActivityIndicator color={Brand.primary} />
          ) : (
            <Ionicons name="refresh" size={MAP.actionIconSize} color={Brand.primaryDark} />
          )}
        </Pressable>

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
        {facilitiesOpen ? <TourFacilities facilities={facilities} /> : null}
      </View>

      <SpotDetailSheet
        key={sessionKey}
        dataSource={dataSource}
        spotId={selectedSpotId}
        isFavorite={selectedIsFavorite}
        onFavoriteChange={rememberFavorite}
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
        selected && styles.actionSelected,
        pressed && styles.pressed,
      ]}>
      <Image
        source={icon}
        style={styles.actionIcon}
        tintColor={selected ? Brand.onPrimary : undefined}
        contentFit="contain"
      />

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
  actionIcon: { width: MAP.actionIconSize, height: MAP.actionIconSize },
  actionSelected: { backgroundColor: Brand.primary },
  pressed: { opacity: 0.72 },
  refreshButton: { bottom: MAP.overlayInset + MAP.actionSize + MAP.actionGap },
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
