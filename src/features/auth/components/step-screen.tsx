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
  /**
   * 버튼 바로 위에 붙는 오류·안내 문구.
   *
   * 입력 영역이 아니라 하단 고정 영역에 둔다. 스크롤 안에 두면 키보드가
   * 올라왔을 때 화면 밖으로 밀려서, 정작 버튼을 누른 사람이 왜 안 넘어가는지
   * 모르게 된다.
   */
  message?: ReactNode;
  /** 버튼 아래에 덧붙는 요소 (인증번호 재전송 링크 등) */
  footerExtra?: ReactNode;
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
  message,
  footerExtra,
}: Props) {
  const typing = useKeyboardVisible();

  return (
    <Screen
      keyboardAvoiding
      edges={['top', 'bottom']}
      contentPadding={Layout.stepPadding}
      header={<ScreenHeader title={headerTitle} showBack={showBack} />}
      footer={
        // 문구가 없을 때 <FormError/>는 아무것도 그리지 않는다.
        // 레이아웃 노드가 생기지 않으므로 gap도 따라서 사라진다.
        <View style={styles.footer}>
          {message}
          <PrimaryButton
            label={buttonLabel}
            onPress={onNext}
            disabled={nextDisabled}
            loading={loading}
          />
          {footerExtra}
        </View>
      }>
      <View style={[styles.body, typing && styles.bodyTyping]}>
        {/*
          안내 문구 블록의 높이를 잡아 둔다. 디자인에서 입력의 y좌표는 문구가
          한 줄이든 두 줄이든 같아서, 문구 길이에 따라 입력이 따라 움직이면
          화면끼리 어긋난다.

          키보드가 올라오면 이 블록을 줄인다. 시안의 여백은 키보드가 없는
          프레임 기준이라, 그대로 두면 오류 문구까지 화면 밖으로 밀린다.
        */}
        <View style={[styles.headingBlock, typing && styles.headingBlockTyping]}>
          <Text style={styles.heading}>{heading}</Text>
        </View>
        {children}
      </View>
    </Screen>
  );
}

/**
 * 키보드가 떠 있는지.
 *
 * reanimated의 useAnimatedKeyboard를 쓰지 않는다. Screen이 키보드 회피에
 * 이미 그 훅을 쓰고 있는데, 한 화면에서 두 번 호출하면 한쪽이 0을 받는다.
 */
function useKeyboardVisible() {
  // 이미 키보드가 떠 있는 채로 이 화면에 들어올 수 있다 (앞 스텝에서 바로 넘어온 경우).
  // 그때는 keyboardDidShow가 다시 오지 않으므로 현재 상태를 초기값으로 읽는다.
  const [visible, setVisible] = useState(() => Keyboard.isVisible());

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return visible;
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingTop: STEP.headingTop },
  bodyTyping: { paddingTop: STEP.headingTopTyping },
  headingBlock: { minHeight: STEP.headingBlock },
  headingBlockTyping: { minHeight: STEP.headingBlockTyping },
  heading: { ...Typography.heading, color: Brand.textStrong },
  footer: { gap: STEP.footerGap },
});
