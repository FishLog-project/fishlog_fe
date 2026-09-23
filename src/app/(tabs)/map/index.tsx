import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen, ScreenHeader, SearchBar } from '@/components/common';
import { Brand, Components, Layout, Typography } from '@/constants/theme';
import { useAuth } from '@/features/auth';
import { SeaInfoStrip } from '@/features/map/components/sea-info-strip';
import { SpotDetailSheet } from '@/features/map/components/spot-detail-sheet';
import { isValidCoords } from '@/features/map/geo';
import { FishlogKakaoMap } from '@/features/map/kakao-map';
import { createApiSpotDataSource } from '@/features/map/spot-api';
import { createFixtureSpotDataSource } from '@/features/map/spot-data';
import { TOUR_CATEGORIES, type Coords, type TourCategory } from '@/features/map/tour-data';
import { allZones, toZonePolygons } from '@/features/map/prohibited-zones';
import { TourFacilities, useTourFacilities } from '@/features/map/tour-facilities';
import { setSpotFavorite } from '@/features/map/spot-list-store';
import { useSpotsViewModel } from '@/features/map/use-spot-view-model';
import { USE_FIXTURE } from '@/lib/data-source-mode';

const MAP = Components.map;

/**
 * 금지 구역을 켜면 구역이 모여 있는 곳으로 카메라를 옮긴다.
 *
 * 자료(국립해양조사원)의 24곳 중 21곳이 부산·울산·경남 해역 75x64km 안에 몰려 있다.
 * 전국을 한 화면에 담으면 구역 하나가 1px 도 안 돼 아무것도 안 보인다.
 * 남은 3곳은 북한·러시아 근해라 이 화면 밖이지만 실제로 갈 수 있는 곳이 아니다.
 */
const ZONE_OVERVIEW = { lat: 35.137, lng: 129.051, zoomLevel: 10 };

/** 검색에서 고른 시설로 옮길 때의 줌. 시설 이름이 보이는 TOUR_LABEL_MIN_ZOOM 과 같다 */
const TOUR_SEARCH_ZOOM = 16;

/** 빈 문자열을 0 으로 읽지 않는다 — Number('') 는 0 이라 경도 0 으로 지도가 날아간다 */
function parseCoordParam(value: string | undefined): number {
  return value === undefined || value.trim() === '' ? NaN : Number(value);
}

function isTourCategory(value: string | undefined): value is TourCategory {
  return value !== undefined && (TOUR_CATEGORIES as readonly string[]).includes(value);
}

/** 주변 시설·해양 정보는 토글이다 (Figma 634:1495) — 금지 구역은 아직 동작이 정해지지 않았다 */
const MAP_ACTIONS: readonly { key: string; icon: number; label: string }[] = [
  { key: 'facilities', icon: require('@/assets/images/map/grid.svg'), label: '주변 시설' },
  // { key: 'sea', icon: require('@/assets/images/map/sea-info.svg'), label: '해양 정보 보기' },
  {
    key: 'prohibited',
    icon: require('@/assets/images/map/fishing-disabled.svg'),
    label: '낚시 금지 구역 보기',
  },
  { key: 'fish', icon: require('@/assets/images/map/fish-scan.svg'), label: '물고기 인증하기' },
] as const;

