import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FormError, PrimaryButton, Screen, ScreenHeader } from '@/components/common';
import { Brand, Components, Layout, Typography } from '@/constants/theme';
import { authApi, useAuth, useSignup } from '@/features/auth';

const DONE = Components.signupComplete;

/**
 * 회원가입 5단계 — 가입 완료.
 * "시작하기"에서 실제 가입 요청을 보내고, 성공하면 그대로 로그인해 홈으로 보낸다.
 *
 * 가입을 이 시점에 하는 이유: 앞 단계는 입력 수집일 뿐이고 이메일 인증까지 끝난 뒤라야
 * 서버가 계정을 만들어 준다. (인증만 하고 이탈하면 계정은 생기지 않는다)
 *
 * ⚠️ 이 화면만 Figma 시안이 없다. 앞 스텝들과 같은 여백·타이포를 따라가되,
 * 캐릭터 일러스트는 자리만 잡아 두었다.
 */
export default function SignupCompleteScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { email, password, nickname, reset } = useSignup();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setSubmitting(true);
    setError(null);

    const created = await authApi.signup({ email, password, nickname });
    if (!created.ok) {
      setSubmitting(false);
      setError(created.message);
      return;
    }

    // 가입 직후 같은 자격으로 로그인해 토큰을 받는다.
    const logged = await authApi.login(email, password);
    setSubmitting(false);
    if (!logged.ok) {
      // 계정은 만들어졌으므로 로그인 화면으로 보내 다시 시도하게 한다.
      setError('가입은 완료됐어요. 로그인 화면에서 다시 시도해 주세요.');
      return;
    }

    await signIn(logged.tokens);
    reset();
    router.replace('/home');
  };

  return (
    <Screen
      edges={['top', 'bottom']}
      contentPadding={Layout.stepPadding}
      header={<ScreenHeader title="가입 완료" />}
      footer={<PrimaryButton label="시작하기" onPress={handleStart} loading={submitting} />}>
      <View style={styles.body}>
        <Text style={styles.heading}>
          가입이 완료되었어요!{'\n'}나만의 물고기 도감, 하나씩 채워봐요
        </Text>

        <View style={styles.figure}>
          {/* 캐릭터 일러스트 자리 */}
          <View style={styles.illustration} />
          <FormError message={error} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingTop: Components.authStep.headingTop,
    gap: DONE.figureGap,
  },
  heading: { ...Typography.heading, color: Brand.textStrong },
  figure: { alignItems: 'center', gap: DONE.messageGap },
  illustration: {
    width: DONE.illustration.width,
    height: DONE.illustration.height,
    borderRadius: DONE.illustration.radius,
    backgroundColor: Brand.divider,
  },
});
