import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import type {
  CatchDataSource,
  ClassifyResponse,
  FishDetailResponse,
  SpeciesOption,
  VerifyCustomResponse,
  VerifyResponse,
} from '@/features/catch/catch-data';
import { createApiDexDataSource } from '@/features/dex/dex-api';
import { apiRequest } from '@/lib/api/client';
import { toFail } from '@/lib/api/result';

const UNAUTHORIZED = { reason: 'unauthorized' as const, message: '로그인이 필요해요.' };

export function createApiCatchDataSource(token: string | null): CatchDataSource {
  const dex = createApiDexDataSource(token);
  const authed = <T>(path: string, body?: FormData) =>
    token
      ? request<T>(path, token, body)
      : Promise.reject({ ok: false, ...UNAUTHORIZED });

  return {
    classify: async (photoUri) =>
      authed<ClassifyResponse>('/api/collections/classify', await imageForm(photoUri)),
    verify: async ({ fishId, size, photoUri, location }) => {
      const query = new URLSearchParams({ fishId: String(fishId), size: String(size) });
      if (location) query.set('location', location);
      return authed<VerifyResponse>(`/api/collections/verify?${query}`, await imageForm(photoUri));
    },
    verifyCustom: async ({ fishName, size, photoUri, location, habitat }) => {
      const name = fishName.trim();
      const place = location?.trim();
      const water = habitat?.trim();
      if (
        !name || name.length > 30 || !photoUri.trim() ||
        !Number.isFinite(size) || size <= 0 || size > 300 ||
        (place?.length ?? 0) > 100 || (water?.length ?? 0) > 20
      ) {
        throw new Error('어종명, 크기, 위치를 확인해 주세요.');
      }
      const query = new URLSearchParams({ fishName: name, size: String(size) });
      if (place) query.set('location', place);
      if (water) query.set('habitat', water);
      return authed<VerifyCustomResponse>(`/api/collections/custom?${query}`, await imageForm(photoUri));
    },
    getFish: (fishId) => request<FishDetailResponse>(`/api/fish/${fishId}`),
    getCustomFish: dex.getCustomFish,
    listSpecies: () =>
      authed<{ fishes: readonly SpeciesOption[] }>('/api/collections/dex').then((dex) =>
        dex.fishes.map(({ id, name }) => ({ id, name })),
      ),
  };
}

async function imageForm(uri: string) {
  const form = new FormData();
  // Expo File은 웹에서 지원되지 않는다. 카메라/사진 선택기의 data·blob URI를 Blob으로 읽는다.
  const image = Platform.OS === 'web' ? await fetch(uri).then((res) => res.blob()) : new File(uri);
  form.append('image', image, 'catch.jpg');
  return form;
}

function request<T>(path: string, token?: string, body?: FormData): Promise<T> {
  return apiRequest<T>(path, { method: body ? 'POST' : 'GET', token, body }).catch((e) => {
    throw toFail(e, { 401: UNAUTHORIZED });
  });
}
