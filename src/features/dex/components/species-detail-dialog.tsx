import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenState } from '@/components/common';
import { Brand, Components, Fonts, Typography } from '@/constants/theme';
import type { DexDataSource, RecentCatch } from '@/features/dex/dex-data';
import {
  useDexDetailViewModel,
  type DexSpeciesDetailViewModel,
} from '@/features/dex/use-dex-view-model';

const DEX = Components.dex;
const D = DEX.detail;

/** Figma 상세 카드의 그림 칸(665:3461) — 테두리·그라데이션·물방울이 한 장에 들어 있다 */
const TILE = require('@/assets/images/dex/species-detail-tile.svg');
/** 서버 이미지(imageUrl)가 아직 없을 때 쓰는 기본 그림 — 목록 카드와 같은 그림이다 */
const FALLBACK_ART = require('@/assets/images/dex/species-card.png');
const PHOTO_CLOSE = require('@/assets/images/dex/photo-close.svg');
const PHOTO_PIN = require('@/assets/images/dex/photo-pin.svg');

/** 인증샷 뷰어 (Figma Collection/Card/Photo 1019:2928) */
const VIEWER = {
  width: 291,
  height: 290,
  radius: 16,
  border: 2,
  closeSize: 24,
  closeTop: 10,
  closeRight: 14,
  footerInset: 18,
  footerBottom: 26,
  pinWidth: 20,
  pinHeight: 32,
  gap: 8,
} as const;

/**
 * 어종 상세 모달 (Figma 카드 선택 시 978:3165).
 *
 * 획득한 어종만 열린다. 닫기 버튼이 디자인에 없어 배경(막)이나 안드로이드 뒤로가기로 닫는다.
 * 상세는 열릴 때마다 새로 받는다 — fishId를 key로 써서 어종이 바뀌면 로더가 새로 올라간다.
 */
export function SpeciesDetailDialog({
  dataSource,
  fishId,
  onClose,
}: {
  dataSource: DexDataSource;
  fishId: number | null;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={fishId !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="닫기"
          onPress={onClose}
        />
        {fishId !== null ? (
          <SpeciesDetailLoader key={fishId} dataSource={dataSource} fishId={fishId} />
        ) : null}
      </View>
    </Modal>
  );
}

function SpeciesDetailLoader({
  dataSource,
  fishId,
}: {
  dataSource: DexDataSource;
  fishId: number;
}) {
  const [state, retry] = useDexDetailViewModel(dataSource, fishId);

  return (
    <View accessibilityViewIsModal>
      {state.status === 'ready' ? (
        <SpeciesDetailCard species={state.data} />
      ) : (
        <View style={styles.stateWrap}>
          <ScreenState
            variant={state.status}
            onRetry={state.status === 'error' ? retry : undefined}
          />
        </View>
      )}
    </View>
  );
}

/**
 * 어종 상세 카드 본문 (Figma Collection/Card 665:3472).
 * 모달과 분리해 두어 다른 화면(낚시 인증 완료)에서도 같은 카드를 그릴 수 있다.
 */
export function SpeciesDetailCard({ species }: { species: DexSpeciesDetailViewModel }) {
  const [viewing, setViewing] = useState<RecentCatch | null>(null);

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <Text numberOfLines={1} style={styles.title} accessibilityRole="header">
          {species.name}
        </Text>
        {species.maxSizeLabel ? <Text style={styles.meta}>{species.maxSizeLabel}</Text> : null}
      </View>

      <View style={styles.tile}>
        <Image source={TILE} style={StyleSheet.absoluteFill} contentFit="fill" />
        {/* Figma는 120 높이 칸 위에 140 그림을 가운데 얹는다 (899:2555) */}
        <Image
          source={species.imageUrl ?? FALLBACK_ART}
          style={styles.art}
          contentFit="contain"
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>{species.description}</Text>

        <View style={[styles.chipRow, !species.habitatLabel && styles.chipRowSingle]}>
          {species.habitatLabel ? (
            <View style={[styles.chip, styles.habitatChip]}>
              <Text style={styles.chipText}>{species.habitatLabel}</Text>
            </View>
          ) : null}
          <View style={[styles.chip, styles.catchChip]}>
            <Text style={styles.chipText}>{species.catchLabel}</Text>
          </View>
        </View>

        <View
          style={styles.photoRow}
          accessible={species.photos.length === 0}
          accessibilityLabel={species.photos.length === 0 ? '인증 사진 없음' : undefined}>
          {Array.from({ length: D.photoCount }, (_, i) => {
            const photo = species.photos[i];
            return photo ? (
              <Pressable
                key={photo.catchRecordId}
                accessibilityRole="imagebutton"
                accessibilityLabel={`인증 사진 ${i + 1} 크게 보기`}
                onPress={() => setViewing(photo)}>
                <Image source={photo.imageUrl} style={styles.photo} contentFit="cover" />
              </Pressable>
            ) : (
              <View key={i} style={styles.photo} />
            );
          })}
        </View>
      </View>

      <PhotoViewer photo={viewing} onClose={() => setViewing(null)} />
    </View>
  );
}

