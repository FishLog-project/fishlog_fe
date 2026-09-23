import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Brand, Components, Typography } from '@/constants/theme';
import type { DexSpeciesViewModel } from '@/features/dex/use-dex-view-model';
import { FishArtwork } from '@/features/dex/fish-art';

const DEX = Components.dex;

/**
 * 도감 격자 한 칸 (Figma Collection/MiniCard 978:3090 · 미획득 978:3089).
 *
 * 획득 카드는 물색 그라데이션 칸에 어종 그림 + 이름,
 * 미획득 카드는 서버가 내려준 그림자를 표시하되 어종명은 그대로 보여 준다.
 */
export function SpeciesCard({
  species,
  onPress,
}: {
  species: DexSpeciesViewModel;
  /** 카드를 누르면 획득 여부와 관계없이 어종 상세가 열린다. */
  onPress: (species: DexSpeciesViewModel) => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessible
      accessibilityLabel={species.accessibilityLabel}
      onPress={() => onPress(species)}>
      <LinearGradient
        colors={[...DEX.tileFill]}
        // Figma는 -59.18deg (왼쪽 위로 향하는 방향). 아래 오른쪽에서 시작해 위 왼쪽으로 간다.
        start={{ x: 0.93, y: 0.76 }}
        end={{ x: 0.07, y: 0.24 }}
        locations={[0.129, 0.978]}
        style={styles.tile}>
        <FishArtwork
          imageUrl={species.imageUrl}
          locked={!species.caught}
          style={styles.art}
          contentFit="contain"
        />
      </LinearGradient>
      <Text style={styles.name}>
        {species.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    // 화면 폭·글자 크기에 맞춘 격자가 남는 자리를 나눠 정한다.
    flex: 1,
    minHeight: DEX.cardHeight,
    borderRadius: DEX.cardRadius,
    backgroundColor: DEX.cardBg,
    alignItems: 'center',
    // Figma 108 카드에서 그림 칸이 좌우로 10씩 물러난 만큼
    paddingHorizontal: DEX.tileInset,
    paddingBottom: 8,
    // Figma의 바깥 그림자. RN 0.76+ 새 아키텍처에서 지원한다.
    boxShadow: `0px 0px 4.9px -1px ${DEX.cardShadow}`,
  },
  pressed: { opacity: 0.85 },

  tile: {
    width: '100%',
    maxWidth: DEX.tileSize,
    maxHeight: DEX.tileSize,
    // 카드 폭이 기기마다 달라도 그림 칸은 정사각을 유지한다 (Figma 88x88)
    aspectRatio: 1,
    marginTop: 12,
    borderRadius: DEX.tileRadius,
    borderWidth: 1,
    borderColor: DEX.tileBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  art: { width: DEX.artSize, height: DEX.artSize, maxWidth: '100%', maxHeight: '100%' },

  name: {
    ...Typography.cardTitle,
    marginTop: 6,
    textAlign: 'center',
    alignSelf: 'stretch',
    color: Brand.textAccent,
  },
});
