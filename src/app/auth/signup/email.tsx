import { useRouter } from 'expo-router';

import { StepScreen, UnderlineInput, useSignup } from '@/features/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 회원가입 1단계 — 사용할 이메일 입력. */
export default function SignupEmailScreen() {
  const router = useRouter();
  const { email, setEmail } = useSignup();

  const valid = EMAIL_RE.test(email.trim());

  return (
    <StepScreen
      heading="사용할 이메일을 입력해 주세요"
      nextDisabled={!valid}
      onNext={() => router.push('/auth/signup/verify')}>
      <UnderlineInput
        value={email}
        onChangeText={setEmail}
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
