import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton, Screen } from '@/components/common';
import { Brand, Components, Spacing, Typography } from '@/constants/theme';
import { authApi, useAuth } from '@/features/auth';

/** 로그인 화면 — 이메일/비밀번호 입력 후 진입. 하단에 비밀번호 찾기 / 회원가입. */
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
    <Screen keyboardAvoiding edges={['top', 'bottom']}>
      <Text style={styles.logo}>Fishlog</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="이메일"
          placeholderTextColor={Components.authInput.placeholder}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="비밀번호"
          placeholderTextColor={Components.authInput.placeholder}
          secureTextEntry
          textContentType="password"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton
          label="다음"
          onPress={handleLogin}
          disabled={!canSubmit}
          loading={submitting}
        />

        <View style={styles.links}>
          <Pressable
            hitSlop={8}
            onPress={() => router.push('/auth/password/email')}>
            <Text style={styles.link}>비밀번호 찾기</Text>
          </Pressable>
          <View style={styles.divider} />
          <Pressable hitSlop={8} onPress={() => router.push('/auth/signup/email')}>
            <Text style={styles.link}>회원가입</Text>
          </Pressable>
        </View>

        <Pressable hitSlop={8} onPress={handleGuest} style={styles.guest}>
          <Text style={styles.guestText}>로그인 없이 둘러보기</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: {
    ...Typography.brand,
    fontSize: 37,
    lineHeight: 44,
    color: Brand.primary,
    textAlign: 'center',
    marginTop: 120,
  },
  form: { marginTop: 'auto', marginBottom: Spacing.six, gap: 12 },
  input: {
    ...Typography.input,
    height: Components.authInput.boxHeight,
    borderRadius: Components.authInput.boxRadius,
    backgroundColor: Components.authInput.boxBg,
    paddingHorizontal: Components.authInput.boxPaddingX,
    color: Components.authInput.text,
  },
  links: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginTop: 8,
  },
  error: { ...Typography.footnote, color: Brand.textError, textAlign: 'center' },
  link: { ...Typography.caption, color: Components.authInput.placeholder },
  divider: { width: 1, height: 12, backgroundColor: Brand.divider },
  guest: { alignSelf: 'center', marginTop: 20, paddingVertical: 4 },
  guestText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Brand.primary,
    textDecorationLine: 'underline',
  },
});
