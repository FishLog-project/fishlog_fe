import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { Components, Palette } from '@/constants/theme';

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  onClear?: () => void;
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
>;

/**
 * 회원가입 스텝의 언더라인형 입력.
 * 비어있음: 회색 언더라인 / 포커스·입력됨: 파란 언더라인 + 우측 clear(X) 버튼.
 */
export const UnderlineInput = forwardRef<TextInput, Props>(function UnderlineInput(
  { value, onChangeText, placeholder, onClear, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;

  return (
    <View
      style={[
        styles.container,
        { borderBottomColor: active ? Components.authInput.underlineActive : Components.authInput.underline },
      ]}>
      <TextInput
        ref={ref}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={Components.authInput.placeholder}
        {...rest}
      />
      {value.length > 0 && (
        <Pressable
          hitSlop={10}
          onPress={() => (onClear ? onClear() : onChangeText(''))}
          style={styles.clear}>
          <Ionicons name="close" size={14} color={Palette.font.white} />
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    paddingBottom: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '400',
    color: Components.authInput.text,
    padding: 0,
  },
  clear: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Components.authInput.clearBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
