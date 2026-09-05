import type {
  CollectionProgress,
  FishLogDataSource,
  PopularSpot,
  SeasonalFish,
} from '@/features/home/home-data';
import { apiRequest } from '@/lib/api/client';
import { toFail } from '@/lib/api/result';

const UNAUTHORIZED = { reason: 'unauthorized' as const, message: '로그인이 필요해요.' };

/** 실패는 result.ts의 Fail 객체로 reject 한다. 게스트·401은 reason 'unauthorized' */
export function createApiFishLogDataSource(token: string | null): FishLogDataSource {
  return {
    getSeasonalFish: () => get<SeasonalFish[]>('/api/banner/seasonal-fish'),
    getCollectionProgress: () =>
      token
        ? get<CollectionProgress>('/api/collections/dex', token)
        : Promise.reject({ ok: false, ...UNAUTHORIZED }),
    getPopularSpots: (limit) =>
      get<PopularSpot[]>('/api/spots/popular').then((spots) => spots.slice(0, limit)),
  };
}

function get<T>(path: string, token?: string): Promise<T> {
  return apiRequest<T>(path, { token }).catch((e) => {
    throw toFail(e, { 401: UNAUTHORIZED });
  });
}
