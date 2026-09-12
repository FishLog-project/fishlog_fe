import type {
  CatchHistory,
  CatchHistoryDataSource,
} from '@/features/catch/catch-history-data';
import { apiRequest } from '@/lib/api/client';
import { toFail } from '@/lib/api/result';

const UNAUTHORIZED = { reason: 'unauthorized' as const, message: '로그인이 필요해요.' };

/** GET /api/collections/records — 내 인증 기록 전체. 로그인 필요 */
export function createApiCatchHistoryDataSource(token: string | null): CatchHistoryDataSource {
  return {
    getHistory: () =>
      token
        ? apiRequest<CatchHistory>('/api/collections/records', { token }).catch((e) => {
            throw toFail(e, { 401: UNAUTHORIZED });
          })
        : Promise.reject({ ok: false, ...UNAUTHORIZED }),
  };
}
