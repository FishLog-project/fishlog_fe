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

const CURRENT_LOCATION_ZOOM = 9;
const SEARCH_LOCATION_ZOOM = 15;

/** 기본값을 매 렌더 새로 만들지 않도록 모듈 상수로 둔다 */
const EMPTY_SPOTS: readonly SpotMarker[] = [];

let kakaoMapInitialization: Promise<unknown> | undefined;

function initializeKakaoMap(nativeAppKey: string) {
  kakaoMapInitialization ??= KakaoMap.initializeKakaoMapSDK(nativeAppKey);
  return kakaoMapInitialization;
}

type MapStatus = 'initializing' | 'ready' | 'error';

type Coordinate = { lat: number; lng: number };

/** nonce 는 같은 좌표로 다시 이동시킬 때만 쓰는 갱신 토큰이다. */
type CameraState = Coordinate & { zoomLevel: number; nonce?: number };

export interface SpotMarker {
  id: number;
  /** 마커 위에 함께 그리는 낚시터 이름 (Figma 634:1675) */
  name: string;
  lat: number;
  lng: number;
}

type FishlogKakaoMapProps = {
  recenterSignal: number;
  /** 지도에 찍을 낚시 스팟. 아직 목록을 못 받았으면 빈 배열을 넘긴다 */
  spots?: readonly SpotMarker[];
  onSpotPress?: (spotId: number) => void;
  /** 검색에서 고른 스팟으로 카메라를 옮긴다. nonce 가 바뀔 때만 움직인다 */
  focus?: { lat: number; lng: number; nonce: number } | null;
};

export function FishlogKakaoMap({
  recenterSignal,
  spots = EMPTY_SPOTS,
  onSpotPress,
  focus,
}: FishlogKakaoMapProps) {
  const nativeAppKey = Constants.expoConfig?.extra?.kakaoNativeAppKey;
  const hasNativeAppKey = typeof nativeAppKey === 'string' && nativeAppKey.length > 0;
  const [status, setStatus] = useState<MapStatus>(hasNativeAppKey ? 'initializing' : 'error');
  const [camera, setCamera] = useState<CameraState>(DEFAULT_CAMERA);
  const [currentLocation, setCurrentLocation] = useState<Coordinate | undefined>(undefined);

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

  /**
   * 검색에서 고른 스팟으로 이동한다.
   *
   * effect 가 아니라 렌더 중에 맞춘다 — 바깥에서 내려온 focus 에 카메라를 맞추는
   * 경우라 effect 로 두면 한 번 그린 뒤 다시 그리게 된다.
   * nonce 를 그대로 실어 보내 같은 스팟을 다시 골라도 움직이게 한다.
   */
  const [appliedFocus, setAppliedFocus] = useState<number | null>(null);

  if (focus && focus.nonce !== appliedFocus) {
    setAppliedFocus(focus.nonce);
    setCamera({
      lat: focus.lat,
      lng: focus.lng,
      zoomLevel: SEARCH_LOCATION_ZOOM,
      nonce: focus.nonce,
    });
  }

  useEffect(() => {
    let active = true;

    const moveToCurrentLocation = async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!active || permission.status !== Location.PermissionStatus.GRANTED) return;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (!active) return;

      const coordinate: Coordinate = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };

      setCurrentLocation(coordinate);
      // nonce 를 함께 넘긴다. 사용자가 지도를 옮긴 뒤 버튼을 눌러도 좌표가 이전과 같으면
      // Fabric 이 prop 변화를 값으로 비교해 걸러내므로, 이 값이 바뀌어야 카메라가 다시 이동한다.
      setCamera({ ...coordinate, zoomLevel: CURRENT_LOCATION_ZOOM, nonce: recenterSignal });
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
      currentLocation={currentLocation}
      spots={spots}
      onSpotPress={(event) => onSpotPress?.(event.nativeEvent.id)}
      cameraAnimationDuration={300}
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
