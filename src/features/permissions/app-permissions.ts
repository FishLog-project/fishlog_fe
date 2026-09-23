import type { Ionicons } from '@expo/vector-icons';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type AppPermissionKey = 'location' | 'camera' | 'notifications';

export interface AppPermission {
  key: AppPermissionKey;
  title: string;
  /** 팝업에 적는 용도. 스토어 심사에서도 이유가 분명해야 한다 */
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

/** 앱 첫 진입 팝업에서 한 번에 받는 권한. 요청도 이 순서로 한다 */
export const APP_PERMISSIONS: readonly AppPermission[] = [
  {
    key: 'location',
    title: '위치',
    description: '내 주변 낚시터와 음식점·관광지·숙박 시설을 찾아요',
    icon: 'location-outline',
  },
  {
    key: 'camera',
    title: '카메라',
    description: '잡은 물고기를 촬영해 도감에 등록해요',
    icon: 'camera-outline',
  },
  {
    key: 'notifications',
    title: '알림',
    description: '낚시 정보와 활동 소식을 알려 드려요',
    icon: 'notifications-outline',
  },
];

interface PermissionStatus {
  granted: boolean;
  /** false 면 OS 가 더 이상 권한 창을 띄워 주지 않는다 */
  canAskAgain: boolean;
}

/**
 * 안드로이드 13 이상은 알림 채널이 하나라도 있어야 알림 권한 창이 뜬다.
 * 요청 직전에 기본 채널을 만든다.
 */
async function ensureNotificationChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: '기본 알림',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

const handlers: Record<
  AppPermissionKey,
  { get: () => Promise<PermissionStatus>; request: () => Promise<PermissionStatus> }
> = {
  location: {
    get: () => Location.getForegroundPermissionsAsync(),
    request: () => Location.requestForegroundPermissionsAsync(),
  },
  camera: {
    get: () => Camera.getCameraPermissionsAsync(),
    request: () => Camera.requestCameraPermissionsAsync(),
  },
  notifications: {
    get: () => Notifications.getPermissionsAsync(),
    request: async () => {
      await ensureNotificationChannel();
      return Notifications.requestPermissionsAsync();
    },
  },
};

/** 아직 허용되지 않았고, OS 가 권한 창을 다시 띄워 줄 수 있는 권한만 */
export async function getRequestablePermissions(): Promise<readonly AppPermission[]> {
  const statuses = await Promise.all(
    APP_PERMISSIONS.map((permission) =>
      handlers[permission.key].get().catch((): PermissionStatus => ({ granted: false, canAskAgain: false })),
    ),
  );
  return APP_PERMISSIONS.filter((_, index) => !statuses[index].granted && statuses[index].canAskAgain);
}

/**
 * 권한 창을 하나씩 차례로 띄운다. 동시에 띄우면 OS 가 뒤의 요청을 버린다.
 * 하나가 실패하거나 거부돼도 나머지는 계속 묻는다.
 */
export async function requestPermissions(
  permissions: readonly AppPermission[],
): Promise<Record<AppPermissionKey, boolean>> {
  const result: Record<AppPermissionKey, boolean> = { location: false, camera: false, notifications: false };
  for (const permission of permissions) {
    try {
      result[permission.key] = (await handlers[permission.key].request()).granted;
    } catch {
      result[permission.key] = false;
    }
  }
  return result;
}
