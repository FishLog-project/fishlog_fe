import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { FontAssets } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/features/auth';

SplashScreen.preventAutoHideAsync();

/**
 * 세션이 없는데 탭 안에 들어와 있으면 로그인으로 되돌린다.
 *
 * 반대 방향(세션이 있으면 홈으로)은 일부러 넣지 않는다.
 * 그 규칙이 있으면 저장된 토큰 때문에 진입 화면이 로그인에서 홈으로 튕긴다.
 * 홈 진입은 로그인/가입 완료에서 명시적으로 이동시킨다.
 */
function useProtectedRoute(canEnterApp: boolean, isReady: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) return;
    const inTabsGroup = segments[0] === '(tabs)';

    if (!canEnterApp && inTabsGroup) {
      router.replace('/auth/login');
    }
  }, [canEnterApp, isReady, segments, router]);
}

function RootNavigator() {
  // 게스트도 앱 본문은 볼 수 있어야 하므로 토큰 유무가 아니라 canEnterApp으로 막는다.
  const { canEnterApp, isReady } = useAuth();
  useProtectedRoute(canEnterApp, isReady);

  // 폰트 로드 실패는 앱을 막지 않는다. 시스템 폰트로 폴백되더라도 화면은 떠야 한다.
  const [fontsLoaded, fontError] = useFonts(FontAssets);

  // SecureStore·폰트 로드 전엔 네이티브 스플래시 유지
  if (!isReady || (!fontsLoaded && !fontError)) return null;

  return (
    <>
      {/* 배경이 라이트 고정이라 상태바 글자는 항상 검정 */}
      <StatusBar style="dark" />
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

// 색상 토큰이 라이트 단일 팔레트라 ThemeProvider를 두지 않는다.
// expo-router의 NavigationContainer가 이미 DefaultTheme(라이트)을 기본값으로 넣는다.
export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
