import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, Screen, ScreenHeader } from '@/components/common';
import { Brand, Typography } from '@/constants/theme';

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
 *
 * 좌우 여백은 Screen이 책임지므로 여기서는 세로 흐름만 정의한다.
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
    <Screen
      keyboardAvoiding
      edges={['top', 'bottom']}
      header={<ScreenHeader title={headerTitle} showBack={showBack} />}
      footer={
        <PrimaryButton
          label={buttonLabel}
          onPress={onNext}
          disabled={nextDisabled}
          loading={loading}
        />
      }>
      <Text style={styles.heading}>{heading}</Text>
      <View style={styles.inputArea}>{children}</View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    ...Typography.heading,
    color: Brand.textStrong,
    marginTop: 72,
  },
  inputArea: { marginTop: 40 },
});
