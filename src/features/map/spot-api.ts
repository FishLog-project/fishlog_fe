import type { SpotDataSource, SpotDetail, SpotSummary } from '@/features/map/spot-data';
import { apiRequest } from '@/lib/api/client';
import { toFail } from '@/lib/api/result';

const NEEDS_LOGIN = { reason: 'unauthorized' as const, message: '로그인이 필요해요.' };

/**
 * 스팟 API 어댑터.
 *
 * 지도는 로그인 여부와 무관하게 항상 GET /api/spots 를 쓴다.
 * Swagger 에는 이 엔드포인트가 인증 필요로 표기돼 있지만 실제로는 비로그인도 200 이고,
 * 92건(해양 49 / 내륙 43)을 그대로 내려준다. 토큰은 isFavorite 을 채우기 위해서만 보낸다.
 *
 * GET /api/spots/popular 는 홈이 자기 계약(features/home)으로 따로 쓴다. 지도는 쓰지 않는다.
 */
export function createApiSpotDataSource(token: string | null): SpotDataSource {
  return {
    getSpots: () => get<readonly SpotSummary[]>('/api/spots', token),
    getSpot: (spotId) => get<SpotDetail>(`/api/spots/${spotId}`, token),
    // 찜은 idempotent 라 이미 찜한 스팟을 다시 눌러도 서버가 성공으로 응답한다.
    addFavorite: (spotId) => favorite(`/api/spots/${spotId}/favorite`, 'POST', token),
    removeFavorite: (spotId) => favorite(`/api/spots/${spotId}/favorite`, 'DELETE', token),
  };
}

function get<T>(path: string, token?: string | null): Promise<T> {
  return apiRequest<T>(path, { token }).catch((e) => {
    throw toFail(e);
  });
}

function favorite(path: string, method: 'POST' | 'DELETE', token: string | null): Promise<void> {
  if (!token) return Promise.reject({ ok: false, ...NEEDS_LOGIN });

  return apiRequest<null>(path, { method, token })
    .then(() => undefined)
    .catch((e) => {
      throw toFail(e, { 401: NEEDS_LOGIN });
    });
}
