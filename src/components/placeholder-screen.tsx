import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Screen, ScreenHeader } from '@/components/common';
import { Brand, Typography } from '@/constants/theme';

type Props = {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  /** 탭이 아니라 스택으로 들어온 화면. 뒤로 가기가 있는 헤더를 단다 */
  showBack?: boolean;
};

/**
 * ⚠️ 임시 컴포넌트 — 실제 화면이 들어오면 삭제한다.
 *
 * 아직 구현 전인 화면(도감·랭킹·프로필·낚시 인증)의 자리를 채우기만 하는 용도다.
 * 각 화면이 실제 구현으로 교체되면 이 파일과 남은 사용처를 함께 지운다.
 */
export function PlaceholderScreen({ title, icon, showBack = false }: Props) {
  return (
    <Screen
      edges={showBack ? ['top', 'bottom'] : ['top']}
      header={showBack ? <ScreenHeader title={title} showBack /> : undefined}>
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
