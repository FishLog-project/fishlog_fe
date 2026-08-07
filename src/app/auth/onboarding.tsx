import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Brand, Palette } from '@/constants/theme';

/** 온보딩 스플래시 — 브랜드 로고 노출 후 로그인 화면으로 이동. */
export default function OnboardingScreen() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.replace('/auth/login'), 1500);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Fishlog</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.font.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { fontSize: 40, fontWeight: '500', color: Brand.primary },
});
