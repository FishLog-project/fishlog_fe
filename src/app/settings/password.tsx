import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FormError } from '@/components/common';
import { Components } from '@/constants/theme';
import {
  authApi,
  checkPassword,
  PasswordFields,
  StepScreen,
  UnderlineInput,
  useAuth,
} from '@/features/auth';

/**
 * 비밀번호 변경 (마이페이지 → 설정).
 *
 * 로그인한 사용자가 스스로 바꾸는 경로라 이메일 인증 대신 현재 비밀번호로
 * 본인을 확인한다. (PATCH /api/users/me/password — currentPassword + newPassword)
 * 비밀번호를 잊어버린 경우는 로그인 화면의 "비밀번호 찾기"가 담당한다.
 */
export default function ChangePasswordScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const { valid, message } = checkPassword(password, confirm);
  const canSubmit = current.length > 0 && valid;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);

    const res = await authApi.changePassword(token, current, password);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }

    // 바뀐 비밀번호를 화면에 남겨 둘 이유가 없다
    setCurrent('');
    setPassword('');
    setConfirm('');
    setDone(true);
  };

  if (done) {
    return (
      <StepScreen
        headerTitle="비밀번호 변경"
        showBack={false}
        heading="비밀번호를 변경했어요"
        buttonLabel="확인"
        onNext={() => router.back()}>
        {null}
      </StepScreen>
    );
  }

  return (
    <StepScreen
      headerTitle="비밀번호 변경"
      heading={'새로 사용할 비밀번호를\n입력해 주세요'}
      buttonLabel="변경하기"
      nextDisabled={!canSubmit}
      loading={submitting}
      message={<FormError message={error ?? message} />}
      onNext={handleSubmit}>
      <View style={styles.fields}>
        <UnderlineInput
          value={current}
          onChangeText={(v) => {
            setCurrent(v);
            if (error) setError(null);
          }}
          placeholder="현재 비밀번호"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
          autoFocus
          returnKeyType="next"
          accessibilityLabel="현재 비밀번호"
        />

        <PasswordFields
          password={password}
          onPasswordChange={setPassword}
          confirm={confirm}
          onConfirmChange={setConfirm}
          placeholder="새 비밀번호 (영문+숫자 8자 이상)"
          confirmPlaceholder="새 비밀번호 확인"
          onSubmit={handleSubmit}
        />
      </View>
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  /** 현재 비밀번호 ~ 새 비밀번호 묶음 간격은 부모가 gap으로 준다 */
  fields: { gap: Components.authStep.fieldGap },
});
