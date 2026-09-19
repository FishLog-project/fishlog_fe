import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppDialog, Screen, ScreenHeader, SearchBar } from '@/components/common';
import { Brand, Components, Layout, Typography } from '@/constants/theme';
import { useAuth } from '@/features/auth';
import type { PlaceSearchResult } from '@/features/map/kakao-place';
import { useRecentSearches } from '@/features/map/recent-searches';
import { createApiSpotDataSource } from '@/features/map/spot-api';
import { createFixtureSpotDataSource } from '@/features/map/spot-data';
import { TOUR_CATEGORIES, type TourCategory } from '@/features/map/tour-data';
import { usePlaceSearch, type PlaceSearchState } from '@/features/map/use-place-search';
import { useSpotSearch, type SpotSearchResult } from '@/features/map/use-spot-search';
import { useSpotsViewModel } from '@/features/map/use-spot-view-model';
import { USE_FIXTURE } from '@/lib/data-source-mode';

const SEARCH = Components.map.search;

/** 검색 대상. 낚시터는 받아 둔 목록에서, 나머지는 카카오에서 찾는다 */
type SearchScope = '낚시터' | TourCategory;
const SCOPES: readonly SearchScope[] = ['낚시터', ...TOUR_CATEGORIES];

/** 지도의 시설 칩과 같은 아이콘을 쓴다 */
const SCOPE_ICONS: Readonly<Record<SearchScope, number>> = {
  낚시터: require('@/assets/images/home/fishing-rod.png'),
  관광지: require('@/assets/images/map/tour-attraction.svg'),
  음식점: require('@/assets/images/map/tour-food.svg'),
  숙박: require('@/assets/images/map/tour-stay.svg'),
};

const PLACEHOLDER: Readonly<Record<SearchScope, string>> = {
  낚시터: '낚시터 이름이나 지역을 검색해 보세요',
  관광지: '관광지 이름을 검색해 보세요',
  음식점: '음식점 이름이나 메뉴를 검색해 보세요',
  숙박: '숙소 이름이나 지역을 검색해 보세요',
};

function parseCoord(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  return raw !== undefined && raw.trim() !== '' && Number.isFinite(n) ? n : null;
}

/**
 * 낚시터 검색.
 *
 * ⚠️ Figma 시안이 없어 지도 화면의 여백·목록 간격에 맞춰 구성했다.
 * ⚠️ 서버에 검색 API 가 없어 이미 받아 둔 목록(GET /api/spots, 92건)을 클라이언트에서 거른다.
 *    항목이 더 늘어 느려지면 BE 에 검색 엔드포인트를 요청해야 한다.
 *
 * 이름과 지역(좌표를 변환한 주소)을 함께 본다. 고른 스팟은 지도로 돌아가 상세가 열린다.
 */
