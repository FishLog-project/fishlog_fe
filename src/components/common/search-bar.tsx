import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Components, Typography } from '@/constants/theme';

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
  // Figma의 "검색 전"은 상태 이름이지 사용자에게 보여줄 문구가 아니다.
  placeholder = '장소를 검색해 보세요',
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
    ...Typography.input,
    color: Components.searchBar.active,
    padding: 0,
  },
});
