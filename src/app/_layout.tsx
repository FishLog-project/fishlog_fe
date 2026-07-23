import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/features/auth';

SplashScreen.preventAutoHideAsync();

/**
 * 로그인 상태에 따라 라우트를 보호한다.
 * - 비로그인 & tabs 안  → 온보딩으로
 * - 로그인   & auth 안  → 홈으로
 */
function useProtectedRoute(token: string | null, isReady: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) return;
    const inAuthGroup = segments[0] === 'auth';
    const inTabsGroup = segments[0] === 'tabs';

    if (!token && inTabsGroup) {
      router.replace('/auth/onboarding');
    } else if (token && inAuthGroup) {
      router.replace('/tabs');
    }
  }, [token, isReady, segments, router]);
}

function RootNavigator() {
  const { token, isReady } = useAuth();
  useProtectedRoute(token, isReady);

  if (!isReady) return null; // SecureStore 로드 전엔 네이티브 스플래시 유지

  return (
    <>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <RootNavigator />
      </ThemeProvider>
    </AuthProvider>
  );
}
