import type { NearbyTours, TourDataSource } from '@/features/map/tour-data';
import { apiRequest } from '@/lib/api/client';

/** BE dev의 공개 GET. 운영 배포 뒤 연결한다 */
// ponytail: 첫 30건·기본 5km만 조회. 지도 UI 확정 후 page/hasNext와 radius를 연결한다.
export function createApiTourDataSource(): TourDataSource {
  return {
    getNearbyTours({ type, lat, lng }, signal) {
      const query = new URLSearchParams({ type, lat: String(lat), lng: String(lng) });
      return apiRequest<NearbyTours>(`/api/tours/nearby?${query.toString()}`, { signal });
    },
  };
}
