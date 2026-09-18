import type { CatchRecord, CustomCatchRecord, DexDataSource, FishDetail, MyDex, RecentCatch } from '@/features/dex/dex-data';
import { apiRequest } from '@/lib/api/client';
import { toFail } from '@/lib/api/result';

const UNAUTHORIZED = { reason: 'unauthorized' as const, message: '로그인이 필요해요.' };

interface CustomDex {
  fishes: readonly { id: number; name: string; imageUrl: string | null; habitat: string | null; catchCount: number }[];
}

interface CustomCatchResponse extends Omit<CustomCatchRecord, 'recentCatches' | 'imageUrl'> {
  recentCatches: readonly (Omit<RecentCatch, 'catchRecordId' | 'verifiedAt'> & {
    customCatchRecordId: number;
    registeredAt: string;
  })[];
}

export function createApiDexDataSource(token: string | null): DexDataSource {
  const authed = <T>(path: string) =>
    token ? get<T>(path, token) : Promise.reject({ ok: false, ...UNAUTHORIZED });

  return {
    getMyDex: async () => {
      // 공개 도감은 만료 토큰에도 200 + 미획득으로 응답한다. 보호 조회의 401 갱신을
      // 먼저 마쳐야 일반 도감도 최신 토큰으로 조회한다. 비회원은 보호 API를 부르지 않는다.
      const custom = token ? await authed<CustomDex>('/api/collections/custom/dex') : { fishes: [] };
      const dex = await get<MyDex>('/api/collections/dex', token || undefined);
      return {
        ...dex,
        // 수기 어종은 함께 보여 주되 완성도·랭킹은 기본 도감 집계를 유지한다.
        fishes: [...dex.fishes, ...custom.fishes.map((fish) => ({
          id: fish.id,
          custom: true,
          name: fish.name,
          habitat: fish.habitat,
          imageUrl: fish.imageUrl,
          rarity: 'LOW' as const,
          caught: fish.catchCount > 0,
        }))],
      };
    },
    getFish: (id) => get<FishDetail>(`/api/fish/${id}`),
    getCatchRecord: (fishId) => authed<CatchRecord>(`/api/collections?fishId=${fishId}`),
    getCustomFish: async (customFishId) => {
      const [record, dex] = await Promise.all([
        authed<CustomCatchResponse>(`/api/collections/custom?customFishId=${customFishId}`),
        // 대표 일러스트는 목록에만 있다. 이미지 조회 실패가 저장된 기록까지 가리지 않게 한다.
        authed<CustomDex>('/api/collections/custom/dex').catch(() => null),
      ]);
      return {
        ...record,
        imageUrl: dex?.fishes.find((fish) => fish.id === customFishId)?.imageUrl ?? null,
        recentCatches: record.recentCatches.map(({ customCatchRecordId, registeredAt, ...photo }) => ({
          ...photo,
          catchRecordId: customCatchRecordId,
          verifiedAt: registeredAt,
        })),
      };
    },
  };
}

function get<T>(path: string, token?: string): Promise<T> {
  return apiRequest<T>(path, { token }).catch((e) => {
    throw toFail(e, { 401: UNAUTHORIZED });
  });
}
