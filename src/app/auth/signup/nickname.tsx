import { useRouter } from 'expo-router';
import { useState } from 'react';

import { FormError } from '@/components/common';
import { StepScreen, UnderlineInput, useSignup } from '@/features/auth';

/** 서버가 요구하는 닉네임 길이 (Swagger SignupRequest: 2~10자, 유니크) */
const MIN_LENGTH = 2;
const MAX_LENGTH = 10;

/** 회원가입 4단계 — 사용할 닉네임 입력 (Figma 147:1230). */
export default function SignupNicknameScreen() {
  const router = useRouter();
  const { nickname, setNickname } = useSignup();
  const [touched, setTouched] = useState(false);

  const trimmed = nickname.trim();
  const valid = trimmed.length >= MIN_LENGTH && trimmed.length <= MAX_LENGTH;

  // 길이 문구는 한 번이라도 입력창을 벗어난 뒤부터 띄운다 (한 글자 치자마자 잔소리 방지)
  const message =
    touched && trimmed.length > 0 && !valid
      ? `닉네임은 ${MIN_LENGTH}~${MAX_LENGTH}자로 입력해 주세요.`
      : null;

  // 닉네임은 가운데 공백이 유효할 수 있어서 입력 중에는 trim하지 않는다.
  // (타이핑 도중 trim하면 공백을 아예 못 넣는다) 대신 단계를 넘길 때 한 번 정규화한다.
  const goNext = () => {
    if (!valid) {
      setTouched(true);
      return;
    }
    setNickname(trimmed);
    router.push('/auth/signup/complete');
  };

  return (
    <StepScreen
      heading={'거의 다 왔어요!\n사용할 닉네임을 입력해 주세요'}
      nextDisabled={!valid}
      message={<FormError message={message} />}
      onNext={goNext}>
      <UnderlineInput
        value={nickname}
        onChangeText={setNickname}
        onBlur={() => setTouched(true)}
        placeholder={`닉네임 (${MIN_LENGTH}~${MAX_LENGTH}자)`}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={MAX_LENGTH}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={goNext}
        accessibilityLabel="닉네임"
      />
    </StepScreen>
  );
}
