import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  ReduceMotion,
  runOnJS,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import * as WebBrowser from 'expo-web-browser';

import { ScreenState } from '@/components/common';
import { Brand, Components, Fonts, Layout, Typography } from '@/constants/theme';
import { lookupPlaceUrl } from '@/features/map/kakao-place';
import { matchSearchedPlace } from '@/features/map/place-match';
import { createApiTourDataSource } from '@/features/map/tour-api';
import { type Coords, TOUR_CATEGORIES, type TourCategory } from '@/features/map/tour-data';
import { useCurrentLocation } from '@/features/map/use-current-location';
import {
  useNearbyTours,
  type TourCongestionViewModel,
  type TourPlaceViewModel,
} from '@/features/map/use-nearby-tours';

const source = createApiTourDataSource();
/** 시트 높이 — 지도 영역 기준. 절반/확장 사이로 조절하고 아래로 더 끌면 숨긴다. */
const SHEET_COLLAPSED_RATIO = 0.5;
const SHEET_EXPANDED_RATIO = 0.85;
const ICONS = {
  음식점: require('@/assets/images/map/tour-food.svg'),
  관광지: require('@/assets/images/map/tour-attraction.svg'),
  숙박: require('@/assets/images/map/tour-stay.svg'),
} as const;

/**
 * Figma 634:1711 / 634:1576. 시설 조회 레이어.
 *
 * 지도가 중심 좌표를 알려 주면(getSearchOrigin) 분류를 고르거나 다시 조회할 때의 지도 중심으로 찾는다.
 * GPS 를 기다리지 않아 목록이 API 응답만큼만 걸린다. 지도를 움직일 때마다 자동으로 다시 부르지는 않는다.
 * 중심을 모르면(지도 SDK 오류·웹) 현재 위치(GPS)로 찾는다.
 */
