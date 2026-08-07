import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand, Layout, Palette } from '@/constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** 활성/비활성 아이콘 쌍 (디자인: 활성=채움, 비활성=아웃라인) */
function tabIcon(active: IoniconName, inactive: IoniconName) {
  return ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <Ionicons
      name={focused ? active : inactive}
      size={Layout.tabIconSize}
      color={color}
    />
  );
}

/**
 * 하단 탭 네비게이터 (Figma TabBar 디자인).
 * 5탭: 홈 · 지도 · 기록 · 랭킹 · 프로필 — 아이콘 전용, 활성 시 브랜드 블루.
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
        tabBarActiveTintColor: Brand.primary,
        tabBarInactiveTintColor: Brand.inactive,
        tabBarStyle: {
          height: Layout.tabBarHeight + insets.bottom,
          paddingBottom: insets.bottom,
          borderTopWidth: 0,
          backgroundColor: Palette.font.white,
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
      <Tabs.Screen
        name="home"
        options={{ tabBarIcon: tabIcon('home', 'home-outline') }}
      />
      <Tabs.Screen
        name="map"
        options={{ tabBarIcon: tabIcon('map', 'map-outline') }}
      />
      <Tabs.Screen
        name="log"
        options={{ tabBarIcon: tabIcon('fish', 'fish-outline') }}
      />
      <Tabs.Screen
        name="ranking"
        options={{ tabBarIcon: tabIcon('podium', 'podium-outline') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: tabIcon('person', 'person-outline') }}
      />
    </Tabs>
  );
}
