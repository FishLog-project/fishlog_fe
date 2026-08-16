import { Image } from 'expo-image';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand, Layout } from '@/constants/theme';

/**
 * 탭 순서·아이콘·스크린리더 이름.
 *
 * 아이콘은 Figma에서 내보낸 활성/비활성 두 벌을 통째로 교체한다.
 * (tintColor로 색만 바꾸는 방식이 아니다 — 디자인상 활성 아이콘은 색뿐 아니라
 *  채움/형태가 달라서 색조 변경으로는 재현되지 않는다)
 *
 * `leaf`는 36pt 아이콘 칸 안에서 실제 그림이 차지하는 크기다.
 * 프로필만 27pt짜리 아이콘을 칸 안에 넣는 구조라 따로 잡아 준다.
 */
const TABS = [
  {
    name: 'home',
    label: '홈',
    leaf: 36,
    active: require('@/assets/images/tabs/home-active.svg'),
    inactive: require('@/assets/images/tabs/home-inactive.svg'),
  },
  {
    name: 'map',
    label: '지도',
    leaf: 36,
    active: require('@/assets/images/tabs/map-active.svg'),
    inactive: require('@/assets/images/tabs/map-inactive.svg'),
  },
  {
    name: 'log',
    label: '기록',
    leaf: 36,
    active: require('@/assets/images/tabs/log-active.svg'),
    inactive: require('@/assets/images/tabs/log-inactive.svg'),
  },
  {
    name: 'ranking',
    label: '랭킹',
    leaf: 36,
    active: require('@/assets/images/tabs/rank-active.svg'),
    inactive: require('@/assets/images/tabs/rank-inactive.svg'),
  },
  {
    name: 'profile',
    label: '프로필',
    leaf: 27,
    active: require('@/assets/images/tabs/profile-active.svg'),
    inactive: require('@/assets/images/tabs/profile-inactive.svg'),
  },
] as const;

/**
 * 하단 탭 네비게이터 (Figma TabBar 72:1576).
 * 5탭: 홈 · 지도 · 기록 · 랭킹 · 프로필 — 아이콘 전용, 라벨 없음.
 */
export default function TabsLayout() {
  // 안드로이드 제스처 바 / 3버튼 네비게이션 바 높이. 기기마다 달라서
  // 고정값을 쓰면 탭 아이콘이 OS 네비게이션 바에 가린다.
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          height: Layout.tabBarHeight + insets.bottom,
          paddingBottom: insets.bottom,
          borderTopWidth: 0,
          backgroundColor: Brand.background,
          elevation: 8,
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -2 },
        },
        // 버튼 하나의 터치 영역
        tabBarItemStyle: {
          height: Layout.tabItemSize,
          alignItems: 'center',
          justifyContent: 'center',
        },
        // 아이콘 컨테이너를 아이콘 크기로 명시한다.
        // 지정하지 않으면 react-navigation 기본값(약 29dp)에 맞춰 36dp 아이콘이 잘린다.
        tabBarIconStyle: {
          width: Layout.tabIconSize,
          height: Layout.tabIconSize,
        },
      }}>
      {TABS.map(({ name, label, leaf, active, inactive }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            tabBarAccessibilityLabel: label,
            tabBarIcon: ({ focused }) => (
              <Image
                source={focused ? active : inactive}
                style={[styles.icon, { width: leaf, height: leaf }]}
                contentFit="contain"
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  /** 36pt 칸 안에서 가운데 정렬 (프로필처럼 그림이 더 작은 경우를 위해) */
  icon: { alignSelf: 'center' },
});
