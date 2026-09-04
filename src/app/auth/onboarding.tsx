import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Brand, Typography } from '@/constants/theme';

/** 온보딩 스플래시 — 브랜드 로고 노출 후 로그인 화면으로 이동 (Figma 634:2529). */
export default function OnboardingScreen() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.replace('/auth/login'), 1500);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo} accessibilityRole="header">
        Fishlog
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  /*
   * 디자인의 로고는 화면 정중앙이 아니라 조금 위(844 중 y360)에 있다.
   * 아래 여백을 로고 높이만큼 더 줘서 가운데 정렬을 그만큼 끌어올린다.
   * (자식에 marginBottom을 주는 대신 부모가 여백을 잡는다)
   */
  container: {
    flex: 1,
    backgroundColor: Brand.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Typography.brandSplash.lineHeight,
  },
  logo: { ...Typography.brandSplash, color: Brand.primary },
});
