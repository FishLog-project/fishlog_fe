import { Stack } from 'expo-router';

/**
 * 인증 그룹 레이아웃 — 온보딩 / 로그인 / 회원가입 (헤더 없는 Stack).
 * 각 화면이 자체 SafeArea·헤더를 그리므로 네이티브 헤더는 숨긴다.
 */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
