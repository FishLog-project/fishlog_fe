import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FormError, PrimaryButton, Screen, TextField } from '@/components/common';
import { Brand, Components, Typography } from '@/constants/theme';
import { authApi, useAuth } from '@/features/auth';

const LOGIN = Components.authLogin;

/**
 * 로그인 화면 (Figma 634:2544).
 * 로고 + 이메일/비밀번호 + "다음", 그 아래 비밀번호 찾기 / 회원가입.
 * 하단에는 로그인 없이 둘러보는 외곽선 버튼이 따로 붙는다.
 *
 * 세로 간격은 전부 부모 컨테이너의 gap이다. 간격이 다른 구간마다 묶음을
 * 하나씩 두고, 자식은 자기 여백을 갖지 않는다.
 */
export default function LoginScreen() {
  const router = useRouter();
  const { signIn, continueAsGuest } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  const handleLogin = async () => {
    setSubmitting(true);
    setError(null);
    const res = await authApi.login(email, password);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    await signIn(res.tokens);
    router.replace('/home');
  };

  // 로그인 없이 둘러보기 — 토큰이 아니라 게스트 플래그로 진입한다.
  // ('guest'를 토큰 자리에 넣으면 로그인 사용자와 구분이 안 된다)
  const handleGuest = async () => {
    await continueAsGuest();
    router.replace('/home');
  };

  return (
    <Screen
      keyboardAvoiding
      edges={['top', 'bottom']}
      footer={
        <PrimaryButton
          label="로그인 없이 둘러보기"
          variant="outline"
          onPress={handleGuest}
        />
      }>
      <View style={styles.body}>
        <Text style={styles.logo} accessibilityRole="header">
          Fishlog
        </Text>

        <View style={styles.form}>
          <View style={styles.fields}>
            <TextField
              value={email}
              onChangeText={setEmail}
              placeholder="이메일"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
            />
            <TextField
              value={password}
              onChangeText={setPassword}
              placeholder="비밀번호"
              secureTextEntry
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={() => canSubmit && handleLogin()}
            />
          </View>

          {/*
            오류가 없으면 FormError가 아무것도 그리지 않는다. 레이아웃 노드가
            생기지 않으므로 이 묶음의 gap도 사라지고, 입력과 버튼 사이는
            바깥 form의 gap(28) 그대로 남는다.
          */}
          <View style={styles.submit}>
            <FormError message={error} />
            <PrimaryButton
              label="다음"
              onPress={handleLogin}
              disabled={!canSubmit}
              loading={submitting}
            />
          </View>

          <View style={styles.links}>
            <Pressable hitSlop={8} onPress={() => router.push('/auth/password/email')}>
              <Text style={styles.link}>비밀번호 찾기</Text>
            </Pressable>
            <View style={styles.divider} />
            <Pressable hitSlop={8} onPress={() => router.push('/auth/signup/email')}>
              <Text style={styles.link}>회원가입</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  /** 로고 ~ 입력 묶음 (Figma y151 → y325) */
  body: { flex: 1, paddingTop: LOGIN.logoTop, gap: LOGIN.formTop },
  logo: { ...Typography.brandAuth, color: Brand.primary, textAlign: 'center' },
  /** 입력 묶음 ~ 버튼 ~ 링크 */
  form: { gap: LOGIN.blockGap },
  fields: { gap: LOGIN.fieldGap },
  submit: { gap: LOGIN.errorGap },
  links: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: LOGIN.linksGap,
  },
  link: { ...Typography.caption, color: Brand.textWeak },
  divider: { width: 1, height: LOGIN.dividerHeight, backgroundColor: Brand.divider },
});
