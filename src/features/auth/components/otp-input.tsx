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
 * 이메일 인증번호용 N자리 코드 입력.
 * 숨겨진 TextInput 하나에 입력받고, 각 자리를 언더라인 셀로 표시한다.
 * 채워진 자리는 파란 언더라인 + 숫자, 빈 자리는 회색 언더라인.
 */
export function OtpInput({ value, onChangeText, length = 6 }: Props) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const cells = Array.from({ length });

  const handleChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, length);
    onChangeText(digits);
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
        const filled = char !== '' || isCursor;
        return (
          <View
            key={i}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.cell,
              {
                borderBottomColor: filled
                  ? Components.authInput.underlineActive
                  : Components.authInput.underline,
              },
            ]}>
            <Text style={styles.digit}>{char}</Text>
          </View>
        );
      })}

      {/* 실제 입력을 받는 숨김 TextInput */}
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
  wrap: { flexDirection: 'row', gap: 12 },
  cell: {
    flex: 1,
    height: 44,
    borderBottomWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: { ...Typography.inputLarge, fontSize: 22, color: Components.authInput.text },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