function PhotoViewer({ photo, onClose }: { photo: RecentCatch | null; onClose: () => void }) {
  return (
    <Modal visible={photo !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="닫기"
          onPress={onClose}
        />
        {photo ? (
          <View style={styles.viewer} accessibilityViewIsModal>
            <Image source={photo.imageUrl} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.32)', 'rgba(0,0,0,0.7)']}
              locations={[0.517, 0.787, 1]}
              style={StyleSheet.absoluteFill}
            />
            <Pressable
              style={styles.viewerClose}
              accessibilityRole="button"
              accessibilityLabel="닫기"
              hitSlop={12}
              onPress={onClose}>
              <Image source={PHOTO_CLOSE} style={styles.viewerCloseIcon} contentFit="contain" />
            </Pressable>
            <View style={styles.viewerFooter}>
              <View style={styles.viewerPlace}>
                {photo.location ? (
                  <>
                    <Image source={PHOTO_PIN} style={styles.viewerPin} contentFit="contain" />
                    <Text numberOfLines={1} style={[styles.viewerText, styles.viewerLocation]}>
                      {photo.location}
                    </Text>
                  </>
                ) : null}
              </View>
              <Text style={[styles.viewerText, styles.viewerSize]}>{photo.size}cm</Text>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: D.scrim,
  },
  stateWrap: { width: D.width },

  card: {
    width: D.width,
    paddingHorizontal: D.paddingX,
    paddingVertical: D.paddingY,
    gap: D.gap,
    alignItems: 'center',
    borderRadius: D.radius,
    backgroundColor: DEX.cardBg,
    // Figma의 2겹 파란 발광. RN 0.76+ 새 아키텍처에서 지원한다.
    boxShadow: `0px 0px 11.556px ${D.glow}, 0px 0px 19.111px ${D.glowOuter}`,
  },
  heading: { maxWidth: '100%', gap: 4, alignItems: 'center' },
  title: { ...Typography.detailTitle, color: Brand.textAccent, textAlign: 'center' },
  meta: { ...Typography.detailBody, color: Brand.textMuted, textAlign: 'center' },

  tile: {
    width: D.tileWidth,
    height: D.tileHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  art: { width: D.artSize, height: D.artSize },

  content: { width: D.contentWidth, gap: D.gap },
  description: { ...Typography.detailBody, color: Brand.textMuted },

  chipRow: { flexDirection: 'row', justifyContent: 'space-between' },
  chip: {
    height: D.chipHeight,
    paddingHorizontal: D.chipPaddingX,
    borderRadius: D.chipRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitatChip: { backgroundColor: D.habitatChip },
  catchChip: { backgroundColor: D.catchChip },
  chipText: { ...Typography.chipLabel, color: D.chipText },

  chipRowSingle: { justifyContent: 'flex-start' },
  photoRow: { flexDirection: 'row', gap: D.photoGap },

  viewer: {
    width: VIEWER.width,
    height: VIEWER.height,
    borderRadius: VIEWER.radius,
    borderWidth: VIEWER.border,
    borderColor: Brand.onPrimary,
    overflow: 'hidden',
    backgroundColor: D.photoBg,
    boxShadow: '0px 0px 8.2px rgba(0, 0, 0, 0.42)',
  },
  viewerClose: {
    position: 'absolute',
    top: VIEWER.closeTop,
    right: VIEWER.closeRight,
    width: VIEWER.closeSize,
    height: VIEWER.closeSize,
  },
  viewerCloseIcon: { width: VIEWER.closeSize, height: VIEWER.closeSize },
  viewerFooter: {
    position: 'absolute',
    left: VIEWER.footerInset,
    right: VIEWER.footerInset,
    bottom: VIEWER.footerBottom,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: VIEWER.gap,
  },
  viewerPlace: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: VIEWER.gap },
  viewerPin: { width: VIEWER.pinWidth, height: VIEWER.pinHeight },
  viewerText: {
    fontSize: 16,
    lineHeight: 28,
    letterSpacing: -0.32,
    color: Brand.onPrimary,
    textShadowColor: 'rgba(0, 0, 0, 0.44)',
    textShadowRadius: 13.9,
  },
  viewerLocation: { flex: 1, fontFamily: Fonts.bold },
  viewerSize: { fontFamily: Fonts.semiBold, textAlign: 'right' },
  photo: {
    width: D.photoSize,
    height: D.photoSize,
    borderRadius: D.photoRadius,
    backgroundColor: D.photoBg,
  },
});
