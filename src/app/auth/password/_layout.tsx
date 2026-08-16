import { Stack } from 'expo-router';

import { PasswordResetProvider } from '@/features/auth';

/**
 * 비밀번호 찾기 레이아웃.
 * 모든 스텝(email → verify → reset → complete)이 PasswordResetProvider 하위에서
 * 대상 이메일을 공유한다.
 */
export default function PasswordResetLayout() {
  return (
    <PasswordResetProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </PasswordResetProvider>
  );
}
