import * as Location from 'expo-location';

import { isValidCoords } from '@/features/map/geo';
import type { Coords } from '@/features/map/tour-data';

/**
 * 지도가 쓰는 현재 위치.
 *
 * 실측(SM-A165N)에서 새 측정은 0.02초에 끝나기도 하고 4초 넘게 걸리기도 했다.
 * 버튼마다 새 측정을 기다리면 "눌러도 안 움직이는" 것처럼 보여서 이렇게 나눈다.
 * - 바로 쓸 좌표: 앱이 이미 구한 값 → 기기의 마지막 위치. 기다리지 않고 카메라를 옮긴다.
 * - 새 측정: 동시에 하나만 돈다. 진행 중에 또 부르면 같은 요청을 함께 기다린다.
 * - 권한: 한 번 허용되면 다시 묻지 않는다 (허용 상태에서도 매번 0.1~0.4초가 들었다).
 */

/** 이 시간보다 오래된 기기 위치는 새 측정 없이 쓰지 않는다 */
const MAX_FIX_AGE_MS = 60_000;
/** 새 측정이 이보다 오래 걸리면 실패로 보고, 받아 둔 좌표를 그대로 둔다 */
const FIX_TIMEOUT_MS = 10_000;

let permissionGranted = false;
let latest: Coords | null = null;
let inflight: Promise<Coords> | null = null;

function toCoords(position: Location.LocationObject | null): Coords | null {
  if (!position) return null;
  const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
  return isValidCoords(coords) ? coords : null;
}

async function ensurePermission(): Promise<boolean> {
  if (permissionGranted) return true;
  const permission = await Location.requestForegroundPermissionsAsync();
  permissionGranted = permission.granted;
  return permissionGranted;
}

/** 기다리지 않고 쓸 수 있는 좌표. 없거나 권한이 없으면 null */
export async function getQuickLocation(): Promise<Coords | null> {
  if (latest) return latest;
  if (!(await ensurePermission())) return null;

  const known = await Location.getLastKnownPositionAsync({ maxAge: MAX_FIX_AGE_MS }).catch(() => null);
  // 기다리는 사이 새 측정이 먼저 끝났으면 그 값이 더 정확하다
  latest ??= toCoords(known);
  return latest;
}

/** 새로 측정한 좌표. 권한이 없거나 측정에 실패하면 reject 한다 */
export function requestFreshLocation(): Promise<Coords> {
  inflight ??= measure().finally(() => {
    inflight = null;
  });
  return inflight;
}

async function measure(): Promise<Coords> {
  if (!(await ensurePermission())) throw new Error('위치 권한이 없어요.');

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('위치 측정이 늦어지고 있어요.')), FIX_TIMEOUT_MS);
  });

  try {
    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      timeout,
    ]);
    const coords = toCoords(position);
    if (!coords) throw new Error('현재 위치를 확인하지 못했어요.');
    latest = coords;
    return coords;
  } catch (error) {
    // 설정에서 권한을 거둔 경우 다음 호출에서 다시 묻도록 한다
    permissionGranted = false;
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
