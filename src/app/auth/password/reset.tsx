import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { FormError } from '@/components/common';
import {
  authApi,
  checkPassword,
  PasswordFields,
  StepScreen,
  usePasswordReset,
} from '@/features/auth';

/**
 * 비밀번호 찾기 3단계 — 새 비밀번호 설정.
 *
 * 새 비밀번호는 컨텍스트에 담지 않고 이 화면 안에서만 들고 있다가 바로 전송한다.
 * (평문 비밀번호가 여러 화면에 걸쳐 메모리에 남지 않게 하려는 것)
 */
export default function PasswordResetScreen() {
  const router = useRouter();
  const { email, reset } = usePasswordReset();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) router.replace('/auth/password/email');
  }, [email, router]);

  const { valid, message } = checkPassword(password, confirm);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const res = await authApi.resetPassword(email, password);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    reset();
    router.replace('/auth/password/complete');
  };

  return (
    <StepScreen
      headerTitle="비밀번호 찾기"
      heading={'새로 사용할 비밀번호를\n입력해 주세요'}
      buttonLabel="변경하기"
      nextDisabled={!valid}
      loading={submitting}
      message={<FormError message={error ?? message} />}
      onNext={handleSubmit}>
      <PasswordFields
        password={password}
        onPasswordChange={setPassword}
        confirm={confirm}
        onConfirmChange={setConfirm}
        placeholder="새 비밀번호 (8자 이상)"
        onSubmit={handleSubmit}
        autoFocus
      />
    </StepScreen>
  );
}
