import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ScreenState } from '@/components/common';
import { Brand, Components, Fonts, Typography } from '@/constants/theme';
import type { SpotDataSource, SpotFish } from '@/features/map/spot-data';
import {
  useSpotDetailViewModel,
  useSpotFavorite,
  type FishingIndexViewModel,
  type SpotDetailViewModel,
  type SpotLabelValue,
  type TideViewModel,
} from '@/features/map/use-spot-view-model';

const SHEET = Components.map.sheet;

/**
 * 스팟 상세 시트.
 *
 * 접힘  해양 634:1537 · 내륙 1176:3265
 * 펼침  해양 1125:2937 · 내륙 1176:3145
 *
 * 시안이 접힘/펼침 두 장으로 나뉘어 있어 이름 영역을 누르면 전환한다.
 * 해양이면 낚시 지수·물때·해양 환경을, 내륙이면 담수 환경을 보여준다 —
 * 서버가 forecast 와 inlandDetail 중 한쪽만 채워 주기 때문이다.
 */
export function SpotDetailSheet({
  dataSource,
  spotId,
  isFavorite = false,
  onFavoriteChange,
  onClose,
}: {
  dataSource: SpotDataSource;
  spotId: number | null;
  /** 목록(GET /api/spots)이 주는 초기값. 토글은 시트 안에서 관리한다 */
  isFavorite?: boolean;
  /** 찜이 서버에 반영됐을 때. 지도 목록의 낡은 값을 덮어쓰는 데 쓴다 */
  onFavoriteChange?: (spotId: number, isFavorite: boolean) => void;
  onClose: () => void;
}) {
  return (
    // animationType 을 none 으로 둔다. slide 로 두면 뒤의 막까지 시트와 함께 올라온다.
    <Modal visible={spotId !== null} transparent animationType="none" onRequestClose={onClose}>
      {/* 제스처는 Modal 안에 자체 root 가 있어야 동작한다 */}
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.scrim}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel="닫기"
            onPress={onClose}
          />
          {spotId !== null ? (
            <SpotDetailLoader
              key={spotId}
              dataSource={dataSource}
              spotId={spotId}
              isFavorite={isFavorite}
              onFavoriteChange={onFavoriteChange}
              onClose={onClose}
            />
          ) : null}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function SpotDetailLoader({
  dataSource,
  spotId,
  isFavorite,
  onFavoriteChange,
  onClose,
}: {
  dataSource: SpotDataSource;
  spotId: number;
  isFavorite: boolean;
  onFavoriteChange?: (spotId: number, isFavorite: boolean) => void;
  onClose: () => void;
}) {
  // Reanimated 의 shared value 를 직접 바꾸는 코드라 React Compiler 의 불변성 검사를 끈다.
  'use no memo';

  const { height } = useWindowDimensions();
  const [state, retry] = useSpotDetailViewModel(dataSource, spotId);
  const [expanded, setExpanded] = useState(false);
  const favorite = useSpotFavorite(dataSource, spotId, isFavorite, onFavoriteChange);

  const collapsedHeight = height * SHEET.collapsedRatio;
  const expandedHeight = height * SHEET.expandedRatio;

  const sheetHeight = useSharedValue(collapsedHeight);
  /** 시트만 아래에서 올라온다 — 뒤의 막은 그 자리에 그대로 깔린다 */
  const enter = useSharedValue(collapsedHeight);

  useEffect(() => {
    enter.value = withTiming(0, { duration: 240 });
  }, [enter]);

  const snapTo = useCallback(
    (next: boolean) => {
      setExpanded(next);
      // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value 는 이렇게 바꾼다
      sheetHeight.value = withTiming(next ? expandedHeight : collapsedHeight, { duration: 200 });
    },
    [collapsedHeight, expandedHeight, sheetHeight],
  );

  /** 위로 끌면 펼쳐지고 아래로 끌면 접힌다. 손을 떼면 가까운 쪽으로 붙는다 */
  const drag = Gesture.Pan()
    .onChange((event) => {
      const next = sheetHeight.value - event.changeY;
      // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value 는 이렇게 바꾼다
      sheetHeight.value = Math.min(Math.max(next, collapsedHeight), expandedHeight);
    })
    .onEnd(() => {
      const goesUp = sheetHeight.value > (collapsedHeight + expandedHeight) / 2;
      // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value 는 이렇게 바꾼다
      sheetHeight.value = withTiming(goesUp ? expandedHeight : collapsedHeight, { duration: 200 });
      runOnJS(setExpanded)(goesUp);
    });

  const sheetStyle = useAnimatedStyle(() => ({
    height: sheetHeight.value,
    transform: [{ translateY: enter.value }],
  }));

  return (
    <GestureDetector gesture={drag}>
      <Animated.View accessibilityViewIsModal style={[styles.sheet, sheetStyle]}>
        {state.status === 'ready' ? (
          <>
            <SheetHeader
              spot={state.data}
              favorite={favorite}
              expanded={expanded}
              onToggleExpand={() => snapTo(!expanded)}
              onClose={onClose}
            />
            <SpotDetailBody
              spot={state.data}
              expanded={expanded}
              favoriteFailure={favorite.failure}
            />
          </>
        ) : (
          <View style={styles.stateWrap}>
            <ScreenState
              variant={state.status === 'empty' ? 'empty' : state.status}
              onRetry={state.status === 'error' ? retry : undefined}
            />
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

function SheetHeader({
  spot,
  favorite,
  expanded,
  onToggleExpand,
  onClose,
}: {
  spot: SpotDetailViewModel;
  favorite: ReturnType<typeof useSpotFavorite>;
  expanded: boolean;
  onToggleExpand: () => void;
  onClose: () => void;
}) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: favorite.isFavorite, disabled: favorite.pending }}
        accessibilityLabel={favorite.isFavorite ? '찜 해제' : '찜하기'}
        onPress={favorite.toggle}
        hitSlop={10}
        style={({ pressed }) => (pressed ? styles.pressed : undefined)}>
        <Ionicons
          name={favorite.isFavorite ? 'heart' : 'heart-outline'}
          size={SHEET.favoriteSize}
          color={Brand.primary}
        />
      </Pressable>

      <Pressable
        style={styles.titleBlock}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={expanded ? '상세 접기' : '상세 펼치기'}
        onPress={onToggleExpand}>
        <Text style={styles.name} numberOfLines={1}>
          {spot.name}
        </Text>
        {/* 서버에 주소가 없어 지금은 분류·조회수로 대신한다 */}
        <Text style={styles.address} numberOfLines={1}>
          {spot.addressLabel ?? `${spot.categoryLabel} · ${spot.viewCountLabel}`}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="닫기"
        onPress={onClose}
        hitSlop={10}
        style={({ pressed }) => (pressed ? styles.pressed : undefined)}>
        <Ionicons name="close" size={SHEET.closeSize} color={Brand.textDisabled} />
      </Pressable>
    </View>
  );
}

function SpotDetailBody({
  spot,
  expanded,
  favoriteFailure,
}: {
  spot: SpotDetailViewModel;
  expanded: boolean;
  favoriteFailure: string | null;
}) {
  const marine = spot.marineRows !== null;

  return (
    <ScrollView
      style={styles.bodyViewport}
      contentContainerStyle={styles.body}
      scrollEnabled={expanded}
      showsVerticalScrollIndicator={false}>
      {spot.prohibited ? <Text style={styles.notice}>낚시 금지 구역이에요</Text> : null}
      {favoriteFailure ? <Text style={styles.notice}>{favoriteFailure}</Text> : null}

      {/* 본문은 항상 같은 순서로 유지하고 시트 높이만 바꾼다. */}
      <View style={styles.indexGroup}>
        <DateRow date={spot.forecastDateLabel} noon={spot.noonLabel} />
        {spot.fishingIndex ? <FishingIndexCard index={spot.fishingIndex} /> : null}
      </View>

      {spot.tide ? <TideRow tide={spot.tide} /> : null}

      <Section title="주요 어종">
        <FishTiles fishes={spot.majorFishes} />
      </Section>

      {marine ? (
        <Section title="해양 환경">
          <InfoRows rows={spot.marineRows ?? []} />
        </Section>
      ) : null}

      {spot.inlandRows ? (
        <Section title="담수 환경">
          <InfoRows rows={spot.inlandRows} />
        </Section>
      ) : null}
    </ScrollView>
  );
}

/** 날짜 + 오전/오후 배지 (Figma 1176:3180). 서버가 1건만 주므로 배지는 표시 전용이다 */
function DateRow({ date, noon }: { date: string | null; noon: string | null }) {
  return (
    <View style={styles.dateRow}>
      <Text style={styles.dateLabel}>{date ?? '예보 없음'}</Text>
      {noon ? (
        <View style={styles.noonBadge}>
          <Text style={styles.noonText}>{noon}</Text>
        </View>
      ) : null}
    </View>
  );
}

function FishingIndexCard({ index }: { index: FishingIndexViewModel }) {
  return (
    <View style={styles.indexCard}>
      <View style={styles.indexRow}>
        <View style={styles.indexGrade}>
          <View style={[styles.indexDot, { backgroundColor: index.color }]} />
          <Text style={[styles.indexLabel, { color: index.color }]}>{index.label}</Text>
        </View>
        <Text style={styles.indexDescription}>{index.description}</Text>
      </View>
    </View>
  );
}

/** 물때 행 (Figma 1176:3113) — 제목과 배지가 한 줄에 마주 본다 */
function TideRow({ tide }: { tide: TideViewModel }) {
  return (
    <View style={styles.tideRow}>
      <Text style={styles.sectionTitle}>물때</Text>
      <View style={styles.tideBadge}>
        <Text style={styles.tideName}>{tide.name}</Text>
        {tide.description ? <Text style={styles.tideDescription}>{tide.description}</Text> : null}
      </View>
    </View>
  );
}

/**
 * 주요 어종 칸 (Figma 1175:3058).
 *
 * 시안이 4칸 고정이라 어종이 적어도 빈 칸으로 자리를 지킨다.
 * 서버가 사진(imageUrl)을 주면 사진을, 없으면 이름만 보여준다.
 */
function FishTiles({ fishes }: { fishes: readonly SpotFish[] }) {
  const tiles = Array.from({ length: 4 }, (_, index): SpotFish | null => fishes[index] ?? null);

  return (
    <View style={styles.fishRow}>
      {tiles.map((fish, index) => (
        // 칸 수가 4로 고정이고 순서도 서버 순서를 그대로 따르므로 index 가 안정적인 key 다
        <View key={index} style={[styles.fishTile, fish === null && styles.fishTileEmpty]}>
          {fish ? (
            <View style={styles.fishInner}>
              {fish.imageUrl ? (
                <Image
                  source={{ uri: fish.imageUrl }}
                  style={styles.fishImage}
                  contentFit="contain"
                  accessibilityLabel={fish.name}
                />
              ) : null}
              <Text style={styles.fishName} numberOfLines={1}>
                {fish.name}
              </Text>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function Section({
  title,
  gap = SHEET.titleGap,
  children,
}: {
  title: string;
  gap?: number;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

/** 해양 환경 · 담수 환경 목록 (Figma Map/Info/List 1171:2975). 마지막 행은 구분선이 없다 */
function InfoRows({ rows }: { rows: readonly SpotLabelValue[] }) {
  return (
    <View>
      {rows.map((row, index) => (
        <View
          key={row.label}
          style={[styles.infoRow, index === rows.length - 1 && styles.infoRowLast]}>
          <Text style={styles.infoLabel}>{row.label}</Text>
          <Text style={styles.infoValue}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: Brand.scrim },
  sheet: {
    overflow: 'hidden',
    backgroundColor: Brand.background,
    borderTopLeftRadius: SHEET.radius,
    borderTopRightRadius: SHEET.radius,
    paddingTop: SHEET.paddingTop,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: SHEET.shadowOffsetY },
    shadowOpacity: SHEET.shadowOpacity,
    shadowRadius: SHEET.shadowBlur,
    elevation: 12,
  },
  stateWrap: { paddingHorizontal: SHEET.paddingX, paddingVertical: 32 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: SHEET.paddingX,
  },
  titleBlock: { flex: 1, alignItems: 'center' },
  name: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: Brand.textStrong,
    textAlign: 'center',
  },
  address: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 15,
    lineHeight: 28,
    letterSpacing: -0.3,
    color: Brand.textWeak,
    textAlign: 'center',
  },

  bodyViewport: { flex: 1 },
  body: {
    paddingHorizontal: SHEET.paddingX,
    paddingTop: SHEET.headerGap,
    paddingBottom: SHEET.paddingBottom,
    gap: SHEET.sectionGap,
  },
  notice: { ...Typography.itemMeta, color: Brand.textError },
  sectionTitle: {
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 28,
    letterSpacing: -0.32,
    color: Brand.textHeading,
  },

  indexGroup: { gap: SHEET.indexHeadGap },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateLabel: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 18,
    lineHeight: 28,
    letterSpacing: -0.36,
    color: Brand.textHeading,
  },
  noonBadge: {
    paddingHorizontal: SHEET.badgePaddingX,
    paddingVertical: SHEET.badgePaddingY,
    borderRadius: SHEET.badgeRadius,
    borderWidth: 1,
    borderColor: SHEET.badgeBorder,
  },
  noonText: {
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    fontSize: 12.833,
    lineHeight: 25.667,
    letterSpacing: -0.2567,
    color: Brand.textAccent,
  },

  indexCard: {
    // 시안은 고정 높이(72)지만 문구가 길면 잘려서 최소 높이로 둔다
    minHeight: SHEET.indexCardHeight,
    justifyContent: 'center',
    paddingLeft: SHEET.indexCardPaddingLeft,
    paddingRight: SHEET.indexCardPaddingRight,
    paddingVertical: SHEET.indexCardPaddingY,
    borderRadius: SHEET.indexCardRadius,
    backgroundColor: SHEET.indexCardBg,
  },
  indexRow: { flexDirection: 'row', alignItems: 'center', gap: SHEET.indexCardGap },
  indexGrade: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  indexDot: { width: SHEET.indexDot, height: SHEET.indexDot, borderRadius: SHEET.indexDot / 2 },
  // ⚠️ 시안은 세로 그라데이션 글자다. 마스킹 라이브러리가 package.json 에 없어 단색으로 대신한다.
  indexLabel: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 18,
    lineHeight: 28,
    letterSpacing: -0.36,
  },
  indexDescription: {
    flexShrink: 1,
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: -0.26,
    color: Brand.textHeading,
  },

  tideRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tideBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SHEET.badgeGap,
    paddingHorizontal: SHEET.badgePaddingX,
    paddingVertical: SHEET.badgePaddingY,
    borderRadius: SHEET.badgeRadius,
    backgroundColor: SHEET.badgeBg,
  },
  tideName: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 12.833,
    lineHeight: 25.667,
    letterSpacing: -0.2567,
    color: Brand.textHeading,
  },
  tideDescription: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 12.833,
    lineHeight: 25.667,
    letterSpacing: -0.2567,
    color: Brand.textMuted,
  },

  fishRow: { flexDirection: 'row', gap: SHEET.fishTileGap },
  fishTile: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: SHEET.fishTile,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: SHEET.fishTilePaddingX,
    paddingBottom: SHEET.fishTilePaddingBottom,
    borderRadius: SHEET.fishTileRadius,
    borderWidth: 1,
    borderColor: SHEET.fishTileBorder,
    backgroundColor: SHEET.fishTileBg,
  },
  /** 빈 칸은 자리만 지킨다 — 시안의 4칸 정렬이 어긋나지 않게 */
  fishTileEmpty: { borderColor: Brand.inactive },
  fishInner: { flex: 1, alignSelf: 'stretch', alignItems: 'center', gap: SHEET.fishTileInnerGap },
  fishImage: { flex: 1, width: '100%' },
  fishName: {
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.24,
    color: Brand.textAccent,
    textAlign: 'center',
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SHEET.rowPaddingX,
    paddingVertical: SHEET.rowPaddingY,
    borderBottomWidth: 1,
    borderBottomColor: SHEET.rowDivider,
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoLabel: {
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 28,
    letterSpacing: -0.28,
    color: SHEET.rowLabel,
  },
  infoValue: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 28,
    letterSpacing: -0.32,
    color: Brand.textStrong,
  },

  pressed: { opacity: 0.72 },
});
