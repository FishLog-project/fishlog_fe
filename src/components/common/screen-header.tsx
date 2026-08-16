import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, Layout, Typography } from '@/constants/theme';

type ScreenHeaderProps = {
  title?: string;
  /** brand는 홈 탭의 큰 로고 타이틀, default는 일반 화면 타이틀 */
  variant?: 'default' | 'brand';
  showBack?: boolean;
  /** 뒤로가기 기본 동작(router.back) 대신 쓸 핸들러 */
  onBack?: () => void;
  /** 우측 슬롯 (설정 버튼 등) */
  right?: ReactNode;
};

/**
 * 모든 화면 공통 상단 헤더.
 *
 * 좌·우 슬롯을 같은 폭으로 두고 타이틀은 flex로 남은 공간을 채워 가운데 정렬한다.
 * 좌표를 직접 잡지 않으므로 좌우 버튼이 늘거나 줄어도 타이틀이 틀어지지 않는다.
 */
export function ScreenHeader({
  title,
  variant = 'default',
  showBack = false,
  onBack,
  right,
}: ScreenHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <View style={styles.side}>
        {showBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="뒤로 가기"
            hitSlop={12}
            onPress={onBack ?? (() => router.back())}>
            <Ionicons name="chevron-back" size={26} color={Brand.textStrong} />
          </Pressable>
        ) : null}
      </View>

      {title ? (
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={variant === 'brand' ? styles.brand : styles.title}>
          {title}
        </Text>
      ) : (
        <View style={styles.fill} />
      )}

      <View style={[styles.side, styles.sideRight]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: Layout.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.screenPadding,
  },
  /** 좌우 슬롯을 같은 폭으로 잡아야 가운데 타이틀이 실제로 가운데에 온다 */
  side: { width: 40, justifyContent: 'center' },
  sideRight: { alignItems: 'flex-end' },
  fill: { flex: 1 },
  title: {
    flex: 1,
    textAlign: 'center',
    ...Typography.header,
    color: Brand.textStrong,
  },
  brand: {
    ...Typography.brand,
    flex: 1,
    textAlign: 'center',
    color: Brand.primary,
  },
});
