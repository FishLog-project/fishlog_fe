import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenState } from '@/components/screen-state';
import { Colors, Layout } from '@/constants/theme';

export default function StatesScreen() {
  const [retryCount, setRetryCount] = useState(0);

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>공통 UI 상태</Text>
        <Text style={styles.description}>
          데이터 화면에서 공통으로 사용할 로딩·빈 화면·오류 상태를 한곳에서 확인합니다.
        </Text>

        <ScreenState variant="loading" />
        <ScreenState variant="empty" />
        <ScreenState variant="error" onRetry={() => setRetryCount((count) => count + 1)} />
        {retryCount > 0 && (
          <Text accessibilityLiveRegion="polite" style={styles.retryResult}>
            다시 시도 요청 {retryCount}회
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    width: '100%',
    maxWidth: Layout.maxContentWidth,
    alignSelf: 'center',
    gap: 16,
    padding: Layout.screenPadding,
    paddingBottom: 40,
  },
  title: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  description: {
    marginBottom: 4,
    color: Colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  retryResult: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});
