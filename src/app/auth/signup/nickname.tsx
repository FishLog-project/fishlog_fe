import { useRouter } from 'expo-router';

import { StepScreen, UnderlineInput, useSignup } from '@/features/auth';

/** 회원가입 4단계 — 사용할 닉네임 입력. */
export default function SignupNicknameScreen() {
  const router = useRouter();
  const { nickname, setNickname } = useSignup();

  const valid = nickname.trim().length > 0;

  return (
    <StepScreen
      heading={'거의 다 왔어요!\n사용할 닉네임을 입력해 주세요'}
      nextDisabled={!valid}
      onNext={() => router.push('/auth/signup/complete')}>
      <UnderlineInput
        value={nickname}
        onChangeText={setNickname}
        placeholder="닉네임"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={20}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => valid && router.push('/auth/signup/complete')}
      />
    </StepScreen>
  );
}
