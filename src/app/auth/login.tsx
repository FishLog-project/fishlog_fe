import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton, Screen } from '@/components/common';
import { Brand, Components, Derived } from '@/constants/theme';
import { useAuth } from '@/features/auth';

/** 로그인 화면 — 이메일/비밀번호 입력 후 진입. 하단에 비밀번호 찾기 / 회원가입. */
export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const canSubmit = email.trim().length > 0 && password.length > 0;

  const handleLogin = async () => {
    // TODO: 로그인 API 확정 후 authApi.login(email, password) 연동.
    // 현재는 서버 수정 중이라 임시 세션으로 앱에 진입시킨다.
    await signIn('dev-session');
    router.replace('/home');
  };

  // 로그인 없이 둘러보기 — 게스트 세션으로 앱(홈)에 진입.
  const handleGuest = async () => {
    await signIn('guest');
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
        <PrimaryButton label="다음" onPress={handleLogin} disabled={!canSubmit} />

        <View style={styles.links}>
          <Pressable hitSlop={8} onPress={() => {}}>
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
    fontSize: 37,
    fontWeight: '500',
    color: Brand.primary,
    textAlign: 'center',
    marginTop: 120,
  },
  form: { marginTop: 'auto', marginBottom: '20%', gap: 12 },
  input: {
    height: Components.authInput.boxHeight,
    borderRadius: Components.authInput.boxRadius,
    backgroundColor: Components.authInput.boxBg,
    paddingHorizontal: Components.authInput.boxPaddingX,
    fontSize: 16,
    color: Components.authInput.text,
  },
  links: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginTop: 8,
  },
  link: { fontSize: 14, fontWeight: '500', color: Components.authInput.placeholder },
  divider: { width: 1, height: 12, backgroundColor: Derived.neutral },
  guest: { alignSelf: 'center', marginTop: 20, paddingVertical: 4 },
  guestText: {
    fontSize: 14,
    fontWeight: '600',
    color: Brand.primary,
    textDecorationLine: 'underline',
  },
});
