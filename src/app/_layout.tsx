import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Colors } from '@/constants/theme';

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: Colors.background },
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          headerTintColor: Colors.text,
          headerTitleAlign: 'center',
          headerTitleStyle: { fontSize: 17, fontWeight: '700' },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="spot/[spotId]" options={{ title: '스팟 상세' }} />
        <Stack.Screen name="species/[speciesId]" options={{ title: '어종 상세' }} />
        <Stack.Screen name="catch/verify" options={{ title: '낚시 인증' }} />
        <Stack.Screen name="states" options={{ title: '공통 상태' }} />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
