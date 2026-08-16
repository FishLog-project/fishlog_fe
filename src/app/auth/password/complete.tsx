import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, Screen, ScreenHeader } from '@/components/common';
import { Brand, Typography } from '@/constants/theme';

/**
 * 비밀번호 찾기 4단계 — 변경 완료.
 * 되돌아갈 이전 스텝이 없으므로 헤더에 뒤로가기를 두지 않고 로그인으로만 보낸다.
 */
export default function PasswordCompleteScreen() {
  const router = useRouter();

  return (
    <Screen
      edges={['top', 'bottom']}
      header={<ScreenHeader title="비밀번호 찾기" />}
      footer={
        <PrimaryButton
          label="로그인하러 가기"
          onPress={() => router.replace('/auth/login')}
        />
      }>
      <View style={styles.body}>
        <Text style={styles.heading}>
          비밀번호가 변경되었어요!{'\n'}새 비밀번호로 로그인해 주세요
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  heading: {
    ...Typography.heading,
    color: Brand.textStrong,
    marginTop: 72,
  },
});
