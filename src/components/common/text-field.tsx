import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { Brand, Components, Typography } from '@/constants/theme';

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
 *
 * secureTextEntry 를 켜면 가입·재설정 화면(UnderlineInput)과 같은 눈 버튼이 붙는다.
 */
export const TextField = forwardRef<TextInput, Props>(function TextField(
  { value, onChangeText, placeholder, secureTextEntry, ...rest },
  ref,
) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const hidden = Boolean(secureTextEntry) && !passwordVisible;

  return (
    <View style={styles.container}>
      <TextInput
        ref={ref}
        style={[styles.input, secureTextEntry && styles.inputWithToggle]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Components.authInput.placeholder}
        secureTextEntry={hidden}
        {...rest}
      />
      {secureTextEntry ? (
        <Pressable
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={passwordVisible ? '비밀번호 숨기기' : '비밀번호 보기'}
          onPress={() => setPasswordVisible((visible) => !visible)}
          style={styles.passwordToggle}>
          <Ionicons
            name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
            size={24}
            color={Brand.textWeak}
          />
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { justifyContent: 'center' },
  input: {
    ...Typography.input,
    minHeight: Components.authInput.boxHeight,
    paddingVertical: 12,
    borderRadius: Components.authInput.boxRadius,
    backgroundColor: Components.authInput.boxBg,
    paddingHorizontal: Components.authInput.boxPaddingX,
    color: Components.authInput.text,
  },
  /** 눈 버튼과 글자가 겹치지 않도록 오른쪽을 비워 둔다 */
  inputWithToggle: { paddingRight: Components.authInput.boxPaddingX + 36 },
  passwordToggle: {
    position: 'absolute',
    right: Components.authInput.boxPaddingX - 4,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
