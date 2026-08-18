import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { Brand, Components, Spacing, Typography } from '@/constants/theme';

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  onClear?: () => void;
  /**
   * 포커스를 잃었을 때. 검증 문구를 이 시점에 띄우는 화면이 있다
   * (타이핑 도중에 띄우면 다 치기도 전에 빨간 글씨가 뜬다).
   */
  onBlur?: () => void;
} & Pick<
  TextInputProps,
  | 'keyboardType'
  | 'autoCapitalize'
  | 'autoCorrect'
  | 'secureTextEntry'
  | 'autoFocus'
  | 'maxLength'
  | 'returnKeyType'
  | 'onSubmitEditing'
  | 'textContentType'
  | 'accessibilityLabel'
>;

/**
 * 회원가입 스텝의 언더라인형 입력 (Figma 634:2584 / 634:2649).
 *
 * 비어있음: 회색 언더라인 + Regular placeholder
 * 포커스·입력됨: 파란 언더라인 + Medium 텍스트 + 우측 clear(X) 버튼
 */
export const UnderlineInput = forwardRef<TextInput, Props>(function UnderlineInput(
  { value, onChangeText, placeholder, onClear, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const filled = value.length > 0;
  const active = focused || filled;

  return (
    <View
      style={[
        styles.container,
        {
          borderBottomColor: active
            ? Components.authInput.underlineActive
            : Components.authInput.underline,
        },
      ]}>
      <TextInput
        ref={ref}
        style={[styles.input, filled && styles.inputFilled]}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        placeholder={placeholder}
        placeholderTextColor={Components.authInput.underlinePlaceholder}
        {...rest}
      />
      {filled && (
        <Pressable
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="입력 지우기"
          onPress={() => (onClear ? onClear() : onChangeText(''))}
          style={styles.clear}>
          <Ionicons name="close" size={Components.icon.clear} color={Brand.onPrimary} />
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: Components.authInput.underlineWidth,
    // 언더라인은 x28에서 시작하고 글자는 x32에서 시작한다
    paddingHorizontal: Components.authInput.inset,
    paddingBottom: Components.authInput.underlineGap,
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    ...Typography.inputLarge,
    height: Components.authInput.lineHeight,
    color: Components.authInput.text,
    // 디자인 여백이 아니라 RN TextInput의 기본 안쪽 여백 제거다
    padding: 0,
  },
  inputFilled: { ...Typography.inputLargeFilled },
  clear: {
    width: Components.authInput.clearSize,
    height: Components.authInput.clearSize,
    borderRadius: Components.authInput.clearSize / 2,
    backgroundColor: Components.authInput.clearBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
