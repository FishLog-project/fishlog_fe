import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Brand, Components, Typography } from '@/constants/theme';

const RANK = Components.ranking;
const MEDAL = RANK.medal;
/** 스프라이트 한 장의 렌더 크기 — 메달 한 칸 × 들어 있는 개수 */
const SPRITE = MEDAL.size * MEDAL.frames;

/**
 * 1~3위 메달 이미지.
 *
 * Figma가 메달을 한 장에 두 개씩 붙여 내보내서(금 2개 / 은·동), 슬롯 안에서
 * 필요한 칸만 잘라 쓴다. frame은 그 스프라이트에서 몇 번째 칸인지다.
 */
const MEDALS = {
  1: { source: require('@/assets/images/ranking/medal-gold-sprite.png'), frame: 0 },
  2: { source: require('@/assets/images/ranking/medal-silver-bronze-sprite.png'), frame: 0 },
  3: { source: require('@/assets/images/ranking/medal-silver-bronze-sprite.png'), frame: 1 },
} as const;

function medalOf(rank: number | null) {
  if (rank === 1 || rank === 2 || rank === 3) return MEDALS[rank];
  return null;
}

/**
 * 순위 표시 자리 (Figma 323:800 / 323:883).
 * 1~3위는 메달, 그 아래는 숫자. 어느 쪽이든 같은 크기 슬롯을 차지해서
 * 행마다 내용이 좌우로 밀리지 않는다.
 */
export function RankBadge({ rank }: { rank: number | null }) {
  const medal = medalOf(rank);

  return (
    <View style={styles.slot} accessibilityLabel={rank ? `${rank}위` : '순위 없음'}>
      {medal ? (
        <View style={styles.clip}>
          <Image
            source={medal.source}
            style={[styles.sprite, { left: -MEDAL.size * medal.frame }]}
            contentFit="cover"
          />
        </View>
      ) : (
        <Text style={styles.number}>{rank ?? '-'}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  /** 메달·숫자를 가운데 두면 Figma의 좌표 오프셋이 그대로 나온다 */
  slot: {
    width: RANK.badge.width,
    height: RANK.badge.height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clip: { width: MEDAL.size, height: MEDAL.clipHeight, overflow: 'hidden' },
  sprite: {
    position: 'absolute',
    width: SPRITE,
    height: SPRITE,
    top: SPRITE * MEDAL.offsetYRatio,
  },
  number: { ...Typography.rankNumber, color: Brand.textWeak },
});
