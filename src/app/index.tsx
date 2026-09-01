import { Redirect } from 'expo-router';

import { useAuth } from '@/features/auth';

/**
 * 앱 진입점("/").
 *
 * 저장된 세션(로그인 토큰 또는 게스트)이 있으면 홈으로, 없으면 로그인으로 보낸다.
 * 화면이 로그인에서 홈으로 튀지 않는다 — RootNavigator가 isReady 전까지 아무것도
 * 렌더하지 않으므로, 이 컴포넌트가 그려지는 시점엔 세션 로드가 이미 끝나 있다.
 */
export default function Index() {
  const { canEnterApp } = useAuth();
  return <Redirect href={canEnterApp ? '/home' : '/auth/login'} />;
}
