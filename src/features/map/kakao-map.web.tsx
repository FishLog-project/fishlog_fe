import { StyleSheet, Text, View } from 'react-native';

import { Brand, Typography } from '@/constants/theme';

type FishlogKakaoMapProps = {
  recenterSignal: number;
};

export function FishlogKakaoMap({ recenterSignal: _recenterSignal }: FishlogKakaoMapProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>카카오맵은 앱에서 확인할 수 있어요</Text>
      <Text style={styles.description}>Android 또는 iOS 개발 빌드를 실행해 주세요.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
    backgroundColor: '#D7EAF4',
  },
  title: {
    ...Typography.body,
    color: Brand.textStrong,
    textAlign: 'center',
  },
  description: {
    ...Typography.caption,
    color: Brand.textMuted,
    textAlign: 'center',
  },
});
