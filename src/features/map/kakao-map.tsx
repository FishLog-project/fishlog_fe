import { KakaoMap, KakaoMapView } from '@react-native-kakao/map';
import Constants from 'expo-constants';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Brand, Typography } from '@/constants/theme';
import { distanceMeters } from '@/features/map/geo';
import { getQuickLocation, requestFreshLocation } from '@/features/map/location-store';
import type { ZonePolygonProps } from '@/features/map/prohibited-zones';

const DEFAULT_CAMERA = {
  lat: 33.3617,
  lng: 126.5292,
  zoomLevel: 8,
};

const CURRENT_LOCATION_ZOOM = 9;
const SEARCH_LOCATION_ZOOM = 15;
/** 먼저 옮긴 좌표와 새로 잰 좌표가 이만큼 벌어지면 카메라를 한 번 더 옮긴다 */
const REFINE_DISTANCE_M = 50;
const CAMERA_ANIMATION_MS = 150;

/** 기본값을 매 렌더 새로 만들지 않도록 모듈 상수로 둔다 */
const EMPTY_SPOTS: readonly SpotMarker[] = [];
const EMPTY_TOURS: readonly TourMarker[] = [];
const EMPTY_ZONES: readonly ZonePolygonProps[] = [];

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

export interface TourMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export type FishlogKakaoMapProps = {
  recenterSignal: number;
  /** 지도에 찍을 낚시 스팟. 아직 목록을 못 받았으면 빈 배열을 넘긴다 */
  spots?: readonly SpotMarker[];
  onSpotPress?: (spotId: number) => void;
  tourPlaces?: readonly TourMarker[];
  onTourPress?: (tourId: string) => void;
  /** 검색에서 고른 스팟으로 카메라를 옮긴다. nonce 가 바뀔 때만 움직인다 */
  /** zoomLevel 을 주면 검색 기본 줌 대신 그 값으로 옮긴다 (금지 구역 전국 보기 등) */
  focus?: { lat: number; lng: number; nonce: number; zoomLevel?: number } | null;
  /** 카메라 이동(드래그·버튼·검색)이 끝났을 때의 지도 중심 */
  onCameraIdle?: (center: Coordinate & { zoomLevel: number }) => void;
  /** 지도의 빈 곳을 눌렀을 때 (마커를 누른 경우는 오지 않는다) */
  onMapPress?: () => void;
  /** 낚시 금지 구역 폴리곤. 빈 배열이면 그리지 않는다 */
  zones?: readonly ZonePolygonProps[];
};

export function FishlogKakaoMap({
  recenterSignal,
  spots = EMPTY_SPOTS,
  onSpotPress,
  tourPlaces = EMPTY_TOURS,
  onTourPress,
  focus,
  onCameraIdle,
  onMapPress,
  zones = EMPTY_ZONES,
}: FishlogKakaoMapProps) {
  const nativeAppKey = Constants.expoConfig?.extra?.kakaoNativeAppKey;
  const hasNativeAppKey = typeof nativeAppKey === 'string' && nativeAppKey.length > 0;
  const [status, setStatus] = useState<MapStatus>(hasNativeAppKey ? 'initializing' : 'error');
  const [camera, setCamera] = useState<CameraState>(DEFAULT_CAMERA);
  const [currentLocation, setCurrentLocation] = useState<Coordinate | undefined>(undefined);
  const cameraRequest = useRef(0);
  const markers = useMemo(() => [
    ...spots.map((spot) => ({ ...spot, id: `spot:${spot.id}`, kind: 'spot' })),
    ...tourPlaces.map((place) => ({ ...place, id: `tour:${place.id}`, kind: 'tour' })),
  ], [spots, tourPlaces]);

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
   * 진입할 때와 현재 위치 버튼을 누를 때마다 현재 위치로 옮긴다.
   *
   * 새 측정을 기다리지 않고 받아 둔 좌표로 먼저 옮긴 뒤, 새로 잰 좌표가 충분히 다를 때만
   * 한 번 더 옮긴다. 버튼을 연달아 눌러도 새 측정은 하나만 돌고, 누를 때마다 바로 움직인다.
   */
  useLayoutEffect(() => {
    let active = true;

    const request = ++cameraRequest.current;

    // nonce 를 함께 넘긴다. 사용자가 지도를 옮긴 뒤 버튼을 눌러도 좌표가 이전과 같으면
    // Fabric 이 prop 변화를 값으로 비교해 걸러내므로, 이 값이 바뀌어야 카메라가 다시 이동한다.
    // 검색 focus 의 nonce(양수)와 겹치지 않게 음수를 쓴다.
    const moveTo = (coordinate: Coordinate, step: 1 | 2) => {
      setCurrentLocation(coordinate);
      if (request !== cameraRequest.current) return;
      setCamera({ ...coordinate, zoomLevel: CURRENT_LOCATION_ZOOM, nonce: -(recenterSignal * 2 + step) });
    };

    const moveToCurrentLocation = async () => {
      const quick = await getQuickLocation();
      if (!active) return;
      if (quick) moveTo(quick, 1);

      const fresh = await requestFreshLocation();
      if (!active) return;
      if (!quick || distanceMeters(quick, fresh) > REFINE_DISTANCE_M) moveTo(fresh, 2);
      else setCurrentLocation(fresh);
    };

    moveToCurrentLocation().catch(() => {
      // 새 측정에 실패해도 먼저 옮긴 좌표(없으면 기본 위치)로 지도를 계속 제공한다.
    });

    return () => {
      active = false;
    };
  }, [recenterSignal]);

  // 검색은 이미 진행 중인 GPS의 카메라 이동만 무효화한다. 위치 점 갱신은 계속한다.
  const focusNonce = focus?.nonce;
  useLayoutEffect(() => {
    if (focusNonce === undefined) return;
    cameraRequest.current += 1;
  }, [focusNonce]);

  const [appliedFocus, setAppliedFocus] = useState<number | null>(null);
  if (focus && focus.nonce !== appliedFocus) {
    setAppliedFocus(focus.nonce);
    setCamera({ lat: focus.lat, lng: focus.lng, zoomLevel: focus.zoomLevel ?? SEARCH_LOCATION_ZOOM, nonce: focus.nonce });
  }

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
      spots={markers}
      zones={zones}
      onSpotPress={({ nativeEvent: { id } }) => {
        if (id.startsWith('tour:')) onTourPress?.(id.slice(5));
        else if (id.startsWith('spot:')) {
          const spotId = Number(id.slice(5));
          if (Number.isSafeInteger(spotId)) onSpotPress?.(spotId);
        }
      }}
      onCameraIdle={(event) => onCameraIdle?.(event.nativeEvent)}
      onMapPress={() => onMapPress?.()}
      cameraAnimationDuration={CAMERA_ANIMATION_MS}
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
