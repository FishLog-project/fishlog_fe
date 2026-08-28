import { File } from 'expo-file-system';

import { apiRequest } from '@/lib/api/client';
import { type Fail, type Ok, toFail } from '@/lib/api/result';

export type MyProfile = {
  userId: number;
  email: string;
  nickname: string;
  profileImageUrl: string | null;
};

export async function getMyProfile(token: string | null): Promise<MyProfile | null> {
  try {
    return await apiRequest<MyProfile>('/api/users/me', { token });
  } catch {
    return null;
  }
}

export type ProfileImageFile = {
  uri: string;
  name: string;
  mimeType: string;
};

export type UploadProfileImageResult =
  | (Ok & { profileImageUrl: string })
  | Fail<'invalid_file'>;

export async function uploadProfileImage(
  token: string | null,
  file: ProfileImageFile,
): Promise<UploadProfileImageResult> {
  const imageFile = new File(file.uri);
  const form = new FormData();
  form.append('image', imageFile, file.name);

  try {
    const data = await apiRequest<{ profileImageUrl?: unknown }>(
      '/api/users/me/profile-image',
      { method: 'POST', token, body: form },
    );
    if (typeof data?.profileImageUrl !== 'string') {
      return {
        ok: false,
        reason: 'invalid_file',
        message: '업로드된 이미지 주소를 확인하지 못했어요.',
      };
    }
    return { ok: true, profileImageUrl: data.profileImageUrl };
  } catch (error) {
    console.error('[profile-image] upload failed', {
      error,
      uri: file.uri,
      name: file.name,
      mimeType: file.mimeType,
    });
    return toFail<'invalid_file'>(error);
  }
}
