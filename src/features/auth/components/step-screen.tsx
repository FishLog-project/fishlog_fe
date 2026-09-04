import { useEffect, useState, type ReactNode } from 'react';
import { Keyboard, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, Screen, ScreenHeader } from '@/components/common';
import { Brand, Components, Layout, Typography } from '@/constants/theme';

const STEP = Components.authStep;

type Props = {
  /** 헤더 타이틀 (기본 "회원가입") */
  headerTitle?: string;
  showBack?: boolean;
  /** 큰 볼드 안내 문구 (줄바꿈은 \n) */
  heading: string;
  /** 입력 영역 */
  children: ReactNode;
  /** 하단 버튼 라벨 (기본 "다음") */
  buttonLabel?: string;
  onNext: () => void;
  nextDisabled?: boolean;
  loading?: boolean;
  /** 버튼 아래에 덧붙는 요소 (인증번호 재전송 링크 등) */
  footerExtra?: ReactNode;
  headingBlockHeight?: number;
  hideFooterWhenKeyboard?: boolean;
  /** 키보드가 열리면 타이틀·입력 묶음을 과하지 않게 위로 당긴다. */
  compactWhenKeyboard?: boolean;
};

/**
 * 회원가입·비밀번호찾기 스텝 공통 레이아웃 (Figma 634:2568).
 * [헤더] + [큰 안내 문구] + [입력 영역] + [하단 고정 버튼] + 키보드 회피.
 *
 * 좌우 여백은 Screen이 책임진다. 본문만 stepPadding(28)이고 버튼은
 * screenPadding(20)이라, contentPadding으로 본문 쪽만 넓혀 준다.
 *
 * 세로 배치는 전부 부모가 padding/gap으로 잡는다. 자식(입력·문구)은 자기
 * 여백을 갖지 않으므로, 스텝마다 요소를 넣고 빼도 간격이 어긋나지 않는다.
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
  footerExtra,
  headingBlockHeight,
  hideFooterWhenKeyboard = true,
  compactWhenKeyboard = false,
}: Props) {
  const keyboardVisible = useKeyboardVisible(compactWhenKeyboard);

  return (
    <Screen
      keyboardAvoiding
      hideFooterWhenKeyboard={hideFooterWhenKeyboard}
      edges={['top', 'bottom']}
      contentPadding={Layout.stepPadding}
      header={<ScreenHeader title={headerTitle} showBack={showBack} />}
      footer={
        <View style={styles.footer}>
          {footerExtra}
          <PrimaryButton
            label={buttonLabel}
            onPress={onNext}
            disabled={nextDisabled}
            loading={loading}
          />
        </View>
      }>
      <View style={[styles.body, keyboardVisible && styles.bodyWithKeyboard]}>
        {/*
          안내 문구 블록의 높이를 잡아 둔다. 디자인에서 입력의 y좌표는 문구가
          한 줄이든 두 줄이든 같아서, 문구 길이에 따라 입력이 따라 움직이면
          화면끼리 어긋난다.

          키보드가 올라오면 이 블록을 줄인다. 시안의 여백은 키보드가 없는
          프레임 기준이라, 그대로 두면 오류 문구까지 화면 밖으로 밀린다.
        */}
        <View
          style={[
            styles.headingBlock,
            headingBlockHeight !== undefined && { minHeight: headingBlockHeight },
            keyboardVisible && styles.headingBlockWithKeyboard,
          ]}>
          <Text style={styles.heading}>{heading}</Text>
        </View>
        {children}
      </View>
    </Screen>
  );
}

function useKeyboardVisible(enabled: boolean) {
  const [visible, setVisible] = useState(() => Keyboard.isVisible());

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return enabled && visible;
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingTop: STEP.headingTop },
  bodyWithKeyboard: { paddingTop: STEP.headingTopTyping },
  headingBlock: { minHeight: STEP.headingBlock },
  headingBlockWithKeyboard: { minHeight: STEP.headingBlockTyping },
  heading: { ...Typography.heading, color: Brand.textStrong },
  footer: { gap: STEP.footerGap },
});
