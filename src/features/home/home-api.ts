import type {
  CollectionProgress,
  FishLogDataSource,
  PopularSpot,
  SeasonalFish,
} from '@/features/home/home-data';
import { apiRequest } from '@/lib/api/client';

/** 게스트는 도감 진행도를 서버에 묻지 않고 바로 실패시킨다. 안내 문구는 화면이 토큰 유무로 고른다 */
export function createApiFishLogDataSource(token: string | null): FishLogDataSource {
  return {
    getSeasonalFish: () => apiRequest<SeasonalFish[]>('/api/banner/seasonal-fish'),
    getCollectionProgress: () =>
      token
        ? apiRequest<CollectionProgress>('/api/collections/dex', { token })
        : Promise.reject(new Error('로그인이 필요해요.')),
    getPopularSpots: () => apiRequest<PopularSpot[]>('/api/spots/popular'),
  };
}
