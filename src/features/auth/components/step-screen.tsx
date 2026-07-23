import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/common';

import { AuthHeader } from './auth-header';

type Props = {
  /** 헤더 타이틀 (기본 "회원가입") */
  headerTitle?: string;
  showBack?: boolean;
  /** 큰 볼드 안내 문구 (줄바꿈은 \n) */
  heading: string;
  /** 입력 영역 */
  children: React.ReactNode;
  /** 하단 버튼 라벨 (기본 "다음") */
  buttonLabel?: string;
  onNext: () => void;
  nextDisabled?: boolean;
  loading?: boolean;
};

/**
 * 회원가입 스텝 공통 레이아웃.
 * [헤더] + [큰 안내 문구] + [입력 영역] + [하단 고정 버튼] + 키보드 회피.
 */
export function StepScreen({
  headerTitle = '회원가입',
  showBack = true,
  heading,
  children,
  buttonLabel = '다음',
  onNext,
  nextDisabled,
  loading,
}: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AuthHeader title={headerTitle} showBack={showBack} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.body}>
          <Text style={styles.heading}>{heading}</Text>
          <View style={styles.inputArea}>{children}</View>
        </View>
        <View style={styles.footer}>
          <PrimaryButton
            label={buttonLabel}
            onPress={onNext}
            disabled={nextDisabled}
            loading={loading}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 20 },
  heading: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1C1C1C',
    lineHeight: 34,
    marginTop: 72,
  },
  inputArea: { marginTop: 40 },
  footer: { paddingHorizontal: 20, paddingBottom: 8, paddingTop: 8 },
});
