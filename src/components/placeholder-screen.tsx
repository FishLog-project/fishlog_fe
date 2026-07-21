import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/theme';

type Props = {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
};

/** 아직 구현 전인 탭 화면용 공통 플레이스홀더. */
export function PlaceholderScreen({ title, icon }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <Ionicons name={icon} size={56} color={Brand.inactive} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>준비 중이에요</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  title: { fontSize: 20, fontWeight: '700', color: Brand.primaryDark },
  sub: { fontSize: 14, color: Brand.textMuted },
});
