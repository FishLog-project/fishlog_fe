import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/features/auth';
import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync();

/**
 * 세션이 없는데 탭 안에 들어와 있으면 로그인으로 되돌린다.
 *
 * 반대 방향(세션이 있으면 홈으로)은 일부러 넣지 않는다.
 * 그 규칙이 있으면 저장된 토큰 때문에 진입 화면이 로그인에서 홈으로 튕긴다.
 * 홈 진입은 로그인/가입 완료에서 명시적으로 이동시킨다.
 */
function useProtectedRoute(token: string | null, isReady: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) return;
    const inTabsGroup = segments[0] === '(tabs)';

    if (!token && inTabsGroup) {
      router.replace('/auth/login');
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
