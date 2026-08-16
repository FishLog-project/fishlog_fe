import { Stack } from 'expo-router';

import { SignupProvider } from '@/features/auth';

/**
 * 회원가입 마법사 레이아웃.
 * 모든 스텝(email → verify → password → nickname → complete)이
 * SignupProvider 하위에서 입력값을 공유한다.
 */
export default function SignupLayout() {
  return (
    <SignupProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SignupProvider>
  );
}
