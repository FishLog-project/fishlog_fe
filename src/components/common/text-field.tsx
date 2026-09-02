import { forwardRef } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { Components, Typography } from '@/constants/theme';

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
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
 * 박스형 입력 — 로그인 화면 (Figma 634:2558).
 * 회원가입 스텝의 언더라인형이 필요하면 UnderlineInput을 쓴다.
 */
export const TextField = forwardRef<TextInput, Props>(function TextField(
  { value, onChangeText, placeholder, ...rest },
  ref,
) {
  return (
    <TextInput
      ref={ref}
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={Components.authInput.placeholder}
      {...rest}
    />
  );
});

const styles = StyleSheet.create({
  input: {
    ...Typography.input,
    height: Components.authInput.boxHeight,
    borderRadius: Components.authInput.boxRadius,
    backgroundColor: Components.authInput.boxBg,
    paddingHorizontal: Components.authInput.boxPaddingX,
    color: Components.authInput.text,
  },
});
