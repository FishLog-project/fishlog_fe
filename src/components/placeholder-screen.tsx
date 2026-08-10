import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/common';
import { Brand, Typography } from '@/constants/theme';

type Props = {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
};

/**
 * ⚠️ 임시 컴포넌트 — 실제 화면이 들어오면 삭제한다.
 *
 * 아직 구현 전인 탭(기록·랭킹·프로필)의 자리를 채우기만 하는 용도다.
 * 각 탭이 실제 화면으로 교체되면 이 파일과 남은 사용처를 함께 지운다.
 */
export function PlaceholderScreen({ title, icon }: Props) {
  return (
    <Screen>
      <View style={styles.body}>
        <Ionicons name={icon} size={56} color={Brand.inactive} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>준비 중이에요</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: { ...Typography.sectionTitle, fontSize: 20, color: Brand.primaryDark },
  sub: { ...Typography.caption, fontWeight: '400', color: Brand.textMuted },
});
