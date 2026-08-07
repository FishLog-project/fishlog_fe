import { Redirect } from 'expo-router';

/**
 * 앱 진입점("/").
 *
 * 지금은 항상 로그인 화면으로 보낸다.
 * 저장된 세션으로 홈에 바로 들어가게 하려면 이 한 줄만 아래처럼 바꾸면 된다.
 *
 *   const { token, isReady } = useAuth();
 *   if (!isReady) return null;
 *   return <Redirect href={token ? '/home' : '/auth/login'} />;
 */
export default function Index() {
  return <Redirect href="/auth/login" />;
}
