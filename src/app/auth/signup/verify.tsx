import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FormError, ReadonlyField } from '@/components/common';
import { Brand, Components, Spacing, Typography } from '@/constants/theme';
import { authApi, OtpInput, StepScreen, useSignup } from '@/features/auth';

const CODE_LENGTH = Components.otp.length;
const RESEND_COOLDOWN_MS = 30_000;

/**
 * 회원가입 2단계 — 이메일 인증번호 입력 (Figma 634:2658).
 *
 * 인증번호는 앞 단계("사용할 이메일") 의 "다음"에서 이미 발송했다. 여기서 또
 * 보내면 한 번의 진행에 메일이 두 통 나가고, 이미 가입된 이메일인지도 앞
 * 단계에서 걸러진다. 그래서 이 화면은 재전송 버튼을 눌렀을 때만 발송한다.
 *
 * 앞 단계에서 입력한 이메일은 고칠 수 없는 형태로 다시 보여준다.
 * (어느 주소로 갔는지 모른 채 메일함을 뒤지게 하지 않으려는 것)
 */
export default function SignupVerifyScreen() {
  const router = useRouter();
  const { email } = useSignup();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendAvailableAt, setResendAvailableAt] = useState(
    () => Date.now() + RESEND_COOLDOWN_MS,
  );
  const [remainingSeconds, setRemainingSeconds] = useState(30);

  // 이메일 없이 이 화면에 닿았다면(딥링크 등) 발송된 인증번호도 없다.
  useEffect(() => {
    if (!email) router.replace('/auth/signup/email');
  }, [email, router]);

  // 앱이 백그라운드에 있는 동안에도 실제 경과 시간을 반영하도록 종료 시각을 기준으로 센다.
  useEffect(() => {
    const updateRemaining = () => {
      setRemainingSeconds(
        Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000)),
      );
    };

    updateRemaining();
    const timer = setInterval(updateRemaining, 250);
    return () => clearInterval(timer);
  }, [resendAvailableAt]);

  /** 재전송 — 사용자가 명시적으로 눌렀을 때만 메일이 나간다. */
  const requestCode = async () => {
    if (sending || remainingSeconds > 0) return;
    setSending(true);
    setError(null);
    setNotice(null);
    setCode('');
    const res = await authApi.sendEmailCode(email);
    setSending(false);
    if (res.ok) {
      setNotice('인증번호를 다시 보냈어요.');
      setResendAvailableAt(Date.now() + RESEND_COOLDOWN_MS);
    } else {
      setError(res.message);
    }
  };

  // 틀린 번호를 고치기 시작하면 빨간 문구는 바로 걷는다.
  const handleCodeChange = (v: string) => {
    setCode(v);
    if (error) setError(null);
  };

  const handleVerify = async () => {
    setVerifying(true);
    setError(null);
    setNotice(null);
    const res = await authApi.verifyEmailCode(email, code);
    setVerifying(false);
    if (res.ok) router.push('/auth/signup/password');
    else setError(res.message);
  };

  return (
    <StepScreen
      heading={'이메일 주소로 전송된 인증번호를\n입력해 주세요'}
      nextDisabled={code.length < CODE_LENGTH}
      loading={verifying}
      onNext={handleVerify}
      headingBlockHeight={96}
      footerExtra={
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          disabled={sending || remainingSeconds > 0}
          onPress={requestCode}
          style={styles.resend}>
          <Text
            style={[
              styles.resendText,
              (sending || remainingSeconds > 0) && styles.resendOff,
              remainingSeconds > 0 && styles.countdownText,
            ]}>
            {sending
              ? '전송 중…'
              : remainingSeconds > 0
                ? `00:${String(remainingSeconds).padStart(2, '0')}초 후에 재전송 가능`
                : '인증번호 다시 받기'}
          </Text>
        </Pressable>
      }>
      {/* 이메일 재확인 ~ 인증번호 입력 간격은 부모가 gap으로 준다 */}
      <View style={styles.fields}>
        <ReadonlyField value={email} icon="mail-outline" label="이메일" />
        <View style={styles.otpBlock}>
          <OtpInput value={code} onChangeText={handleCodeChange} length={CODE_LENGTH} />
          {error ? (
            <FormError message={error} />
          ) : notice ? (
            <Text style={styles.notice} accessibilityLiveRegion="polite">
              {notice}
            </Text>
          ) : null}
        </View>
      </View>
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  fields: { gap: Components.authStep.fieldGap },
  otpBlock: { gap: 12 },
  notice: { ...Typography.footnote, color: Brand.textMuted },
  // 버튼과의 간격은 StepScreen의 footer gap이 잡는다
  resend: { alignSelf: 'center', paddingVertical: Spacing.one },
  resendText: {
    ...Typography.caption,
    color: Brand.textWeak,
    textDecorationLine: 'underline',
  },
  countdownText: { textDecorationLine: 'none' },
  resendOff: { opacity: 0.5 },
});