export default function SearchScreen() {
  const router = useRouter();
  const { token, sessionId } = useAuth();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<SearchScope>('낚시터');
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState<'empty' | 'error' | null>(null);
  const recent = useRecentSearches();

  // 지도가 넘겨 준 지도 중심. 시설 검색 결과의 거리 표시에만 쓴다
  const params = useLocalSearchParams<{ lat?: string; lng?: string }>();
  const nearLat = parseCoord(params.lat);
  const nearLng = parseCoord(params.lng);
  const near = useMemo(
    () => (nearLat !== null && nearLng !== null ? { lat: nearLat, lng: nearLng } : null),
    [nearLat, nearLng],
  );
  const tourCategory = scope === '낚시터' ? null : scope;
  const places = usePlaceSearch(query, tourCategory, near);

  const dataSource = useMemo(
    () => (USE_FIXTURE ? createFixtureSpotDataSource() : createApiSpotDataSource(token)),
    [token],
  );
  const { allSpots, state, refresh } = useSpotsViewModel(
    dataSource,
    USE_FIXTURE ? 'fixture' : `session-${sessionId}`,
  );
  const { results, loading } = useSpotSearch(allSpots, query);

  const trimmed = query.trim();

  /** 지도로 돌아가 그 장소 주변 시설 목록을 열고, 같은 장소의 상세까지 연다 */
  const openPlace = (result: PlaceSearchResult) => {
    recent.add(trimmed === '' ? result.name : trimmed);
    Keyboard.dismiss();
    router.navigate({
      pathname: '/map',
      params: {
        tourCategory: result.category,
        tourLat: String(result.coords.lat),
        tourLng: String(result.coords.lng),
        tourName: result.name,
        tourAddress: result.address ?? '',
        searchRequest: String(Date.now()),
      },
    });
  };

  const openSpot = (result: SpotSearchResult) => {
    recent.add(trimmed === '' ? result.spot.name : trimmed);
    Keyboard.dismiss();
    router.navigate({ pathname: '/map', params: { spotId: String(result.spot.id), searchRequest: String(Date.now()) } });
  };

  // 시설 검색 제출: 결과가 오면 첫 결과를 연다
  useEffect(() => {
    if (!submitted || tourCategory === null) return;
    if (places.status === 'loading' || places.status === 'idle') return;
    const timer = setTimeout(() => {
      setSubmitted(false);
      Keyboard.dismiss();
      if (places.status === 'ready' && places.results[0]) openPlace(places.results[0]);
      else setNotice(places.status === 'ready' ? 'empty' : 'error');
    }, 0);
    return () => clearTimeout(timer);
    // openPlace 는 렌더마다 새로 만들어진다. 결과가 바뀔 때만 다시 보면 된다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, tourCategory, places]);

  useEffect(() => {
    if (!submitted || tourCategory !== null || state.status === 'loading' || loading) return;
    // 입력 변경이나 화면 이탈 시 예약된 검색 완료 처리를 취소한다.
    const timer = setTimeout(() => {
      setSubmitted(false);
      Keyboard.dismiss();
      if (state.status === 'error') {
        setNotice('error');
        return;
      }
      recent.add(trimmed);
      const first = results?.[0];
      if (first) {
        router.navigate({ pathname: '/map', params: { spotId: String(first.spot.id), searchRequest: String(Date.now()) } });
      } else {
        setNotice('empty');
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [submitted, tourCategory, state.status, loading, results, trimmed, recent, router]);

  return (
    <Screen
      contentPadding={Layout.screenPadding}
      header={<ScreenHeader title="검색" showBack />}>
      <SearchBar
        value={query}
        onChangeText={(value) => { setQuery(value); setSubmitted(false); }}
        placeholder={PLACEHOLDER[scope]}
        returnKeyType="search"
        autoFocus
        onSubmitEditing={() => { if (trimmed) setSubmitted(true); }}
      />
      <ScopeTabs value={scope} onChange={(next) => { setScope(next); setSubmitted(false); }} />

      <View style={styles.body}>
        {trimmed === '' ? (
          <RecentSearches
            items={recent.items}
            onSelect={(value) => { setQuery(value); setSubmitted(true); }}
            onRemove={recent.remove}
            onClear={recent.clear}
          />
        ) : tourCategory === null ? (
          <SearchResults results={loading && results?.length === 0 ? null : results} onSelect={openSpot} />
        ) : (
          <PlaceResults state={places} category={tourCategory} onSelect={openPlace} />
        )}
      </View>
      <AppDialog
        visible={notice !== null}
        title={notice === 'error' ? '검색 정보를 불러오지 못했어요' : '검색 결과가 없어요'}
        message={notice === 'error' ? '잠시 후 다시 시도해 주세요.' : `다른 ${scope} 이름이나 지역으로 검색해 주세요.`}
        buttonLabel={notice === 'error' ? '다시 시도' : '확인'}
        onConfirm={() => {
          if (notice === 'error' && tourCategory === null) refresh();
          setNotice(null);
        }}
      />
    </Screen>
  );
}

function RecentSearches({
  items,
  onSelect,
  onRemove,
  onClear,
}: {
  items: readonly string[];
  onSelect: (keyword: string) => void;
  onRemove: (keyword: string) => void;
  onClear: () => void;
}) {
  if (items.length === 0) {
    return <Text style={styles.notice}>최근 검색어가 여기에 쌓여요.</Text>;
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionLabel}>최근 검색어</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="최근 검색어 전체 삭제"
          onPress={onClear}
          hitSlop={8}
          style={({ pressed }) => (pressed ? styles.pressed : undefined)}>
          <Text style={styles.clearLabel}>전체 삭제</Text>
        </Pressable>
      </View>

      <View>
        {items.map((keyword) => (
          <View key={keyword} style={styles.recentRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${keyword} 다시 검색`}
              onPress={() => onSelect(keyword)}
              style={({ pressed }) => [styles.recentLabelArea, pressed && styles.pressed]}>
              <Ionicons name="time-outline" size={18} color={Brand.textMuted} />
              <Text style={styles.recentLabel} numberOfLines={1}>
                {keyword}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${keyword} 검색 기록 삭제`}
              onPress={() => onRemove(keyword)}
              hitSlop={10}
              style={({ pressed }) => (pressed ? styles.pressed : undefined)}>
              <Ionicons name="close" size={SEARCH.removeSize} color={Brand.textDisabled} />
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

function SearchResults({
  results,
  onSelect,
}: {
  results: readonly SpotSearchResult[] | null;
  onSelect: (result: SpotSearchResult) => void;
}) {
  if (results === null) return <Text style={styles.notice}>낚시터를 불러오는 중이에요.</Text>;
  if (results.length === 0) {
    return <Text style={styles.notice}>검색 결과가 없어요. 다른 이름이나 지역으로 찾아보세요.</Text>;
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {results.map((result) => (
        <Pressable
          key={result.spot.id}
          accessibilityRole="button"
          accessibilityLabel={`${result.spot.name}, ${result.addressLabel ?? result.spot.category}`}
          onPress={() => onSelect(result)}
          style={({ pressed }) => [styles.resultRow, pressed && styles.pressed]}>
          <Text style={styles.resultName} numberOfLines={1}>
            {result.spot.name}
          </Text>
          {/* 좌표가 바다 위면 주소가 없다 — 그때는 분류로 대신한다 */}
          <Text style={styles.resultAddress} numberOfLines={1}>
            {result.addressLabel ?? result.spot.category}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function ScopeTabs({ value, onChange }: { value: SearchScope; onChange: (next: SearchScope) => void }) {
  return (
    // 네 개뿐이라 가로 스크롤 없이 한 줄에 나눠 담는다 — 스크롤이면 마지막 칩이 잘려 보였다
    <View style={styles.scopes}>
      {SCOPES.map((item) => (
        <Pressable
          key={item}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === item }}
          accessibilityLabel={`${item} 검색`}
          onPress={() => onChange(item)}
          style={({ pressed }) => [styles.scope, value === item && styles.scopeSelected, pressed && styles.pressed]}>
          <Image source={SCOPE_ICONS[item]} style={styles.scopeIcon} contentFit="contain" />
          <Text numberOfLines={1} style={[styles.scopeLabel, value === item && styles.scopeLabelSelected]}>
            {item}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function PlaceResults({
  state,
  category,
  onSelect,
}: {
  state: PlaceSearchState;
  category: TourCategory;
  onSelect: (result: PlaceSearchResult) => void;
}) {
  if (state.status === 'unavailable') {
    return <Text style={styles.notice}>지금은 {category} 검색을 쓸 수 없어요.</Text>;
  }
  if (state.status === 'error') {
    return <Text style={styles.notice}>검색하지 못했어요. 잠시 후 다시 시도해 주세요.</Text>;
  }
  if (state.status !== 'ready') return <Text style={styles.notice}>{category} 찾는 중이에요.</Text>;
  if (state.results.length === 0) {
    return <Text style={styles.notice}>검색 결과가 없어요. 지역 이름을 함께 넣어 보세요. (예: 해운대 횟집)</Text>;
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {state.results.map((result) => (
        <Pressable
          key={result.id}
          accessibilityRole="button"
          accessibilityLabel={`${result.name}, ${result.address ?? category}${result.distanceLabel ? `, ${result.distanceLabel}` : ''}. 지도에서 보기`}
          onPress={() => onSelect(result)}
          style={({ pressed }) => [styles.resultRow, pressed && styles.pressed]}>
          <View style={styles.resultHead}>
            <Text style={[styles.resultName, styles.resultNameFlex]} numberOfLines={1}>
              {result.name}
            </Text>
            {result.distanceLabel ? <Text style={styles.resultDistance}>{result.distanceLabel}</Text> : null}
          </View>
          <Text style={styles.resultAddress} numberOfLines={1}>
            {result.address ?? category}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // 지도의 시설 칩과 같은 알약 모양이다 (tour-facilities chip)
  scopes: { flexDirection: 'row', gap: 6, paddingTop: 16, paddingBottom: 4 },
  scope: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: 6,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 69,
    backgroundColor: Brand.background,
    borderWidth: 1,
    borderColor: Brand.divider,
  },
  scopeSelected: { backgroundColor: Brand.surfaceSoft, borderColor: Brand.primary },
  scopeIcon: { width: 16, height: 16 },
  scopeLabel: { ...Typography.caption, color: Brand.textWeak },
  scopeLabelSelected: { color: Brand.textHeading },
  resultHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultNameFlex: { flex: 1 },
  resultDistance: { ...Typography.caption, color: Brand.textMuted },

  body: { flex: 1, paddingTop: SEARCH.topGap },
  section: { gap: SEARCH.labelGap },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { ...Typography.sectionLabel, color: Brand.textWeak },
  clearLabel: { ...Typography.caption, color: Brand.textMuted },

  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: SEARCH.recentPaddingY,
  },
  recentLabelArea: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  recentLabel: { ...Typography.listItem, color: Brand.textStrong, flexShrink: 1 },

  resultRow: { paddingVertical: SEARCH.resultPaddingY, gap: SEARCH.resultTitleGap },
  resultName: { ...Typography.itemTitle, color: Brand.textStrong },
  resultAddress: { ...Typography.caption, color: Brand.textMuted },

  notice: { ...Typography.caption, color: Brand.textWeak },
  pressed: { opacity: 0.72 },
});
