import type { Coords } from '@/features/map/tour-data';

/** ponytail: 기본 반경 5km의 직선거리 근사. 광역 탐색을 붙이면 구면 거리로 교체한다 */
export function offsetMeters(origin: Coords, target: Coords) {
  const dy = (target.lat - origin.lat) * 111_320;
  const dx = (target.lng - origin.lng) * 111_320 * Math.cos((origin.lat * Math.PI) / 180);
  return { dx, dy };
}

export function distanceMeters(origin: Coords, target: Coords) {
  const { dx, dy } = offsetMeters(origin, target);
  return Math.hypot(dx, dy);
}

/** "850m" · "1.2km" */
export function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}
