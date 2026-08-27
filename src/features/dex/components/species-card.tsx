import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { Brand, Components, Typography } from '@/constants/theme';
import type { DexSpeciesViewModel } from '@/features/dex/use-dex-view-model';

const DEX = Components.dex;

/**
 * ⚠️ 임시 — 어종별 일러스트 에셋이 아직 없다. Figma도 자리를 타원 하나로만
 * 잡아 둬서(103:211) 그 에셋을 그대로 쓴다. 진짜 그림이 들어오면 어종별로 교체한다.
 */
const ART = require('@/assets/images/dex/species-placeholder.svg');

/**
 * 도감 격자 한 칸 (Figma 103:201 + 103:208 + 103:205).
 *
 * 획득 카드는 물색 그라데이션 칸에 어종 그림 + 이름,
 * 미획득 카드는 같은 틀에 회색 실루엣 + "???"다.
 * (잠금 상태는 Figma에 없어 기존 회색 토큰으로만 구성했다)
 */
export function SpeciesCard({ species }: { species: DexSpeciesViewModel }) {
  return (
    <View
      style={[styles.card, species.collected && styles.cardCollected]}
      accessible
      accessibilityLabel={species.accessibilityLabel}>
      {species.collected ? (
        <LinearGradient
          colors={[...DEX.tileFill]}
          // Figma는 -59.18deg (왼쪽 위로 향하는 방향). 아래 오른쪽에서 시작해 위 왼쪽으로 간다.
          start={{ x: 0.93, y: 0.76 }}
          end={{ x: 0.07, y: 0.24 }}
          locations={[0.129, 0.978]}
          style={styles.tile}>
          <Image source={ART} style={styles.art} contentFit="contain" />
        </LinearGradient>
      ) : (
        <View style={[styles.tile, styles.tileLocked]}>
          <Image
            source={ART}
            style={styles.art}
            contentFit="contain"
            tintColor={Brand.inactive}
          />
        </View>
      )}
      <Text
        numberOfLines={1}
        style={[styles.name, !species.collected && styles.nameLocked]}>
        {species.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    // 폭은 3열 격자가 남는 자리를 나눠 정한다 (Figma 108 @390pt)
    flex: 1,
    height: DEX.cardHeight,
    borderRadius: DEX.cardRadius,
    backgroundColor: DEX.cardBg,
    alignItems: 'center',
    // Figma 108 카드에서 그림 칸이 좌우로 10씩 물러난 만큼
    paddingHorizontal: DEX.tileInset,
  },
  /** 미획득 카드는 그림자를 빼서 물 밑에 가라앉은 느낌으로 둔다 */
  cardCollected: {
    // Figma의 바깥 그림자. RN 0.76+ 새 아키텍처에서 지원한다.
    boxShadow: `0px 0px 4.9px -1px ${DEX.cardShadow}`,
  },

  tile: {
    width: '100%',
    // 카드 폭이 기기마다 달라도 그림 칸은 정사각을 유지한다 (Figma 88x88)
    aspectRatio: 1,
    marginTop: 12,
    borderRadius: DEX.tileRadius,
    borderWidth: 1,
    borderColor: DEX.tileBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLocked: {
    backgroundColor: DEX.lockedTile,
    borderColor: Brand.inactive,
  },
  art: { width: DEX.artWidth, height: DEX.artHeight },

  name: {
    ...Typography.cardTitle,
    marginTop: 6,
    color: Brand.textMuted,
  },
  nameLocked: { color: Brand.textDisabled },
});
