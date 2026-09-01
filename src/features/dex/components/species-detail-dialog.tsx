import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, Components, Typography } from '@/constants/theme';
import type { DexSpeciesDetailViewModel } from '@/features/dex/use-dex-view-model';

const DEX = Components.dex;
const D = DEX.detail;

/** ⚠️ 임시 — 목록 카드와 같은 자리표시 에셋. 어종별 그림이 오면 교체한다 */
const ART = require('@/assets/images/dex/species-placeholder.svg');

/**
 * 그림 칸에 떠 있는 물방울 (Figma 130:201·205·207·208·209).
 * 칸 크기에 비례해 놓이도록 비율로 잡는다.
 *
 * ponytail: Figma에서 채도·투명도를 개별로 뽑지 않고 흰색 반투명으로 통일했다.
 *           디자인이 확정되면 노드별 fill을 그대로 옮긴다.
 */
const BUBBLES = [
  { left: '7%', top: '25%', size: 20, opacity: 0.55 },
  { left: '17%', top: '44%', size: 9, opacity: 0.7 },
  { left: '25%', top: '82%', size: 11, opacity: 0.5 },
  { left: '82%', top: '12%', size: 10, opacity: 0.6 },
  { left: '85%', top: '57%', size: 19, opacity: 0.45 },
  { left: '92%', top: '79%', size: 8, opacity: 0.7 },
] as const;

/**
 * 어종 상세 카드 (Figma 106:454 외).
 *
 * 목록에서 획득한 어종을 누르면 뜨는 모달이다. 잠금 카드는 애초에 눌리지 않으므로
 * 여기서 미획득 상태를 다루지 않는다.
 * 닫기 버튼이 디자인에 없어서 배경(막)을 누르거나 안드로이드 뒤로가기로 닫는다.
 */
export function SpeciesDetailDialog({
  species,
  onClose,
}: {
  species: DexSpeciesDetailViewModel | null;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={species !== null}
      transparent
      animationType="fade"
      // 안드로이드 하드웨어 뒤로가기
      onRequestClose={onClose}>
      <Pressable
        style={styles.scrim}
        accessibilityRole="button"
        accessibilityLabel="닫기"
        onPress={onClose}>
        {species ? (
          // 카드 안쪽 터치가 막까지 올라가 모달을 닫지 않도록 막는다
          <Pressable style={styles.card} onPress={() => {}}>
            <Text style={styles.title} accessibilityRole="header">
              {species.name}
            </Text>

            <LinearGradient
              colors={[...DEX.tileFill]}
              // Figma는 -44.04deg. 아래 오른쪽에서 위 왼쪽으로 흐른다.
              start={{ x: 0.85, y: 0.85 }}
              end={{ x: 0.15, y: 0.15 }}
              locations={[0.129, 0.978]}
              style={styles.tile}>
              {BUBBLES.map((b, i) => (
                <View
                  key={i}
                  style={[
                    styles.bubble,
                    {
                      left: b.left,
                      top: b.top,
                      width: b.size,
                      height: b.size,
                      borderRadius: b.size / 2,
                      opacity: b.opacity,
                    },
                  ]}
                />
              ))}
              <Image source={ART} style={styles.art} contentFit="contain" />
            </LinearGradient>

            <Text style={styles.description}>{species.description}</Text>

            <View style={styles.chipRow}>
              <View style={[styles.chip, styles.habitatChip]}>
                <Text style={styles.chipText}>{species.habitatLabel}</Text>
              </View>
              <View style={[styles.chip, styles.catchChip]}>
                <Text style={styles.chipText}>{species.catchLabel}</Text>
              </View>
            </View>

            {/* 인증샷 4칸 — 사진 데이터가 아직 없어 빈 칸으로 둔다 */}
            <View
              style={styles.photoRow}
              accessible
              accessibilityLabel="인증샷 준비 중">
              {Array.from({ length: D.photoCount }, (_, i) => (
                <View key={i} style={styles.photo} />
              ))}
            </View>
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: D.scrim,
  },
  card: {
    width: '100%',
    maxWidth: D.maxWidth,
    padding: D.padding,
    borderRadius: D.radius,
    backgroundColor: DEX.cardBg,
    // Figma의 2겹 파란 발광. RN 0.76+ 새 아키텍처에서 지원한다.
    boxShadow: `0px 0px 11.6px -2.2px ${D.glow}, 0px 0px 19.1px 4.4px ${D.glowOuter}`,
  },
  title: { ...Typography.detailTitle, color: Brand.textMuted, textAlign: 'center' },

  tile: {
    width: '100%',
    aspectRatio: D.tileRatio,
    borderRadius: D.tileRadius,
    borderWidth: D.tileBorderWidth,
    borderColor: D.tileBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bubble: { position: 'absolute', backgroundColor: Brand.onPrimary },
  /** 그림 칸 높이의 절반 남짓 (Figma 120칸에 67 그림) */
  art: { width: '35%', height: '56%' },

  description: {
    ...Typography.detailBody,
    marginTop: 15,
    color: Brand.textMuted,
  },

  /** Figma는 칩 두 개가 좌우 끝에 붙고 가운데가 비어 있다 (16→99, 141→224) */
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 16,
  },
  chip: {
    height: D.chipHeight,
    borderRadius: D.chipRadius,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  habitatChip: { backgroundColor: D.habitatChip },
  catchChip: { backgroundColor: D.catchChip },
  chipText: { ...Typography.chipLabel, color: D.chipText },

  photoRow: { flexDirection: 'row', gap: D.photoGap, marginTop: 12 },
  photo: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: D.photoRadius,
    backgroundColor: D.photoBg,
  },
});
