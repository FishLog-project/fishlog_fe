import { useRouter } from 'expo-router';

import { StepScreen, UnderlineInput, useSignup } from '@/features/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 회원가입 1단계 — 사용할 이메일 입력. */
export default function SignupEmailScreen() {
  const router = useRouter();
  const { email, setEmail } = useSignup();

  // 이메일에 공백은 어떤 위치에도 유효하지 않으므로 저장 시점에 바로 털어낸다.
  // (검증만 trim하고 원본을 저장하면 verify 단계가 공백 붙은 값을 서버로 보낸다)
  const valid = EMAIL_RE.test(email);

  return (
    <StepScreen
      heading="사용할 이메일을 입력해 주세요"
      nextDisabled={!valid}
      onNext={() => router.push('/auth/signup/verify')}>
      <UnderlineInput
        value={email}
        onChangeText={(v) => setEmail(v.trim())}
        placeholder="email@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="emailAddress"
        autoFocus
        returnKeyType="next"
        onSubmitEditing={() => valid && router.push('/auth/signup/verify')}
      />
    </StepScreen>
  );
}
