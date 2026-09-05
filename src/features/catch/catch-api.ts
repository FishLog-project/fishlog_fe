import { File } from 'expo-file-system';

import type {
  CatchDataSource,
  ClassifyResponse,
  FishDetailResponse,
  SpeciesOption,
  VerifyResponse,
} from '@/features/catch/catch-data';
import { apiRequest } from '@/lib/api/client';
import { toFail } from '@/lib/api/result';

const UNAUTHORIZED = { reason: 'unauthorized' as const, message: '로그인이 필요해요.' };

export function createApiCatchDataSource(token: string | null): CatchDataSource {
  const authed = <T>(path: string, body?: FormData) =>
    token
      ? request<T>(path, token, body)
      : Promise.reject({ ok: false, ...UNAUTHORIZED });

  return {
    classify: (photoUri) => authed<ClassifyResponse>('/api/collections/classify', imageForm(photoUri)),
    verify: ({ fishId, size, photoUri, location }) => {
      const query = new URLSearchParams({ fishId: String(fishId), size: String(size) });
      if (location) query.set('location', location);
      return authed<VerifyResponse>(`/api/collections/verify?${query}`, imageForm(photoUri));
    },
    getFish: (fishId) => request<FishDetailResponse>(`/api/fish/${fishId}`),
    listSpecies: () =>
      authed<{ fishes: readonly SpeciesOption[] }>('/api/collections/dex').then((dex) =>
        dex.fishes.map(({ id, name }) => ({ id, name })),
      ),
  };
}

function imageForm(uri: string) {
  const form = new FormData();
  form.append('image', new File(uri), 'catch.jpg');
  return form;
}

function request<T>(path: string, token?: string, body?: FormData): Promise<T> {
  return apiRequest<T>(path, { method: body ? 'POST' : 'GET', token, body }).catch((e) => {
    throw toFail(e, { 401: UNAUTHORIZED });
  });
}
