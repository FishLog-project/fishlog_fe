import { isValidCoords } from '@/features/map/geo';
import type { NearbyTours, TourDataSource } from '@/features/map/tour-data';
import { apiRequest } from '@/lib/api/client';

/** 공개 GET. 선택한 분류와 현재 위치를 전달한다. */
// ponytail: 첫 30건·기본 5km만 조회. 지도 UI 확정 후 page/hasNext와 radius를 연결한다.
export function createApiTourDataSource(): TourDataSource {
  return {
    async getNearbyTours({ type, lat, lng }, signal) {
      if (!isValidCoords({ lat, lng })) throw new Error('현재 위치를 확인할 수 없어요.');
      const query = new URLSearchParams({ type, lat: String(lat), lng: String(lng) });
      return apiRequest<NearbyTours>(`/api/tours/nearby?${query.toString()}`, { signal });
    },
  };
}
