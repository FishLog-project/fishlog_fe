import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Brand, Components, Typography } from '@/constants/theme';
import type { DexSpeciesViewModel } from '@/features/dex/use-dex-view-model';

const DEX = Components.dex;

/** 서버 이미지(imageUrl)가 아직 없을 때 쓰는 기본 그림 — Figma 목록 카드의 예시 이미지(978:3064) */
const FALLBACK_ART = require('@/assets/images/dex/species-card.png');

/**
 * 도감 격자 한 칸 (Figma Collection/MiniCard 978:3090 · 미획득 978:3089).
 *
 * 획득 카드는 물색 그라데이션 칸에 어종 그림 + 이름,
 * 미획득 카드는 같은 틀에 같은 그림을 검은 실루엣으로 옅게 깔고 이름을 "???"로 가린다.
 */
export function SpeciesCard({
  species,
  onPress,
}: {
  species: DexSpeciesViewModel;
  /** 획득한 어종만 상세가 열린다. 잠금 카드는 눌러도 아무 일이 없다 */
  onPress: (species: DexSpeciesViewModel) => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      // 잠금 카드는 버튼이 아니다 — 스크린리더에도 누를 수 있는 것처럼 읽히면 안 된다
      accessibilityRole={species.caught ? 'button' : undefined}
      accessible
      accessibilityLabel={species.accessibilityLabel}
      disabled={!species.caught}
      onPress={() => onPress(species)}>
      <LinearGradient
        colors={[...DEX.tileFill]}
        // Figma는 -59.18deg (왼쪽 위로 향하는 방향). 아래 오른쪽에서 시작해 위 왼쪽으로 간다.
        start={{ x: 0.93, y: 0.76 }}
        end={{ x: 0.07, y: 0.24 }}
        locations={[0.129, 0.978]}
        style={styles.tile}>
        <Image
          source={species.imageUrl ?? FALLBACK_ART}
          style={[styles.art, !species.caught && styles.artLocked]}
          contentFit="contain"
          // 실루엣은 서버가 아니라 화면 효과다 — 같은 그림을 단색으로 칠한다
          tintColor={species.caught ? undefined : DEX.silhouette}
        />
      </LinearGradient>
      <Text numberOfLines={1} style={styles.name}>
        {species.label}
      </Text>
    </Pressable>
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
    // Figma의 바깥 그림자. RN 0.76+ 새 아키텍처에서 지원한다.
    boxShadow: `0px 0px 4.9px -1px ${DEX.cardShadow}`,
  },
  pressed: { opacity: 0.85 },

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
  art: { width: DEX.artSize, height: DEX.artSize },
  artLocked: { opacity: DEX.silhouetteOpacity },

  name: {
    ...Typography.cardTitle,
    marginTop: 6,
    color: Brand.textAccent,
  },
});
