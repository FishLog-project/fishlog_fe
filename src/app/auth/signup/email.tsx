import { useRouter } from 'expo-router';
import { useState } from 'react';

import { FormField } from '@/components/common';
import { authApi, StepScreen, UnderlineInput, useSignup } from '@/features/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 회원가입 1단계 — 사용할 이메일 입력 (Figma 634:2568).
 *
 * 인증번호 발송을 이 화면의 "다음"에서 한다. 다음 화면에 가서 발송하면
 * 이미 가입된 이메일(409)을 인증번호 화면에서야 알게 되고, 사용자는 뒤로
 * 돌아와 다시 고쳐야 한다. 여기서 보내면 화면을 넘기지 않고 그 자리에서 잡힌다.
 *
 * 형식 오류는 서버를 부르지 않고 입력창을 벗어나는 시점에 바로 알려준다.
 */
export default function SignupEmailScreen() {
  const router = useRouter();
  const { email, setEmail } = useSignup();
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // 이메일에 공백은 어떤 위치에도 유효하지 않으므로 저장 시점에 바로 털어낸다.
  // (검증만 trim하고 원본을 저장하면 다음 단계가 공백 붙은 값을 서버로 보낸다)
  const valid = EMAIL_RE.test(email);

  // 형식 문구는 한 번이라도 입력창을 벗어난 뒤부터 띄운다.
  // 고쳐서 유효해지면 즉시 사라진다.
  const formatError =
    touched && email.length > 0 && !valid ? '이메일 형식이 올바르지 않아요.' : null;

  const handleChange = (v: string) => {
    setEmail(v.trim());
    // 이메일을 고치기 시작하면 이전 서버 문구(중복 등)는 더 이상 맞지 않는다
    if (error) setError(null);
  };

  /** 인증번호를 발송하고, 성공했을 때만 다음 단계로 넘어간다. */
  const goNext = async () => {
    if (sending) return;
    if (!valid) {
      // 키보드의 "다음"으로 들어온 경우다. 포커스를 잃지 않아 형식 문구가 아직
      // 안 떴을 수 있으니, 왜 못 넘어가는지 여기서 드러내 준다.
      setTouched(true);
      return;
    }

    setSending(true);
    setError(null);

    const res = await authApi.sendEmailCode(email);
    setSending(false);

    if (res.ok) {
      router.push('/auth/signup/verify');
      return;
    }
    // 409 이미 가입된 이메일 / 429 너무 잦은 요청 / 네트워크 오류
    setError(res.message);
  };

  return (
    <StepScreen
      heading="사용할 이메일을 입력해 주세요"
      nextDisabled={!valid}
      loading={sending}
      onNext={goNext}>
      <FormField error={error ?? formatError}>
        <UnderlineInput
          value={email}
          onChangeText={handleChange}
          onBlur={() => setTouched(true)}
          placeholder="이메일 주소"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
          autoFocus
          returnKeyType="next"
          onSubmitEditing={goNext}
          accessibilityLabel="이메일 주소"
        />
      </FormField>
    </StepScreen>
  );
}
