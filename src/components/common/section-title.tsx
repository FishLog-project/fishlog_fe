import { StyleSheet, Text } from 'react-native';

import { Brand, Typography } from '@/constants/theme';

/**
 * Common/SectionTitle — 화면 안에서 묶음을 나누는 제목.
 * ("나의 순위" · "전체 순위" 처럼 목록 위에 얹는 한 줄)
 */
export function SectionTitle({ children }: { children: string }) {
  return (
    <Text accessibilityRole="header" style={styles.title}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: { ...Typography.sectionTitle, color: Brand.textHeading },
});
