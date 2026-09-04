import { useRouter } from 'expo-router';
import { useState } from 'react';

import { FormField } from '@/components/common';
import { checkPassword, PasswordFields, StepScreen, useSignup } from '@/features/auth';

/**
 * 회원가입 3단계 — 사용할 비밀번호 입력 (Figma 130:409).
 * 재입력란까지 한 화면에 두고 두 값이 같을 때만 다음으로 넘긴다.
 */
export default function SignupPasswordScreen() {
  const router = useRouter();
  const { password, setPassword } = useSignup();
  // 확인란은 다음 단계로 들고 갈 값이 아니라 이 화면에서만 쓴다.
  const [confirm, setConfirm] = useState('');

  const { valid, message } = checkPassword(password, confirm);
  const goNext = () => router.push('/auth/signup/nickname');

  return (
    <StepScreen
      heading="사용할 비밀번호를 입력해 주세요"
      nextDisabled={!valid}
      compactWhenKeyboard
      onNext={goNext}>
      <FormField error={message}>
        <PasswordFields
          password={password}
          onPasswordChange={setPassword}
          confirm={confirm}
          onConfirmChange={setConfirm}
          onSubmit={goNext}
          autoFocus
        />
      </FormField>
    </StepScreen>
  );
}
