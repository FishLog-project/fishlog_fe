import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, Typography } from '@/constants/theme';
import { authApi, OtpInput, StepScreen, useSignup } from '@/features/auth';

const CODE_LENGTH = 6;

/**
 * 회원가입 2단계 — 이메일 인증번호 입력.
 * - 진입 시 send-code 호출로 인증번호 발송
 * - "다음"에서 verify-code 호출로 검증 (성공 시 비밀번호 단계로)
 */
export default function SignupVerifyScreen() {
  const router = useRouter();
  const { email } = useSignup();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  // 진입과 동시에 발송이 시작되므로 초기값이 곧 "전송 중"이다.
  // (effect 본문에서 setSending(true)를 부르면 set-state-in-effect에 걸린다)
  const [sending, setSending] = useState(true);
  const [verifying, setVerifying] = useState(false);

  // 진입 시 자동 발송
  useEffect(() => {
    authApi.sendEmailCode(email).then((res) => {
      setSending(false);
      if (!res.ok) setError(res.message);
    });
  }, [email]);

  /** 재전송 버튼 — 사용자 액션이라 effect 밖에서 상태를 바꾼다. */
  const requestCode = async () => {
    setSending(true);
    setError(null);
    const res = await authApi.sendEmailCode(email);
    setSending(false);
    if (!res.ok) setError(res.message);
  };

  const handleVerify = async () => {
    setVerifying(true);
    setError(null);
    const res = await authApi.verifyEmailCode(email, code);
    setVerifying(false);
    if (res.ok) {
      router.push('/auth/signup/password');
    } else {
      setError(res.message);
    }
  };

  return (
    <StepScreen
      heading={'이메일 주소로 전송된\n인증번호를 입력해 주세요'}
      nextDisabled={code.length < CODE_LENGTH}
      loading={verifying}
      onNext={handleVerify}>
      <OtpInput value={code} onChangeText={setCode} length={CODE_LENGTH} />

      <View style={styles.meta}>
        {error ? <Text style={styles.error}>{error}</Text> : <View />}
        <Pressable hitSlop={8} disabled={sending} onPress={requestCode}>
          <Text style={[styles.resend, sending && styles.resendDisabled]}>
            {sending ? '전송 중…' : '인증번호 재전송'}
          </Text>
        </Pressable>
      </View>
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  meta: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  error: { ...Typography.footnote, color: Brand.textError },
  resend: { ...Typography.footnote, fontWeight: '500', color: Brand.textMuted },
  resendDisabled: { opacity: 0.5 },
});
