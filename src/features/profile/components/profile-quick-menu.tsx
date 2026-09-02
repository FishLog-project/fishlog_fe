import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, Components, Typography } from '@/constants/theme';

const CARD = Components.profile.quickCard;

type Props = {
  onOpenLog: () => void;
  onOpenRanking: () => void;
};

export function ProfileQuickMenu({ onOpenLog, onOpenRanking }: Props) {
  return (
    <View style={styles.row}>
      <QuickCard
        icon={require('@/assets/images/profile/book-card.svg')}
        label="내 도감"
        onPress={onOpenLog}
      />
      <QuickCard
        icon={require('@/assets/images/profile/rank-card.svg')}
        label="내 랭킹"
        onPress={onOpenRanking}
      />
      <QuickCard icon={require('@/assets/images/profile/saved-card.svg')} label="저장 목록" />
    </View>
  );
}

function QuickCard({ icon, label, onPress }: { icon: number; label: string; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <LinearGradient
        colors={[...Brand.cardSurface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Image source={icon} style={styles.icon} contentFit="contain" />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  card: {
    width: CARD.size,
    height: CARD.size,
    borderRadius: CARD.radius,
    overflow: 'hidden',
    alignItems: 'center',
    paddingTop: CARD.paddingTop,
    gap: CARD.gap,
    boxShadow: `inset 0px 0px 7.271px ${CARD.innerGlow}`,
  },
  pressed: { opacity: 0.8 },
  icon: { width: CARD.iconSize, height: CARD.iconSize },
  label: { ...Typography.quickLabel, color: CARD.label },
});
