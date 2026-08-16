import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, Typography } from '@/constants/theme';
import { authApi, OtpInput, StepScreen, usePasswordReset } from '@/features/auth';

const CODE_LENGTH = 6;

/**
 * 비밀번호 찾기 2단계 — 인증번호 입력.
 * 앞 단계에서 이미 발송했으므로 진입 시 자동 발송은 하지 않고, 재전송만 제공한다.
 */
export default function PasswordVerifyScreen() {
  const router = useRouter();
  const { email } = usePasswordReset();
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 이메일 없이 이 화면에 직접 들어온 경우(딥링크·새로고침) 첫 단계로 돌려보낸다.
  useEffect(() => {
    if (!email) router.replace('/auth/password/email');
  }, [email, router]);

  const handleResend = async () => {
    setSending(true);
    setError(null);
    const res = await authApi.sendPasswordCode(email);
    setSending(false);
    if (!res.ok) setError(res.message);
  };

  const handleVerify = async () => {
    setVerifying(true);
    setError(null);
    const res = await authApi.verifyPasswordCode(email, code);
    setVerifying(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    router.push('/auth/password/reset');
  };

  return (
    <StepScreen
      headerTitle="비밀번호 찾기"
      heading={'이메일 주소로 전송된\n인증번호를 입력해 주세요'}
      nextDisabled={code.length < CODE_LENGTH}
      loading={verifying}
      onNext={handleVerify}>
      <OtpInput value={code} onChangeText={setCode} length={CODE_LENGTH} />

      <View style={styles.meta}>
        {error ? <Text style={styles.error}>{error}</Text> : <View />}
        <Pressable hitSlop={8} disabled={sending} onPress={handleResend}>
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
  error: { ...Typography.footnote, color: Brand.textError, flex: 1 },
  resend: { ...Typography.footnote, fontWeight: '500', color: Brand.textMuted },
  resendDisabled: { opacity: 0.5 },
});
