import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Components, Typography } from '@/constants/theme';

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  /** 자릿수 (기본 6) */
  length?: number;
};

/**
 * 이메일 인증번호용 N자리 코드 입력 (Figma 634:2674~2679).
 *
 * 숨긴 TextInput 하나로 입력받고 각 자리를 언더라인 셀로 보여준다.
 * 채워진 자리(와 커서가 놓인 자리)는 파란 언더라인, 나머지는 회색이다.
 */
export function OtpInput({ value, onChangeText, length = Components.otp.length }: Props) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const cells = Array.from({ length });

  const handleChange = (text: string) => {
    onChangeText(text.replace(/[^0-9]/g, '').slice(0, length));
  };

  return (
    <Pressable
      style={styles.wrap}
      onPress={() => inputRef.current?.focus()}
      // 셀은 순전히 표시용이다. 스크린리더에는 아래 TextInput 하나만 노출한다.
      accessible={false}>
      {cells.map((_, i) => {
        const char = value[i] ?? '';
        const isCursor = focused && i === value.length;
        const lit = char !== '' || isCursor;
        return (
          <View
            key={i}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.cell,
              {
                borderBottomColor: lit
                  ? Components.authInput.underlineActive
                  : Components.authInput.underline,
              },
            ]}>
            <Text style={styles.digit}>{char}</Text>
          </View>
        );
      })}

      {/*
        실제 입력을 받는 투명 TextInput. 셀 전체를 덮게 깔아 둔다.
        1x1로 숨겨 두면 키보드가 올라올 때 ScrollView의 자동 스크롤이
        그 점 하나만 보이게 맞춰서, 정작 셀 줄은 화면 밖에 남는다.
      */}
      <TextInput
        ref={inputRef}
        style={styles.hidden}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        maxLength={length}
        textContentType="oneTimeCode"
        autoFocus
        caretHidden
        accessibilityLabel={`인증번호 ${length}자리`}
        accessibilityHint="이메일로 받은 인증번호를 입력하세요"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: Components.otp.gap,
    // 언더라인 입력과 같은 안쪽 여백으로 좌우를 맞춘다
    paddingHorizontal: Components.authInput.inset,
  },
  cell: {
    flex: 1,
    height: Components.otp.cellHeight,
    borderBottomWidth: Components.authInput.underlineWidth,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: Components.authInput.underlineGap,
  },
  digit: { ...Typography.otpDigit, color: Components.authInput.text },
  hidden: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0 },
});