export default function MapScreen() {
  const router = useRouter();
  const { token, sessionId } = useAuth();
  const [recenterSignal, setRecenterSignal] = useState(0);
  const [seaInfoOpen, setSeaInfoOpen] = useState(false);
  const [facilitiesOpen, setFacilitiesOpen] = useState(false);
  const [zonesOpen, setZonesOpen] = useState(false);
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

  const zonePolygons = useMemo(
    () => (zonesOpen ? toZonePolygons(allZones()) : []),
    [zonesOpen],
  );
  /**
   * 구역을 켜면 전국 뷰로 빼 준다. 금지 구역은 해안 곳곳에 흩어져 있어서
   * 보던 자리에 그대로 두면 근처에 하나도 없는 경우가 대부분이다.
   */
  const toggleZones = useCallback(() => {
    setZonesOpen((open) => {
      const next = !open;
      if (next) setFocus({ ...ZONE_OVERVIEW, nonce: Date.now() });
      return next;
    });
  }, []);

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
  const refreshMap = () => {
    refresh();
    if (facilitiesOpen && facilities.category) facilities.refreshLocation();
  };

  /**
   * 홈·검색·저장 목록에서 고른 스팟을 연다.
   *
   * 같은 spotId 로 목록이 다시 들어와도 시트를 또 열지 않도록 처리한 값을 기억한다.
   */
  const {
    spotId: requestedSpotId,
    searchRequest,
    tourCategory: requestedTourCategory,
    tourLat,
    tourLng,
    tourName,
    tourAddress,
  } = useLocalSearchParams<{
    spotId?: string;
    searchRequest?: string;
    tourCategory?: string;
    tourLat?: string;
    tourLng?: string;
    tourName?: string;
    tourAddress?: string;
  }>();
  const requestKey = requestedSpotId ? `${requestedSpotId}:${searchRequest ?? ''}` : null;
  const tourRequestKey = requestedTourCategory ? `${requestedTourCategory}:${searchRequest ?? ''}` : null;
  const handledTourRequest = useRef<string | null>(null);
  const handledSpotRequest = useRef<string | null>(null);
  const focusNonce = useRef(0);
  const [focus, setFocus] = useState<
    { lat: number; lng: number; nonce: number; zoomLevel?: number } | null
  >(null);

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

  const applySpotRequest = useCallback(() => {
    if (!requestKey || requestKey === handledSpotRequest.current) return;
    const id = Number(requestedSpotId);
    if (!Number.isSafeInteger(id) || id <= 0) return;
    const spot = allSpots?.find((item) => item.id === id);
    if (!spot || !isValidCoords(spot)) return;

    handledSpotRequest.current = requestKey;
    setSelectedSpotId(spot.id);
    // 복귀 시 focus가 null이 되어도 nonce를 재사용하지 않아 같은 스팟으로 다시 이동할 수 있다.
    setFocus({ lat: spot.lat, lng: spot.lng, nonce: ++focusNonce.current });
  }, [allSpots, requestKey, requestedSpotId]);
  const mapFocused = useRef(false);
  const spotRequestRef = useRef(applySpotRequest);
  useEffect(() => {
    spotRequestRef.current = applySpotRequest;
    // 목록·파라미터가 늦게 도착해도, 복귀 초기화가 끝난 화면에서만 선택한다.
    if (mapFocused.current) applySpotRequest();
  }, [applySpotRequest]);

  /**
   * 검색에서 고른 관광지·음식점·숙박을 연다.
   * 그 장소로 지도를 옮기고, 같은 분류의 주변 목록을 연 뒤 목록에서 같은 장소의 상세까지 연다.
   */
  const applyTourRequest = useCallback(() => {
    if (!tourRequestKey || tourRequestKey === handledTourRequest.current) return;
    if (!isTourCategory(requestedTourCategory)) return;
    const coords = { lat: parseCoordParam(tourLat), lng: parseCoordParam(tourLng) };
    if (!isValidCoords(coords)) return;

    handledTourRequest.current = tourRequestKey;
    setSelectedSpotId(null);
    setFacilitiesOpen(true);
    facilitiesRef.current.openAt(requestedTourCategory, {
      name: tourName ?? '',
      address: tourAddress?.trim() ? tourAddress : null,
      coords,
    });
    setFocus({ ...coords, zoomLevel: TOUR_SEARCH_ZOOM, nonce: ++focusNonce.current });
  }, [tourRequestKey, requestedTourCategory, tourLat, tourLng, tourName, tourAddress]);
  const tourRequestRef = useRef(applyTourRequest);
  useEffect(() => {
    tourRequestRef.current = applyTourRequest;
    if (mapFocused.current) applyTourRequest();
  }, [applyTourRequest]);

  // 초기화와 선택은 같은 focus callback에서 순서대로 실행한다.
  // 별도 focus effects는 파라미터 렌더와 navigation 이벤트 순서에 따라 선택을 다시 지울 수 있다.
  useFocusEffect(useCallback(() => {
    mapFocused.current = true;
    if (returned.current) {
      facilitiesRef.current.close();
      setFacilitiesOpen(false);
      setSeaInfoOpen(false);
      setSelectedSpotId(null);
      setFocus(null);
      setRecenterSignal((signal) => signal + 1);
    }
    returned.current = true;
    spotRequestRef.current();
    tourRequestRef.current();
    return () => { mapFocused.current = false; };
  }, []));

  return (
    <Screen edgeToEdge fullWidth header={<ScreenHeader title="지도" />}>
      {/* 검색은 별도 화면에서 한다 — 여기서는 들어가는 입구 역할만 */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="낚시터·관광지·음식점·숙박 검색"
        onPress={() => {
          // 시설 검색 결과에 거리를 보이도록 지금 지도 중심을 넘긴다
          const center = mapCenter.current;
          router.push(center
            ? { pathname: '/search', params: { lat: String(center.lat), lng: String(center.lng) } }
            : '/search');
        }}
        style={styles.searchArea}>
        <View pointerEvents="none">
          <SearchBar value={selectedSpot?.name ?? ''} placeholder="낚시터·관광지·음식점·숙박 검색" />
        </View>
      </Pressable>

      <View style={styles.mapCanvas}>
        <FishlogKakaoMap
          recenterSignal={recenterSignal}
          spots={markers ?? undefined}
          onSpotPress={(id) => { facilities.hide(); setSelectedSpotId(id); }}
          tourPlaces={facilitiesOpen ? facilities.markers : undefined}
          onTourPress={(id) => { setSelectedSpotId(null); facilities.selectPlace(id); }}
          // 시트가 올라와 있을 때 지도를 누르면 내린다
          onMapPress={() => { facilities.hide(); setSelectedSpotId(null); }}
          focus={focus}
          zones={zonePolygons}
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
                (action.key === 'sea' && seaInfoOpen) ||
                (action.key === 'prohibited' && zonesOpen)
              }
              onPress={
                action.key === 'facilities'
                  ? () => { facilities.close(); setFacilitiesOpen((open) => !open); }
                  : action.key === 'sea'
                    ? () => setSeaInfoOpen((open) => !open)
                    : action.key === 'prohibited'
                      ? () => toggleZones()
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
        {/*
          자료가 바다만 다루고 그마저도 부산·울산에 몰려 있다. 구역이 없는 지역에서
          아무 반응이 없으면 버튼이 고장난 것처럼 보이므로 이유를 알려 준다.
        */}
        {zonesOpen && zonePolygons.length === 0 ? (
          <View pointerEvents="none" style={styles.zoneNotice}>
            <Text style={styles.zoneNoticeText}>이 지역에는 등록된 해상 낚시 금지구역이 없어요</Text>
          </View>
        ) : null}

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
          accessibilityLabel="지도 정보 새로고침"
          accessibilityState={{ busy: refreshing, disabled: refreshing }}
          disabled={refreshing}
          onPress={refreshMap}
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
  zoneNotice: {
    position: 'absolute',
    top: MAP.seaStrip.top,
    left: MAP.overlayInset,
    right: MAP.overlayInset,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(17, 24, 32, 0.78)',
  },
  zoneNoticeText: {
    ...Typography.caption,
    color: '#FFFFFF',
    textAlign: 'center',
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
