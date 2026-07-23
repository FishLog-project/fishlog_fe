import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/common';
import { AuthHeader, useAuth, useSignup } from '@/features/auth';

/**
 * 회원가입 5단계 — 가입 완료.
 * "시작하기" → 앱(홈)으로 진입.
 *
 * ⚠️ signup API는 서버 수정 중이라 아직 호출하지 않는다.
 *    API 확정 후 handleStart에서 authApi.signup({email,password,nickname}) 연동 예정.
 */
export default function SignupCompleteScreen() {
  const { signIn } = useAuth();
  const { email, password, nickname } = useSignup();

  const handleStart = async () => {
    // TODO: authApi.signup({ email, password, nickname }) 성공 후 로그인 처리로 교체.
    void email;
    void password;
    void nickname;
    await signIn('dev-session');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AuthHeader title="가입 완료" showBack={false} />

      <View style={styles.body}>
        <Text style={styles.heading}>
          가입이 완료되었어요!{'\n'}나만의 물고기 도감, 하나씩 채워봐요
        </Text>

        {/* 캐릭터 일러스트 자리 (디자인의 원형 플레이스홀더) */}
        <View style={styles.illustration} />
      </View>

      <View style={styles.footer}>
        <PrimaryButton label="시작하기" onPress={handleStart} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  body: { flex: 1, paddingHorizontal: 20, alignItems: 'center' },
  heading: {
    alignSelf: 'stretch',
    fontSize: 24,
    fontWeight: '600',
    color: '#1C1C1C',
    lineHeight: 34,
    marginTop: 60,
  },
  illustration: {
    width: 240,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#D9D9D9',
    marginTop: 80,
  },
  footer: { paddingHorizontal: 20, paddingBottom: 8 },
});
