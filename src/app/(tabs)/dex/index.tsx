import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Screen, ScreenHeader, ScreenState, SearchBar } from '@/components/common';
import { Brand, Components, Layout, Typography } from '@/constants/theme';
import { useAuth } from '@/features/auth';
import { createApiDexDataSource } from '@/features/dex/dex-api';
import { createFixtureDexDataSource } from '@/features/dex/dex-data';
import { SpeciesCard } from '@/features/dex/components/species-card';
import { SpeciesDetailDialog } from '@/features/dex/components/species-detail-dialog';
import { useDexViewModel, type DexSpeciesViewModel } from '@/features/dex/use-dex-view-model';
import { USE_FIXTURE } from '@/lib/data-source-mode';

const DEX = Components.dex;

/**
 * 수조 뚜껑 에셋 (Figma Subtract 634:1346).
 *
 * 그림자가 구워져 있어 SVG 캔버스(142.194x50.6)가 디자인 박스(134.594x43)보다 크다.
 * 바깥 박스를 그대로 두고 넣어야 뚜껑이 수조 테두리에 정확히 걸친다.
 */
const LID = require('@/assets/images/dex/tank-lid.svg');
const LID_WIDTH = 142.194;
const LID_HEIGHT = 50.6;

/** 검색바 아래부터 뚜껑 SVG 위쪽까지 (Figma 148 → 162.2) */
const LID_TOP_GAP = 14;
/** 뚜껑 SVG 위쪽부터 수조 테두리 윗면까지 (Figma 162.2 → 186) */
const TANK_TOP_INSET = 23.8;

/** 수조 안쪽 윗면부터 완성도 카드까지 (Figma 192 → 223) */
const TANK_PADDING_TOP = 31;
/** 검색 중엔 완성도 카드가 빠지고 첫 줄이 더 아래에서 시작한다 (Figma 도감 검색 192 → 243) */
const SEARCH_LIST_TOP = 51;
/** 완성도 카드와 첫 줄 사이 (Figma 296 → 316). rowGap 위에 얹는 값이다 */
const SUMMARY_GAP = DEX.rowGap;

