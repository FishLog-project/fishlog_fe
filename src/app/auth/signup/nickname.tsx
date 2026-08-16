import { useRouter } from 'expo-router';

import { StepScreen, UnderlineInput, useSignup } from '@/features/auth';

/** 회원가입 4단계 — 사용할 닉네임 입력. */
export default function SignupNicknameScreen() {
  const router = useRouter();
  const { nickname, setNickname } = useSignup();

  const valid = nickname.trim().length > 0;

  // 닉네임은 가운데 공백이 유효할 수 있어서 입력 중에는 trim하지 않는다.
  // (타이핑 도중 trim하면 공백을 아예 못 넣는다) 대신 단계를 넘길 때 한 번 정규화한다.
  const goNext = () => {
    setNickname(nickname.trim());
    router.push('/auth/signup/complete');
  };

  return (
    <StepScreen
      heading={'거의 다 왔어요!\n사용할 닉네임을 입력해 주세요'}
      nextDisabled={!valid}
      onNext={goNext}>
      <UnderlineInput
        value={nickname}
        onChangeText={setNickname}
        placeholder="닉네임"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={20}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => valid && goNext()}
      />
    </StepScreen>
  );
}
