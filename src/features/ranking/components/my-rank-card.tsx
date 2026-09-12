import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/common';
import { Brand, Components, Typography } from '@/constants/theme';

const MY = Components.ranking.myCard;

type Props = {
  rank: number | null;
  nickname: string;
  /** 순위 아래 보조 문구 ("12/50종 (22%)" · "최대 크기 38cm") */
  meta: string;
  profileImageUrl?: string | null;
};

/**
 * "나의 순위" 카드 (Figma 634:2284).
 * 전체 목록에서 내 줄을 찾아 내려가지 않아도 되게 맨 위에 따로 세워 둔다.
 */
export function MyRankCard({ rank, nickname, meta, profileImageUrl }: Props) {
  return (
    <LinearGradient
      colors={[...Brand.cardSurface]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}>
      <Text style={styles.rank}>{rank ?? '-'}</Text>
      <View style={styles.user}>
        <Avatar uri={profileImageUrl} size={MY.avatarSize} />
        <View style={styles.text}>
          <Text style={styles.name} numberOfLines={1}>
            나 ({nickname})
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    height: MY.height,
    borderRadius: MY.radius,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: MY.paddingX,
    gap: MY.gap,
  },
  rank: { ...Typography.heroTitle, color: Brand.textAccent },
  user: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: MY.nameGap },
  /** 닉네임이 길어도 카드 밖으로 넘치지 않게 남은 폭만 쓴다 */
  text: { flex: 1 },
  name: { ...Typography.cardTitle, color: Brand.textAccent },
  meta: { ...Typography.cardMeta, color: Brand.textMuted },
});
