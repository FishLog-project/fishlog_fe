import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppDialog, Screen, ScreenHeader, SearchBar } from '@/components/common';
import { Brand, Components, Layout, Typography } from '@/constants/theme';
import { useAuth } from '@/features/auth';
import { useRecentSearches } from '@/features/map/recent-searches';
import { createApiSpotDataSource } from '@/features/map/spot-api';
import { createFixtureSpotDataSource } from '@/features/map/spot-data';
import { useSpotSearch, type SpotSearchResult } from '@/features/map/use-spot-search';
import { useSpotsViewModel } from '@/features/map/use-spot-view-model';
import { USE_FIXTURE } from '@/lib/data-source-mode';

const SEARCH = Components.map.search;

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
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState<'empty' | 'error' | null>(null);
  const recent = useRecentSearches();

  const dataSource = useMemo(
    () => (USE_FIXTURE ? createFixtureSpotDataSource() : createApiSpotDataSource(token)),
    [token],
  );
  const { allSpots, state, retry } = useSpotsViewModel(dataSource);
  const { results, loading } = useSpotSearch(allSpots, query);

  const trimmed = query.trim();

  const openSpot = (result: SpotSearchResult) => {
    recent.add(trimmed === '' ? result.spot.name : trimmed);
    Keyboard.dismiss();
    router.navigate({ pathname: '/map', params: { spotId: String(result.spot.id), searchRequest: String(Date.now()) } });
  };

  useEffect(() => {
    if (!submitted || state.status === 'loading' || loading) return;
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
  }, [submitted, state.status, loading, results, trimmed, recent, router]);

  return (
    <Screen
      contentPadding={Layout.screenPadding}
      header={<ScreenHeader title="낚시터 검색" showBack />}>
      <SearchBar
        value={query}
        onChangeText={(value) => { setQuery(value); setSubmitted(false); }}
        placeholder="낚시터 이름이나 지역을 검색해 보세요"
        returnKeyType="search"
        autoFocus
        onSubmitEditing={() => { if (trimmed) setSubmitted(true); }}
      />

      <View style={styles.body}>
        {trimmed === '' ? (
          <RecentSearches
            items={recent.items}
            onSelect={(value) => { setQuery(value); setSubmitted(true); }}
            onRemove={recent.remove}
            onClear={recent.clear}
          />
        ) : (
          <SearchResults results={loading && results?.length === 0 ? null : results} onSelect={openSpot} />
        )}
      </View>
      <AppDialog
        visible={notice !== null}
        title={notice === 'error' ? '검색 정보를 불러오지 못했어요' : '검색 결과가 없어요'}
        message={notice === 'error' ? '잠시 후 다시 시도해 주세요.' : '다른 낚시터 이름이나 지역으로 검색해 주세요.'}
        buttonLabel={notice === 'error' ? '다시 시도' : '확인'}
        onConfirm={() => {
          if (notice === 'error') retry();
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
    return <Text style={styles.notice}>최근 검색한 낚시터가 여기에 쌓여요.</Text>;
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

const styles = StyleSheet.create({
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
