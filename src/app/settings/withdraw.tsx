import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FormError } from '@/components/common';
import { Brand, Components, Typography } from '@/constants/theme';
import { authApi, StepScreen, UnderlineInput, useAuth } from '@/features/auth';

/**
 * 회원탈퇴 (마이페이지 → 설정).
 *
 * 되돌릴 수 없는 동작이라 서버가 현재 비밀번호를 함께 요구한다
 * (DELETE /api/users/me). 비밀번호를 다시 받는 것 자체가 확인 절차이므로
 * 별도의 "정말 탈퇴할까요?" 팝업을 겹쳐 두지 않는다.
 */
export default function WithdrawScreen() {
  const router = useRouter();
  const { token, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (password.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);

    const res = await authApi.withdraw(token, password);
    if (!res.ok) {
      setSubmitting(false);
      setError(res.message);
      return;
    }

    // 계정이 사라졌으므로 남은 세션도 지우고 로그인 화면으로 되돌린다
    await signOut();
    setSubmitting(false);
    router.replace('/auth/login');
  };

  return (
    <StepScreen
      headerTitle="회원탈퇴"
      heading="정말 탈퇴하시겠어요?"
      buttonLabel="탈퇴하기"
      nextDisabled={password.length === 0}
      loading={submitting}
      onNext={handleSubmit}>
      <View style={styles.fields}>
        <Text style={styles.body}>
          탈퇴하면 도감·낚시 기록·저장 목록이 모두 삭제되고 되돌릴 수 없어요.
          {'\n'}확인을 위해 현재 비밀번호를 입력해 주세요.
        </Text>

        <View style={styles.inputWithError}>
          <UnderlineInput
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              if (error) setError(null);
            }}
            placeholder="현재 비밀번호"
            secureTextEntry
            passwordToggle
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            accessibilityLabel="현재 비밀번호"
          />
          <FormError message={error} />
        </View>
      </View>
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  /** 안내문 ~ 입력 간격은 부모가 gap으로 준다 */
  fields: { gap: Components.authStep.fieldGap },
  inputWithError: { gap: 12 },
  body: { ...Typography.body, color: Brand.textMuted },
});
