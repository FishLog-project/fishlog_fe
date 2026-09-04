import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/common';
import { Brand, Components, Typography } from '@/constants/theme';

import { RankBadge } from './rank-badge';

const RANK = Components.ranking;

type Props = {
  rank: number | null;
  nickname: string;
  /** 오른쪽에 붙는 수치 ("98%" · "88cm") */
  value: string;
  profileImageUrl?: string | null;
};

/**
 * Ranking/ListItem — 순위 한 줄 (Figma 323:970).
 * [순위 뱃지] [프로필 사진 + 닉네임] ...................... [수치]
 */
export function RankRow({ rank, nickname, value, profileImageUrl }: Props) {
  return (
    <View style={styles.row}>
      <RankBadge rank={rank} />
      <View style={styles.content}>
        <View style={styles.user}>
          <Avatar uri={profileImageUrl} size={RANK.row.avatarSize} />
          <Text style={styles.nickname} numberOfLines={1}>
            {nickname}
          </Text>
        </View>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: RANK.badgeGap },
  /** 뱃지를 뺀 나머지를 다 쓰고, 그 안에서 닉네임과 수치를 양끝으로 민다 */
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: RANK.row.nameGap,
  },
  /** 닉네임이 길어도 수치를 밀어내지 않도록 이쪽만 줄어든다 */
  user: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: RANK.row.nameGap },
  nickname: { ...Typography.itemTitle, color: Brand.textStrong, flexShrink: 1 },
  value: { ...Typography.cardTitle, color: Brand.textAccent },
});
