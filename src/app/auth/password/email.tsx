import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FormError } from '@/components/common';
import {
  authApi,
  StepScreen,
  UnderlineInput,
  usePasswordReset,
} from '@/features/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 비밀번호 찾기 1단계 — 계정 이메일 입력 (Figma 314:672).
 * "다음"에서 재설정용 인증코드를 발송하고 인증 단계로 넘어간다.
 */
export default function PasswordEmailScreen() {
  const router = useRouter();
  const { email, setEmail } = usePasswordReset();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 회원가입 이메일 단계와 같은 이유로 저장 시점에 공백을 털어낸다.
  const valid = EMAIL_RE.test(email);

  const handleNext = async () => {
    setSending(true);
    setError(null);
    const res = await authApi.sendPasswordCode(email);
    setSending(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    router.push('/auth/password/verify');
  };

  return (
    <StepScreen
      headerTitle="비밀번호 찾기"
      heading={'찾고 싶은 계정의 이메일 주소를\n입력해 주세요'}
      nextDisabled={!valid}
      loading={sending}
      onNext={handleNext}>
      <View style={styles.inputWithError}>
        <UnderlineInput
          value={email}
          onChangeText={(v) => {
            setEmail(v.trim());
            if (error) setError(null);
          }}
          placeholder="이메일 주소"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
          autoFocus
          returnKeyType="next"
          onSubmitEditing={() => valid && handleNext()}
        />
        <FormError message={error} />
      </View>
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  inputWithError: { gap: 12 },
});