export function useTourFacilities(getSearchOrigin?: () => Coords | null) {
  const [category, setCategory] = useState<TourCategory | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [location, locate] = useCurrentLocation();
  /** 지도 중심으로 찾을 때 고정해 둔 좌표. null 이면 GPS 로 찾는다 */
  const [mapOrigin, setMapOrigin] = useState<Coords | null>(null);
  const origin = mapOrigin ?? (location.status === 'ready' ? location.coords : null);
  const [state, retry] = useNearbyTours(source, category, origin);
  const [selectedPlace, setSelectedPlace] = useState<TourPlaceViewModel | null>(null);
  // 새 분류/좌표의 응답에 없는 상세는 즉시 닫는다. 응답마다 달라지는 임시 id로 재선택하지 않는다.
  const selected = state.status === 'ready' && selectedPlace && state.places.includes(selectedPlace)
    ? selectedPlace : null;

  /** 검색에서 고른 장소. 그 좌표 주변 목록이 오면 같은 장소를 찾아 상세를 연다 */
  const [pendingTarget, setPendingTarget] = useState<SearchedPlace | null>(null);
  /**
   * 관광공사 목록에서 못 찾은 검색 장소. 목록 위에 따로 보여 준다.
   * 음식점은 관광공사 자료에 실린 곳이 적어 대부분 여기로 온다 — 안 보여 주면 검색이 고장난 줄 안다.
   */
  const [searchedPlace, setSearchedPlace] = useState<SearchedPlace | null>(null);
  useEffect(() => {
    if (!pendingTarget || state.status === 'loading' || state.status === 'idle') return;
    setPendingTarget(null);
    const match = state.status === 'ready' ? matchSearchedPlace(state.places, pendingTarget) : null;
    if (match) setSelectedPlace(match);
    else setSearchedPlace(pendingTarget);
  }, [pendingTarget, state]);

  /** 지금 지도 중심을 조회 기준으로 잡는다. 중심을 모르면 false */
  const pinMapOrigin = () => {
    const center = getSearchOrigin?.() ?? null;
    setMapOrigin(center);
    return center !== null;
  };
  const selectCategory = (next: TourCategory) => {
    setSelectedPlace(null);
    setSearchedPlace(null);
    if (next === category) {
      // 숨긴 목록은 같은 칩으로 다시 연다. 열린 상태에서 다시 누르면 필터를 해제한다.
      setSheetOpen(!sheetOpen);
      if (sheetOpen) setCategory(null);
      return;
    }
    setCategory(next);
    setSheetOpen(true);
    if (!pinMapOrigin() && location.status === 'idle') void locate();
  };
  const refreshLocation = () => {
    setSelectedPlace(null);
    setSearchedPlace(null);
    // 현재 지도 중심을 새 조회 기준으로 고정한다.
    const center = getSearchOrigin?.() ?? null;
    if (!center) {
      setMapOrigin(null);
      void locate();
      return;
    }

    // 중심이 달라지면 origin 변경 자체가 새 요청을 만든다. 상태가 반영되기 전에
    // retry까지 호출하면 이전 지도 중심으로도 한 번 더 요청하게 된다.
    if (mapOrigin?.lat === center.lat && mapOrigin.lng === center.lng) retry();
    else setMapOrigin(center);
  };
  // 시트 표시와 조회 수명을 분리한다. 숨겨도 분류·응답·마커는 유지한다.
  const hide = () => { setSelectedPlace(null); setSheetOpen(false); };
  const close = () => { hide(); setCategory(null); setSearchedPlace(null); };
  const back = () => setSelectedPlace(null);
  /**
   * 검색에서 고른 장소로 연다. 그 좌표를 조회 기준으로 고정하고, 목록이 오면 상세까지 연다.
   * 이름 검색(카카오)과 목록(관광공사)이 다른 데이터라 좌표로 다시 맞춘다.
   */
  const openAt = (next: TourCategory, target: SearchedPlace) => {
    setSelectedPlace(null);
    setSearchedPlace(null);
    setCategory(next);
    setSheetOpen(true);
    setMapOrigin(target.coords);
    setPendingTarget(target);
  };
  const selectPlace = (id: string) => {
    const place = state.status === 'ready' ? state.places.find((item) => item.id === id) : null;
    if (place) { setSelectedPlace(place); setSheetOpen(true); }
  };
  const markers = useMemo(() => state.status === 'ready'
    ? state.places.flatMap((place) => place.coords ? [{ id: place.id, name: place.name, ...place.coords }] : [])
    : [], [state]);

  return { category, sheetOpen, location, origin, state, selected, searchedPlace, markers, byMapCenter: mapOrigin !== null,
    selectCategory, refreshLocation, retry, selectPlace, back, hide, close, openAt };
}

/** 검색에서 고른 장소 (카카오 결과) */
export interface SearchedPlace {
  name: string;
  address: string | null;
  coords: Coords;
}


