import type { CatchRecord, DexDataSource, FishDetail, MyDex } from '@/features/dex/dex-data';
import { apiRequest } from '@/lib/api/client';
import { toFail } from '@/lib/api/result';

const UNAUTHORIZED = { reason: 'unauthorized' as const, message: '로그인이 필요해요.' };

export function createApiDexDataSource(token: string | null): DexDataSource {
  const authed = <T>(path: string) =>
    token ? get<T>(path, token) : Promise.reject({ ok: false, ...UNAUTHORIZED });

  return {
    getMyDex: () => authed<MyDex>('/api/collections/dex'),
    getFish: (id) => get<FishDetail>(`/api/fish/${id}`),
    getCatchRecord: (fishId) => authed<CatchRecord>(`/api/collections?fishId=${fishId}`),
  };
}

function get<T>(path: string, token?: string): Promise<T> {
  return apiRequest<T>(path, { token }).catch((e) => {
    throw toFail(e, { 401: UNAUTHORIZED });
  });
}
