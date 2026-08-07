import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, type ColorValue } from 'react-native';

import { Brand } from '@/constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** 활성/비활성 아이콘 쌍 (디자인: 활성=채움, 비활성=아웃라인) */
function tabIcon(active: IoniconName, inactive: IoniconName) {
  return ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <Ionicons name={focused ? active : inactive} size={26} color={color} />
  );
}

/**
 * 하단 탭 네비게이터 (Figma TabBar 디자인).
 * 5탭: 홈 · 지도 · 기록 · 랭킹 · 프로필 — 아이콘 전용, 활성 시 브랜드 블루.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: Brand.primary,
        tabBarInactiveTintColor: Brand.inactive,
        tabBarStyle: {
          height: Platform.select({ ios: 84, android: 64 }),
          paddingTop: 8,
          borderTopWidth: 0,
          backgroundColor: '#FFFFFF',
          elevation: 8,
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -2 },
        },
        tabBarItemStyle: { paddingVertical: 4 },
      }}>
      <Tabs.Screen
        name="index"
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
