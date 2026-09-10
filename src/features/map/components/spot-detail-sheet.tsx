import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { ScreenState, SegmentControl } from '@/components/common';
import { Brand, Components, Fonts, Typography } from '@/constants/theme';
import type { SpotDataSource } from '@/features/map/spot-data';
import {
  useSpotDetailViewModel,
  type NoonSegment,
  type SpotDetailViewModel,
  type SpotLabelValue,
} from '@/features/map/use-spot-view-model';

const SHEET = Components.map.sheet;

const NOON_OPTIONS: readonly { value: NoonSegment; label: string }[] = [
  { value: 'am', label: '오전' },
  { value: 'pm', label: '오후' },
];

/**
 * 스팟 상세 시트 (Figma 스팟 선택시 634:1537 · 상세 634:1611 · 1125:2937).
 *
 * 시안이 접힘(366)과 펼침(740) 두 장으로 나뉘어 있어 이름 영역을 누르면 전환한다.
 * 접힘은 주요 어종 + 해양 정보 간단요약까지, 펼침은 오늘의 낚시 정보·해양 환경·
 * 물때 정보까지 보여준다.
 *
 * ⚠️ 펼침 시안의 각 섹션 내용은 아직 회색 박스라 확정되지 않았다.
 *    지금은 서버가 주는 값(GET /api/spots/{spotId})으로 채워 두었고,
 *    시안이 나오면 각 Section 안쪽만 갈아 끼우면 된다.
 */
export function SpotDetailSheet({
  dataSource,
  spotId,
  isFavorite = false,
  onClose,
}: {
  dataSource: SpotDataSource;
  spotId: number | null;
  /** 목록(GET /api/spots)이 주는 값. 상세 응답에는 없다 */
  isFavorite?: boolean;
  onClose: () => void;
}) {
  return (
    <Modal visible={spotId !== null} transparent animationType="slide" onRequestClose={onClose}>
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
            onClose={onClose}
          />
        ) : null}
      </View>
    </Modal>
  );
}

function SpotDetailLoader({
  dataSource,
  spotId,
  isFavorite,
  onClose,
}: {
  dataSource: SpotDataSource;
  spotId: number;
  isFavorite: boolean;
  onClose: () => void;
}) {
  const { height } = useWindowDimensions();
  const [state, retry] = useSpotDetailViewModel(dataSource, spotId);
  const [expanded, setExpanded] = useState(false);

  const sheetHeight = height * (expanded ? SHEET.expandedRatio : SHEET.collapsedRatio);

  return (
    <View accessibilityViewIsModal style={[styles.sheet, { height: sheetHeight }]}>
      {state.status === 'ready' ? (
        <SpotDetailBody
          spot={state.data}
          isFavorite={isFavorite}
          expanded={expanded}
          onToggleExpand={() => setExpanded((value) => !value)}
          onClose={onClose}
        />
      ) : (
        <View style={styles.stateWrap}>
          <ScreenState
            variant={state.status === 'empty' ? 'empty' : state.status}
            onRetry={state.status === 'error' ? retry : undefined}
          />
        </View>
      )}
    </View>
  );
}