/** 지도 마커·목록·상세가 같은 요청 결과와 선택 상태를 쓴다. */
export function TourFacilities({ facilities }: { facilities: ReturnType<typeof useTourFacilities> }) {
  const { category, sheetOpen, location, origin, state, selected, searchedPlace, byMapCenter,
    selectCategory, refreshLocation, retry, selectPlace, back, hide } = facilities;
  const [expanded, setExpanded] = useState(false);

  // 손잡이·헤더를 끌어 시트를 올리고 내린다 (스팟 상세 시트와 같은 방식).
  // 창이 아니라 지도 영역 높이를 기준으로 잡는다 — 헤더·검색줄을 뺀 실제 지도 크기다.
  const [layoutHeight, setLayoutHeight] = useState(0);
  const collapsedHeight = layoutHeight * SHEET_COLLAPSED_RATIO;
  const expandedHeight = layoutHeight * SHEET_EXPANDED_RATIO;
  // 아직 재기 전이면 높이를 강제하지 않고 지도 절반을 차지하게 둔다
  const measured = layoutHeight > 0;
  const sheetHeight = useSharedValue(collapsedHeight);

  const snapTo = (next: boolean) => {
    setExpanded(next);
    sheetHeight.value = withTiming(next ? expandedHeight : collapsedHeight, { duration: 200 });
  };

  const drag = Gesture.Pan()
    .onChange((event) => {
      const next = sheetHeight.value - event.changeY;
      sheetHeight.value = Math.min(Math.max(next, 0), expandedHeight);
    })
    .onEnd(() => {
      if (sheetHeight.value < collapsedHeight / 2) {
        runOnJS(hide)();
        return;
      }
      const goesUp = sheetHeight.value > (collapsedHeight + expandedHeight) / 2;
      sheetHeight.value = withTiming(goesUp ? expandedHeight : collapsedHeight, { duration: 200 });
      runOnJS(setExpanded)(goesUp);
    });

  // 처음 측정됐거나 화면이 회전하면 접힘 높이에 맞춘다
  useEffect(() => {
    if (layoutHeight === 0) return;
    sheetHeight.value = expanded ? expandedHeight : collapsedHeight;
  }, [layoutHeight, expanded, expandedHeight, collapsedHeight, sheetHeight, sheetOpen]);

  const sheetStyle = useAnimatedStyle(() => ({ height: sheetHeight.value }));
  useEffect(() => {
    if (!sheetOpen) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selected) back();
      else hide();
      return true;
    });
    return () => subscription.remove();
  }, [sheetOpen, selected, back, hide]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* 시트 높이 기준이 되는 지도 영역 크기를 잰다 */}
      <View
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        onLayout={(event) => setLayoutHeight(event.nativeEvent.layout.height)}
      />
      {/* 상세의 딤은 유지하되 노출된 지도의 드래그·마커 선택은 통과시킨다. */}
      {selected && sheetOpen ? (
        <View pointerEvents="none" testID="tour-facility-dim" style={[StyleSheet.absoluteFill, styles.backdrop]} />
      ) : null}
      <ScrollView
        horizontal
        style={styles.filters}
        contentContainerStyle={styles.filterContent}
        showsHorizontalScrollIndicator={false}>
        {TOUR_CATEGORIES.map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityLabel={`${item} 시설 보기`}
            accessibilityState={{ selected: category === item }}
            onPress={() => { setExpanded(false); selectCategory(item); }}
            style={({ pressed }) => [styles.chip, category === item && styles.chipSelected, pressed && styles.pressed]}>
            <Image source={ICONS[item]} style={styles.chipIcon} contentFit="contain" />
            <Text style={styles.chipLabel}>{item}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {category && sheetOpen ? (
        <Animated.View
          key={category}
          testID="tour-facility-sheet"
          entering={SlideInDown.duration(220).reduceMotion(ReduceMotion.System)}
          style={[styles.sheet, measured ? sheetStyle : styles.sheetUnmeasured]}>
          {/* 제스처 루트도 시트 안으로 한정해 노출된 지도의 터치를 가로채지 않는다. */}
          <GestureHandlerRootView style={styles.viewport}>
          {/* 손잡이와 헤더를 잡고 끌면 시트가 오르내린다 */}
          <GestureDetector gesture={drag}>
            <View>
              <View style={styles.grabberArea}>
                <View style={styles.grabber} />
              </View>
              <View style={styles.sheetHeader}>
            {selected ? (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="시설 목록으로 돌아가기"
                      onPress={back}
                      style={({ pressed }) => [styles.iconButton, styles.edgeStart, pressed && styles.pressed]}>
                      <Ionicons name="chevron-back" size={24} color={Brand.textStrong} />
                    </Pressable>
                    <View style={styles.copy}>
                      <Text accessibilityRole="header" numberOfLines={2} style={styles.heading}>
                        {selected.name}
                      </Text>
                    </View>
                  </>
            ) : (
              <View style={styles.copy}>
                <Text accessibilityRole="header" style={styles.heading}>
                  {byMapCenter ? `지도 중심 주변 ${category}` : `내 주변 ${category}`}
                </Text>
                <Text style={styles.meta}>
                  {byMapCenter ? '지도 중심 반경 5km · 가까운 순 · 최대 30곳' : '반경 5km · 가까운 순 · 최대 30곳'}
                </Text>
              </View>
            )}
            {!selected ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={byMapCenter ? '지도 중심으로 시설 다시 조회' : '현재 위치로 시설 다시 조회'}
                onPress={refreshLocation}
                style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                <Image source={require('@/assets/images/map/my-location.svg')} style={styles.locationIcon} contentFit="contain" />
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" accessibilityLabel={expanded ? '시설 시트 접기' : '시설 시트 펼치기'} accessibilityState={{ expanded }} onPress={() => snapTo(!expanded)} style={styles.iconButton}>
              <Ionicons name={expanded ? 'chevron-down' : 'chevron-up'} size={24} color={Brand.textStrong} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="시설 목록 닫기" onPress={hide} style={[styles.iconButton, styles.edgeEnd]}>
              <Ionicons name="close" size={24} color={Brand.textStrong} />
            </Pressable>
              </View>
            </View>
          </GestureDetector>
          <ScrollView key={selected?.id ?? 'list'} style={styles.viewport} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {selected ? (
              <View testID="tour-facility-detail" style={styles.detailContent}>
                <Text style={styles.address}>{selected.address ?? '주소 정보가 없어요'}</Text>
                <Text style={styles.distance}>{selected.distanceLabel ?? '거리 정보 없음'}</Text>
                {/* 카카오 링크를 못 찾아도 혼잡도는 따로 보인다. 둘 다 없으면 줄이 비어 자리를 차지하지 않는다 */}
                <View style={styles.detailActions}>
                  <PlaceLink place={selected} />
                  {selected.congestion ? <CongestionChip congestion={selected.congestion} /> : null}
                </View>
                <PlaceImage uri={selected.photos[0] ?? null} large />
              </View>
            ) : !origin ? (
              <ScreenState
                variant={location.status === 'denied' || location.status === 'unavailable' ? 'error' : 'loading'}
                title={location.status === 'denied' ? '위치 권한이 필요해요'
                  : location.status === 'unavailable' ? '현재 위치를 확인하지 못했어요' : '현재 위치를 확인하고 있어요'}
                description={location.status === 'denied'
                  ? '기기 또는 브라우저 설정에서 위치 권한을 허용한 뒤 다시 시도해 주세요.'
                  : location.status === 'unavailable' ? '위치 서비스를 켜고 다시 시도해 주세요.' : '내 주변 시설을 찾기 위해 위치를 확인해요.'}
                onRetry={refreshLocation}
              />
            ) : state.status === 'ready' ? (
              <>
              {searchedPlace ? <SearchedPlaceCard place={searchedPlace} category={category} /> : null}
              {state.places.map((place) => (
                <Pressable
                  key={place.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${place.name}, ${place.address ?? '주소 정보 없음'}, ${place.distanceLabel ?? '거리 정보 없음'}. 시설 상세 보기`}
                  onPress={() => selectPlace(place.id)}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                  <PlaceImage uri={place.thumbnailUrl} />
                  <View style={styles.placeCopy}>
                    <Text numberOfLines={2} style={styles.name}>{place.name}</Text>
                    <Text numberOfLines={2} style={styles.address}>{place.address ?? '주소 정보가 없어요'}</Text>
                    <Text style={styles.distance}>{place.distanceLabel ?? '거리 정보 없음'}</Text>
                  </View>
                </Pressable>
              ))}
              </>
            ) : (
              <>
              {/* 주변 목록이 비어도 검색한 곳은 보여 준다 */}
              {searchedPlace && state.status === 'empty'
                ? <SearchedPlaceCard place={searchedPlace} category={category} /> : null}
              <ScreenState
                variant={state.status === 'idle' ? 'loading' : state.status}
                title={state.status === 'empty' ? `주변에 ${category} 시설이 없어요`
                  : state.status === 'error' ? '시설을 불러오지 못했어요' : '주변 시설을 찾고 있어요'}
                description={state.status === 'empty' ? '현재 위치 반경 5km에서 찾은 결과가 없어요.'
                  : state.status === 'error' ? '잠시 후 다시 시도해 주세요.' : undefined}
                onRetry={retry}
              />
              </>
            )}
          </ScrollView>
          </GestureHandlerRootView>
        </Animated.View>
      ) : null}
    </View>
  );
}

/**
 * 카카오맵 장소 페이지로 보내는 링크.
 *
 * 관광공사 응답에 상세 링크가 없어 이름·좌표로 카카오에서 같은 장소를 찾는다.
 * 못 찾으면(이름이 모호하거나 REST 키가 없으면) 버튼 자체를 그리지 않는다.
 */
function PlaceLink({ place }: { place: TourPlaceViewModel }) {
  // 찾은 시설과 함께 들고 있다가 다른 시설을 열면 버린다 —
  // 그래야 새 링크가 오기 전에 이전 시설 링크가 잠깐 보이지 않는다.
  const [found, setFound] = useState<{ key: string; url: string } | null>(null);
  const { name, coords } = place;
  const key = `${name}@${coords?.lat ?? ''},${coords?.lng ?? ''}`;

  useEffect(() => {
    let alive = true;
    lookupPlaceUrl(name, coords)
      .then((url) => {
        if (alive && url) setFound({ key, url });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [key, name, coords]);

  const url = found?.key === key ? found.url : null;
  if (!url) return null;

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${place.name} 상세 정보 보기, 카카오맵에서 열기`}
      onPress={() => {
        // 앱을 벗어나지 않도록 인앱 브라우저로 연다
        void WebBrowser.openBrowserAsync(url).catch(() => undefined);
      }}
      style={({ pressed }) => [styles.placeLink, pressed && styles.pressed]}>
      <Text style={styles.placeLinkLabel}>상세 정보 보기</Text>
      <Ionicons name="open-outline" size={16} color={Brand.primaryDark} />
    </Pressable>
  );
}

/**
 * 당일 예상 혼잡도. 낚시 지수 등급과 같은 색 체계를 쓴다 (좋음=초록, 보통=파랑, 나쁨=주황).
 * 서버 rate 는 퍼센트가 아닌 지수라 숫자는 보여 주지 않고 등급만 보인다.
 */
const CONGESTION_COLOR: Readonly<Record<TourCongestionViewModel['level'], string>> = {
  여유: '#0E9F6E',
  보통: '#0079CA',
  혼잡: '#FF4312',
};

function CongestionChip({ congestion }: { congestion: TourCongestionViewModel }) {
  const color = CONGESTION_COLOR[congestion.level];
  return (
    <View
      accessible
      accessibilityLabel={`${congestion.dayLabel} 예상 혼잡도 ${congestion.level}`}
      style={[styles.congestion, { borderColor: color }]}>
      <View style={[styles.congestionDot, { backgroundColor: color }]} />
      <Text style={styles.congestionLabel}>{congestion.dayLabel} 예상 혼잡도</Text>
      <Text style={[styles.congestionLevel, { color }]}>{congestion.level}</Text>
    </View>
  );
}

/**
 * 검색한 곳이 관광공사 목록에 없을 때 목록 위에 붙이는 카드.
 * 관광공사 자료가 없으니 사진·혼잡도는 없고, 카카오맵으로 넘기는 링크만 준다.
 */
function SearchedPlaceCard({ place, category }: { place: SearchedPlace; category: TourCategory | null }) {
  // PlaceLink 는 이름·좌표만 쓴다. 나머지 필드는 목록 항목과 모양을 맞추려고 비워 둔다
  const linkTarget: TourPlaceViewModel = {
    id: `searched:${place.name}`,
    name: place.name,
    address: place.address,
    distanceLabel: null,
    thumbnailUrl: null,
    photos: [],
    coords: place.coords,
    congestion: null,
  };
  return (
    <View testID="tour-searched-place" style={styles.searched}>
      <Text style={styles.searchedLabel}>검색한 곳</Text>
      <Text numberOfLines={2} style={styles.name}>{place.name}</Text>
      {place.address ? <Text numberOfLines={2} style={styles.address}>{place.address}</Text> : null}
      <Text style={styles.searchedNotice}>
        관광 정보에 없는 곳이라 주변 {category ?? '시설'}을 함께 보여 드려요.
      </Text>
      <View style={styles.detailActions}>
        <PlaceLink place={linkTarget} />
      </View>
    </View>
  );
}

function PlaceImage({ uri, large = false }: { uri: string | null; large?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const style = [styles.photo, large && styles.detailPhoto];
  return uri && uri !== failedUrl ? (
    <Image source={{ uri }} style={style} contentFit="cover" onError={() => setFailedUrl(uri)} />
  ) : (
    <View style={style}><Text style={styles.meta}>사진 없음</Text></View>
  );
}

const styles = StyleSheet.create({
  filters: { position: 'absolute', left: 72, right: 12, top: Components.map.overlayInset - 2, height: 48, flexGrow: 0 },
  filterContent: { gap: 8, alignItems: 'center', paddingHorizontal: 2, paddingRight: 8 },
  chip: { minHeight: 44, paddingHorizontal: 14, flexDirection: 'row', gap: 6, alignItems: 'center', borderRadius: 69, backgroundColor: Brand.background, boxShadow: '1px 2px 5px rgba(0,0,0,0.18)' },
  chipSelected: { backgroundColor: Brand.surfaceSoft, boxShadow: 'inset 0px 2px 4px rgba(49,135,241,0.25)' },
  chipIcon: { width: 16, height: 16 },
  chipLabel: { ...Typography.caption, color: Brand.textHeading, lineHeight: 28 },
  sheetUnmeasured: { top: '50%' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Brand.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    // 지도와 시트의 경계가 흐려 보여 위쪽에만 그림자를 준다
    boxShadow: '0px -6px 18px rgba(0, 78, 124, 0.22)',
    elevation: 16,
  },
  viewport: { flex: 1 },
  /** 손잡이 — 끌 수 있다는 표시이자 헤더 위 여백이다 */
  grabberArea: { paddingTop: 8, paddingBottom: 4, alignItems: 'center' },
  grabber: { width: 44, height: 4, borderRadius: 2, backgroundColor: Brand.divider },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Layout.screenPadding, paddingTop: 4, gap: 4 },
  /** 아이콘 버튼은 터치 영역이 44 라, 그림이 본문 시작선에 오도록 당겨 둔다 */
  edgeStart: { marginLeft: -10 },
  edgeEnd: { marginRight: -10 },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  heading: { ...Typography.sectionTitle, color: Brand.textHeading },
  meta: { ...Typography.footnote, color: Brand.textWeak, lineHeight: 19 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  locationIcon: { width: 24, height: 24 },
  /** 목록과 상세가 같은 위쪽 여백에서 시작한다 */
  list: { paddingHorizontal: Layout.screenPadding, paddingTop: 12, paddingBottom: 20 },
  row: { minHeight: 112, flexDirection: 'row', alignItems: 'flex-start', gap: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Components.state.border },
  photo: { width: 120, height: 80, flexShrink: 0, borderRadius: 4, backgroundColor: Brand.divider, justifyContent: 'center', alignItems: 'center' },
  placeCopy: { flex: 1, minWidth: 0 },
  name: { ...Typography.button, color: Brand.textHeading, lineHeight: 24 },
  address: { ...Typography.footnote, color: Brand.textWeak, lineHeight: 19 },
  distance: { ...Typography.caption, color: Brand.textMuted, lineHeight: 20, marginTop: 8 },
  pressed: { opacity: 0.72 },
  detailContent: { paddingBottom: 12 },
  backdrop: { backgroundColor: Brand.scrim },
  searched: {
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: Brand.surfaceSoft,
    borderWidth: 1,
    borderColor: Brand.primary,
  },
  searchedLabel: { ...Typography.caption, color: Brand.primaryDark, marginBottom: 4 },
  searchedNotice: { ...Typography.caption, color: Brand.textMuted, lineHeight: 20, marginTop: 8 },
  detailActions: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  placeLink: {
    minHeight: 44,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Brand.primary,
  },
  placeLinkLabel: { ...Typography.caption, color: Brand.primaryDark },
  // 상세 정보 보기 버튼과 나란히 두므로 높이와 모서리를 맞춘다
  congestion: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  congestionDot: { width: 8, height: 8, borderRadius: 4 },
  congestionLabel: { ...Typography.caption, color: Brand.textWeak },
  // fontWeight 대신 굵은 서체 파일을 지정한다 — SUITE 에 bold 를 얹으면 시스템 폰트로 바뀐다
  congestionLevel: { ...Typography.caption, fontFamily: Fonts.bold },
  detailPhoto: { width: '100%', height: 200, marginTop: 16 },
});
