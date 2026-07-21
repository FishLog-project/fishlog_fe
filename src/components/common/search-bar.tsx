import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Components } from '@/constants/theme';

type Props = {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
} & Pick<TextInputProps, 'onSubmitEditing' | 'autoFocus' | 'returnKeyType'>;

/**
 * SearchBar — 둥근 pill 형태의 검색 입력.
 * 검색 전(placeholder 회색) / 검색 중(입력 텍스트) 상태를 TextInput이 자동 처리.
 */
export function SearchBar({
  value,
  onChangeText,
  placeholder = '검색 전',
  ...rest
}: Props) {
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Components.searchBar.placeholder}
        {...rest}
      />
      <Ionicons name="search" size={18} color={Components.searchBar.active} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: Components.searchBar.height,
    borderRadius: Components.searchBar.radius,
    backgroundColor: Components.searchBar.bg,
    paddingHorizontal: 18,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: Components.searchBar.active,
    padding: 0,
  },
});
