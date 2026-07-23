import { Redirect } from 'expo-router';

import { useAuth } from '@/features/auth';

/**
 * 앱 진입점("/") — 로그인 여부에 따라 분기.
 * 로그인 O → 홈(tabs), 로그인 X → 온보딩.
 */
export default function Index() {
  const { token, isReady } = useAuth();
  if (!isReady) return null;
  return <Redirect href={token ? '/tabs' : '/auth/onboarding'} />;
}
