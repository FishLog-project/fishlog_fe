import { Tabs } from 'expo-router';
import { StyleSheet, Text, type ColorValue } from 'react-native';

import { Colors } from '@/constants/theme';

type TabIconProps = {
  color: ColorValue;
  symbol: string;
};

function TabIcon({ color, symbol }: TabIconProps) {
  return <Text style={[styles.icon, { color }]}>{symbol}</Text>;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: Colors.background },
        tabBarActiveTintColor: Colors.primary,
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.tabBar,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '메인',
          tabBarAccessibilityLabel: '메인 탭',
          tabBarIcon: ({ color }) => <TabIcon color={color} symbol="⌂" />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: '지도',
          tabBarAccessibilityLabel: '지도 탭',
          tabBarIcon: ({ color }) => <TabIcon color={color} symbol="⌖" />,
        }}
      />
      <Tabs.Screen
        name="dex"
        options={{
          title: '도감',
          tabBarAccessibilityLabel: '도감 탭',
          tabBarIcon: ({ color }) => <TabIcon color={color} symbol="▤" />,
        }}
      />
      <Tabs.Screen
        name="my"
        options={{
          title: '마이',
          tabBarAccessibilityLabel: '마이 탭',
          tabBarIcon: ({ color }) => <TabIcon color={color} symbol="○" />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  icon: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
  },
});
