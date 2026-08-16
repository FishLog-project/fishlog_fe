import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Brand, Typography } from '@/constants/theme';
import {
  authApi,
  StepScreen,
  UnderlineInput,
  usePasswordReset,
} from '@/features/auth';

const MIN_LENGTH = 8;

/**
 * 비밀번호 찾기 3단계 — 새 비밀번호 설정.
 *
 * 새 비밀번호는 컨텍스트에 담지 않고 이 화면 안에서만 들고 있다가 바로 전송한다.
 * (평문 비밀번호가 여러 화면에 걸쳐 메모리에 남지 않게 하려는 것)
 */
export default function PasswordResetScreen() {
  const router = useRouter();
  const { email, reset } = usePasswordReset();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) router.replace('/auth/password/email');
  }, [email, router]);

  const longEnough = password.length >= MIN_LENGTH;
  const matches = confirm.length > 0 && password === confirm;
  const valid = longEnough && matches;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const res = await authApi.resetPassword(email, password);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    reset();
    router.replace('/auth/password/complete');
  };

  return (
    <StepScreen
      headerTitle="비밀번호 찾기"
      heading={'새로 사용할 비밀번호를\n입력해 주세요'}
      buttonLabel="변경하기"
      nextDisabled={!valid}
      loading={submitting}
      onNext={handleSubmit}>
      <UnderlineInput
        value={password}
        onChangeText={setPassword}
        placeholder="새 비밀번호 (8자 이상)"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="newPassword"
        autoFocus
        returnKeyType="next"
      />

      <View style={styles.second}>
        <UnderlineInput
          value={confirm}
          onChangeText={setConfirm}
          placeholder="비밀번호 확인"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={() => valid && handleSubmit()}
        />
      </View>

      {/* 확인란을 채우기 전에는 불일치 문구를 띄우지 않는다 (타이핑 중 잔소리 방지) */}
      {confirm.length > 0 && !matches ? (
        <Text style={styles.error}>비밀번호가 일치하지 않아요.</Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  second: { marginTop: 32 },
  error: { ...Typography.footnote, color: Brand.textError, marginTop: 16 },
});
