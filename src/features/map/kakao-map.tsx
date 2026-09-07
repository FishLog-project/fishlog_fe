import { KakaoMap, KakaoMapView } from '@react-native-kakao/map';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Brand, Typography } from '@/constants/theme';

const DEFAULT_CAMERA = {
  lat: 33.3617,
  lng: 126.5292,
  zoomLevel: 8,
};

const CURRENT_LOCATION_ZOOM = 15;

let kakaoMapInitialization: Promise<unknown> | undefined;

function initializeKakaoMap(nativeAppKey: string) {
  kakaoMapInitialization ??= KakaoMap.initializeKakaoMapSDK(nativeAppKey);
  return kakaoMapInitialization;
}

type MapStatus = 'initializing' | 'ready' | 'error';

type FishlogKakaoMapProps = {
  recenterSignal: number;
};

export function FishlogKakaoMap({ recenterSignal }: FishlogKakaoMapProps) {
  const nativeAppKey = Constants.expoConfig?.extra?.kakaoNativeAppKey;
  const hasNativeAppKey = typeof nativeAppKey === 'string' && nativeAppKey.length > 0;
  const [status, setStatus] = useState<MapStatus>(hasNativeAppKey ? 'initializing' : 'error');
  const [camera, setCamera] = useState(DEFAULT_CAMERA);

  useEffect(() => {
    let active = true;

    if (!hasNativeAppKey) return;

    initializeKakaoMap(nativeAppKey)
      .then(() => {
        if (active) setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [hasNativeAppKey, nativeAppKey]);

  useEffect(() => {
    let active = true;

    const moveToCurrentLocation = async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!active || permission.status !== Location.PermissionStatus.GRANTED) return;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (!active) return;

      setCamera({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        zoomLevel: CURRENT_LOCATION_ZOOM,
      });
    };

    moveToCurrentLocation().catch(() => {
      // 위치를 확인할 수 없는 경우 기본 위치로 지도를 계속 제공한다.
    });

    return () => {
      active = false;
    };
  }, [recenterSignal]);

  if (status === 'initializing') {
    return (
      <View style={styles.messageContainer}>
        <ActivityIndicator color={Brand.primary} />
        <Text style={styles.message}>지도를 불러오는 중이에요</Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={styles.messageContainer}>
        <Text style={styles.errorTitle}>지도를 불러오지 못했어요</Text>
        <Text style={styles.message}>카카오 앱 키와 개발 빌드를 확인해 주세요.</Text>
      </View>
    );
  }

  return (
    <KakaoMapView
      style={StyleSheet.absoluteFill}
      camera={camera}
      cameraMinLevel={1}
      cameraMaxLevel={20}
      language="ko"
      poiEnabled
      poiClickable
      isShowCompass={false}
      isShowScaleBar={false}
    />
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
    backgroundColor: '#D7EAF4',
  },
  errorTitle: {
    ...Typography.body,
    color: Brand.textStrong,
    textAlign: 'center',
  },
  message: {
    ...Typography.caption,
    color: Brand.textMuted,
    textAlign: 'center',
  },
});
