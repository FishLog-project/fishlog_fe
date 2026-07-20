import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TabScreen } from '@/components/tab-screen';
import { Colors } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <TabScreen
      title="메인"
      description="홈 데이터가 연결되기 전에도 전체 화면 흐름을 확인할 수 있어요.">
      <View style={styles.statusCard} accessible accessibilityLabel="앱 셸 준비 완료">
        <Text style={styles.statusLabel}>APP SHELL</Text>
        <Text style={styles.statusTitle}>FishLog 화면 뼈대가 준비됐어요</Text>
        <Text style={styles.statusDescription}>
          메인·지도·도감·마이 탭과 상세 화면 경로를 먼저 연결했습니다.
        </Text>
      </View>

      <View style={styles.links}>
        <Link href="/catch/verify" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="낚시 인증 화면 열기"
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
            <View>
              <Text style={styles.linkTitle}>낚시 인증</Text>
              <Text style={styles.linkDescription}>스택 화면 연결 확인</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </Link>

        <Link href="/states" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="공통 상태 화면 열기"
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
            <View>
              <Text style={styles.linkTitle}>공통 상태</Text>
              <Text style={styles.linkDescription}>로딩·빈 화면·오류·재시도 확인</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </Link>
      </View>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  statusCard: {
    gap: 8,
    padding: 20,
    borderRadius: 20,
    backgroundColor: Colors.primarySoft,
  },
  statusLabel: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statusTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 28,
  },
  statusDescription: {
    color: Colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  links: {
    gap: 12,
  },
  link: {
    minHeight: 72,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pressed: {
    opacity: 0.65,
  },
  linkTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  linkDescription: {
    marginTop: 4,
    color: Colors.textMuted,
    fontSize: 13,
  },
  chevron: {
    color: Colors.primary,
    fontSize: 28,
    lineHeight: 30,
  },
});