export default function DexScreen() {
  const router = useRouter();
  const route = useLocalSearchParams<{
    fishId?: string | string[];
    fishType?: string | string[];
    openRequest?: string | string[];
  }>();
  const { fontScale } = useWindowDimensions();
  const [gridWidth, setGridWidth] = useState(0);
  // 일반 폰은 3열을 유지하고, 좁은 화면·큰 글씨는 열을 줄인다. 태블릿은 남는 폭을 쓴다.
  const columns = gridWidth > 0
    ? Math.max(1, Math.floor((gridWidth - 2 * Layout.screenPadding + DEX.columnGap) / (96 * Math.max(1, fontScale) + DEX.columnGap)))
    : 3;
  const { token } = useAuth();
  const dataSource = useMemo(
    () => (USE_FIXTURE ? createFixtureDexDataSource() : createApiDexDataSource(token)),
    [token],
  );
  const { state, results, query, setQuery, retry, isSearching } =
    useDexViewModel(dataSource);

  // 다른 화면에서 인증한 기록을 돌아왔을 때 다시 불러온다.
  // 첫 포커스는 마운트 요청과 겹치므로 건너뛴다.
  const returned = useRef(false);
  useFocusEffect(useCallback(() => {
    if (!returned.current) {
      returned.current = true;
      return;
    }
    retry();
  }, [retry]));

  // 상세 카드를 연 어종. 미획득 어종도 설명과 인증 진입점을 보여 준다.
  const [selected, setSelected] = useState<DexSpeciesViewModel | null>(null);
  const [dismissedOpenRequest, setDismissedOpenRequest] = useState<string | null>(null);
  const rawRouteId = Array.isArray(route.fishId) ? route.fishId[0] : route.fishId;
  const rawRouteType = Array.isArray(route.fishType) ? route.fishType[0] : route.fishType;
  const openRequest = Array.isArray(route.openRequest) ? route.openRequest[0] : route.openRequest;
  const routeFishId = Number(rawRouteId);
  const routeSelected = state.status === 'ready' && openRequest && openRequest !== dismissedOpenRequest
    && Number.isSafeInteger(routeFishId)
    ? state.data.species.find((fish) => fish.id === routeFishId && !!fish.custom === (rawRouteType === 'CUSTOM')) ?? null
    : null;
  const activeSelected = selected ?? routeSelected;

  /**
   * 마지막 줄이 덜 차면 flex:1 카드가 남은 자리를 나눠 갖느라 넓어진다.
   * 빈 칸을 채워 줄마다 카드 폭을 같게 만든다.
   */
  const gridData = useMemo(() => {
    if (!results) return null;
    const missing = (columns - (results.length % columns)) % columns;
    return missing === 0
      ? results
      : [...results, ...Array<null>(missing).fill(null)];
  }, [results, columns]);

  return (
    <Screen edgeToEdge header={<ScreenHeader title="도감" />}>
      <View style={styles.searchWrap}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="어종 또는 지역 검색"
          returnKeyType="search"
        />
      </View>

      {/* 화면 전체가 수조다 — 테두리 띠 + 안쪽 물색, 그 위에 뚜껑을 얹는다 */}
      <View style={styles.tankArea}>
        <View style={styles.tankRim}>
          <View style={styles.tankWater} onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
            {gridData ? (
              <FlatList
                key={columns}
                data={gridData}
                keyExtractor={(item, index) => (item ? `${item.custom ? 'custom' : 'fish'}-${item.id}` : `filler-${index}`)}
                numColumns={columns}
                renderItem={({ item }) =>
                  item ? (
                    <SpeciesCard species={item} onPress={setSelected} />
                  ) : (
                    <View style={styles.filler} />
                  )
                }
                columnWrapperStyle={columns > 1 ? styles.row : undefined}
                contentContainerStyle={[
                  styles.listContent,
                  isSearching && styles.listContentSearching,
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                ListHeaderComponent={
                  isSearching || state.status !== 'ready' ? null : (
                    <CompletionSummary
                      collected={state.data.collected}
                      total={state.data.total}
                      percent={state.data.progressPercent}
                    />
                  )
                }
                ListEmptyComponent={
                  <ScreenState
                    variant="empty"
                    title="검색 결과가 없어요"
                    description={`'${query.trim()}'와 일치하는 어종을 찾지 못했어요.`}
                  />
                }
              />
            ) : (
              <View style={styles.stateWrap}>
                <ScreenState
                  variant={state.status === 'ready' ? 'empty' : state.status}
                  title={state.status === 'empty' ? '도감이 아직 비어 있어요' : undefined}
                  description={
                    state.status === 'empty'
                      ? '어종 정보가 준비되면 이곳에서 확인할 수 있어요.'
                      : undefined
                  }
                  onRetry={state.status === 'error' ? retry : undefined}
                />
              </View>
            )}
          </View>
        </View>

        {/* 테두리보다 나중에 그려야 뚜껑이 위로 올라온다 */}
        <Image source={LID} style={styles.lid} contentFit="contain" />
      </View>

      <SpeciesDetailDialog
        dataSource={dataSource}
        fishId={activeSelected?.id ?? null}
        custom={activeSelected?.custom}
        caught={activeSelected?.caught}
        lockedImageUrl={activeSelected?.caught === false ? activeSelected.imageUrl : undefined}
        onAuthenticate={() => {
          setSelected(null);
          if (openRequest) setDismissedOpenRequest(openRequest);
          router.push('/catch');
        }}
        onClose={() => {
          setSelected(null);
          if (openRequest) setDismissedOpenRequest(openRequest);
        }}
      />
    </Screen>
  );
}

/** 도감 완성도 카드 — 좌측 수치 + 우측 막대 (Figma 634:1308) */
function CompletionSummary({
  collected,
  total,
  percent,
}: {
  collected: number;
  total: number;
  percent: number;
}) {
  const { fontScale } = useWindowDimensions();
  const [trackWidth, setTrackWidth] = useState(0);
  const barPadding = (DEX.barInset + 1) * 2;
  const barHeight = Math.max(DEX.barHeight, Typography.microLabel.lineHeight * fontScale + barPadding);
  // 숫자·%마다 한 글자 크기의 폭을 확보해, 좁은 트랙에서도 글자가 채움을 벗어나지 않게 한다.
  const labelWidth = `${percent}%`.length * Typography.microLabel.fontSize * fontScale;
  const labelFits = (trackWidth - barPadding) * percent / 100 >= labelWidth + barPadding;

  return (
    <View
      style={styles.summary}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`도감 완성도 ${percent}퍼센트, ${total}종 중 ${collected}종`}>
      <View>
        <Text style={styles.summaryLabel}>도감 완성도</Text>
        <Text style={styles.summaryValue}>
          {collected}/{total}종
        </Text>
      </View>

      <View
        style={[styles.barTrack, { height: barHeight, minWidth: Math.max(96, labelWidth + barPadding) }]}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}>
        <LinearGradient
          colors={[...DEX.barFill]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.barFill, { width: `${percent}%`, height: barHeight - barPadding }]}
        />
        {/* 채움이 좁으면 글자가 잘리므로 트랙 가운데에 흰 글씨로 얹는다 */}
        <Text
          style={[
            styles.barValue,
            labelFits
              ? { width: `${percent}%` }
              : { right: 0, color: Brand.onPrimary },
          ]}>
          {percent}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 헤더(56) 아래 4pt 띄우고 검색바 (Figma 100 → 104)
  searchWrap: { paddingTop: 4, paddingHorizontal: Layout.screenPadding },

  /** 뚜껑 SVG 위쪽을 기준으로 잡아 뚜껑이 영역 밖으로 넘치지 않게 한다 */
  tankArea: { flex: 1, marginTop: LID_TOP_GAP },
  tankRim: {
    flex: 1,
    marginTop: TANK_TOP_INSET,
    backgroundColor: DEX.rim,
    paddingTop: DEX.rimHeight,
  },
  tankWater: {
    flex: 1,
    backgroundColor: DEX.water,
    boxShadow: `0px -2px 2.1px ${DEX.shade}`,
  },
  lid: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -LID_WIDTH / 2,
    width: LID_WIDTH,
    height: LID_HEIGHT,
  },

  listContent: {
    paddingHorizontal: Layout.screenPadding,
    paddingTop: TANK_PADDING_TOP,
    paddingBottom: Layout.screenPadding,
    // 줄 간격. 완성도 카드와 첫 줄 사이도 이 값이 먹는다
    gap: DEX.rowGap,
  },
  listContentSearching: { paddingTop: SEARCH_LIST_TOP },
  row: { gap: DEX.columnGap },
  /** 마지막 줄의 빈 칸 — 카드와 같은 폭을 차지하기만 한다 */
  filler: { flex: 1 },
  stateWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Layout.screenPadding,
  },

  // 완성도 카드
  summary: {
    minHeight: DEX.summaryHeight,
    borderRadius: DEX.summaryRadius,
    backgroundColor: DEX.summaryBg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    // Figma 39/347 — 막대 쪽이 조금 더 안쪽으로 들어온다
    paddingLeft: 19,
    paddingRight: 23,
    paddingVertical: 8,
    gap: 21,
    // gap(rowGap=16) 위에 얹어 Figma의 20pt를 맞춘다
    marginBottom: SUMMARY_GAP - DEX.rowGap + 4,
  },
  summaryLabel: { ...Typography.cardCaption, color: Brand.textMuted },
  summaryValue: { ...Typography.cardTitle, color: Brand.textMuted },

  barTrack: {
    flex: 1,
    borderRadius: DEX.barRadius,
    backgroundColor: DEX.barTrack,
    borderWidth: 1,
    borderColor: DEX.barBorder,
    padding: DEX.barInset,
    justifyContent: 'center',
  },
  barFill: {
    borderRadius: DEX.barRadius,
  },
  /** 채움 폭 안에서 가운데 정렬된다 (채움이 넓을 때) */
  barValue: {
    ...Typography.microLabel,
    position: 'absolute',
    left: DEX.barInset,
    textAlign: 'center',
    color: Brand.textMuted,
  },
});
