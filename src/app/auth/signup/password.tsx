import { useRouter } from 'expo-router';

import { StepScreen, UnderlineInput, useSignup } from '@/features/auth';

const MIN_LENGTH = 8;

/** 회원가입 3단계 — 사용할 비밀번호 입력 (최소 8자). */
export default function SignupPasswordScreen() {
  const router = useRouter();
  const { password, setPassword } = useSignup();

  const valid = password.length >= MIN_LENGTH;

  return (
    <StepScreen
      heading="사용할 비밀번호를 입력해 주세요"
      nextDisabled={!valid}
      onNext={() => router.push('/auth/signup/nickname')}>
      <UnderlineInput
        value={password}
        onChangeText={setPassword}
        placeholder="비밀번호"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="newPassword"
        autoFocus
        returnKeyType="next"
        onSubmitEditing={() => valid && router.push('/auth/signup/nickname')}
      />
    </StepScreen>
  );
}