function SpotDetailBody({
  spot,
  isFavorite,
  expanded,
  onToggleExpand,
  onClose,
}: {
  spot: SpotDetailViewModel;
  isFavorite: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onClose: () => void;
}) {
  const [noon, setNoon] = useState<NoonSegment>(spot.forecastNoon ?? 'am');
  const marine = spot.forecastRows !== null;

  return (
    <>
      <View style={styles.header}>
        {/*
          ⚠️ 즐겨찾기 토글 API가 없다 (목록 응답의 isFavorite은 읽기 전용).
             엔드포인트가 생기기 전까지는 상태 표시만 한다.
        */}
        <Ionicons
          name={isFavorite ? 'heart' : 'heart-outline'}
          size={SHEET.favoriteSize}
          color={Brand.primary}
          accessibilityLabel={isFavorite ? '즐겨찾기한 낚시터' : '즐겨찾기하지 않은 낚시터'}
        />

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
          style={({ pressed }) => (pressed ? styles.pressed : undefined)}>
          <Ionicons name="close" size={SHEET.closeSize} color={Brand.textDisabled} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {spot.prohibited ? <Text style={styles.warning}>낚시 금지 구역이에요</Text> : null}

        {expanded ? (
          <Section title="오늘의 낚시 정보">
            <View style={styles.dateRow}>
              <Text style={styles.dateLabel}>{spot.forecastDateLabel ?? '예보 없음'}</Text>
              {spot.forecastDateLabel ? (
                <View style={styles.noonSegment}>
                  <SegmentControl options={NOON_OPTIONS} value={noon} onChange={setNoon} />
                </View>
              ) : null}
            </View>
            {spot.seaSummary ? <Text style={styles.summaryText}>{spot.seaSummary}</Text> : null}
          </Section>
        ) : null}

        <Section title="주요 어종">
          <FishTiles names={spot.majorFishes} />
        </Section>

        {marine ? (
          <Section title={expanded ? '해양 환경' : '해양 정보'}>
            {expanded ? (
              <ValueRows rows={spot.forecastRows ?? []} />
            ) : (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryText}>{spot.seaSummary ?? '정보가 없어요'}</Text>
              </View>
            )}
          </Section>
        ) : null}

        {expanded && marine ? (
          <Section title="물때 정보">
            <View style={styles.summaryCard}>
              <Text style={styles.summaryText}>{spot.seaSummary ?? '정보가 없어요'}</Text>
            </View>
          </Section>
        ) : null}

        {spot.inlandRows ? (
          <Section title="하천 정보">
            <ValueRows rows={spot.inlandRows} />
          </Section>
        ) : null}
      </ScrollView>
    </>
  );
}

/** 시안은 4칸 고정이다 (634:1563~1566). 어종이 적으면 빈 칸으로 자리를 지킨다 */
function FishTiles({ names }: { names: readonly string[] }) {
  const tiles = Array.from({ length: 4 }, (_, index) => names[index] ?? null);

  return (
    <View style={styles.fishRow}>
      {tiles.map((name, index) => (
        // 칸 수가 4로 고정이고 순서도 서버 순서를 그대로 따르므로 index 가 안정적인 key 다
        <View key={index} style={styles.fishTile}>
          {/* ⚠️ 시안은 어종 사진 칸이지만 서버는 이름만 준다 (majorFishes: string[]) */}
          {name ? (
            <Text style={styles.fishName} numberOfLines={2}>
              {name}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ValueRows({ rows }: { rows: readonly SpotLabelValue[] }) {
  return (
    <View style={styles.rows}>
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text style={styles.rowLabel}>{row.label}</Text>
          <Text style={styles.rowValue}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: Brand.scrim },
  sheet: {
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
  body: {
    paddingHorizontal: SHEET.paddingX,
    paddingTop: SHEET.headerGap,
    paddingBottom: SHEET.paddingBottom,
    gap: SHEET.sectionGap,
  },
  warning: { ...Typography.itemMeta, color: Brand.textError },
  section: { gap: SHEET.titleGap },
  sectionTitle: {
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 28,
    letterSpacing: -0.32,
    color: Brand.textStrong,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dateLabel: { ...Typography.cardTitle, color: Brand.primaryDark },
  noonSegment: { width: 150 },
  fishRow: { flexDirection: 'row', gap: SHEET.fishTileGap },
  fishTile: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: SHEET.fishTile,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    borderRadius: SHEET.fishTileRadius,
    backgroundColor: SHEET.fishTileBg,
  },
  fishName: { ...Typography.chipLabel, color: Brand.textMuted, textAlign: 'center' },
  summaryCard: {
    minHeight: SHEET.summaryHeight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: SHEET.summaryRadius,
    backgroundColor: SHEET.summaryBg,
  },
  summaryText: { ...Typography.body, color: Brand.textStrong, textAlign: 'center' },
  rows: { gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { ...Typography.itemMeta, color: Brand.textMuted },
  rowValue: { ...Typography.itemTitle, color: Brand.textStrong },
  pressed: { opacity: 0.72 },
});
