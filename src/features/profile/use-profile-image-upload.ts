import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { useState } from 'react';

import * as profileApi from './api';

const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;

type Options = {
  token: string | null;
  onUploaded: (profileImageUrl: string) => void;
};

export function useProfileImageUpload({ token, onUploaded }: Options) {
  const [uploading, setUploading] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pickAndUpload = async () => {
    if (!token || uploading) return;

    try {
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (picked.canceled) return;

      const asset = picked.assets[0];
      const fileSize = asset.fileSize ?? new File(asset.uri).size;
      if (!Number.isFinite(fileSize) || fileSize < 0) {
        setError('이미지 용량을 확인하지 못했어요. 다른 이미지를 선택해 주세요.');
        return;
      }
      if (fileSize > MAX_PROFILE_IMAGE_BYTES) {
        setError('5MB 이하의 이미지를 선택해 주세요.');
        return;
      }

      const mimeType = asset.mimeType ?? 'image/jpeg';
      const extension = mimeType.split('/')[1] || 'jpg';

      setUploading(true);
      setPreviewUri(asset.uri);
      setError(null);
      const result = await profileApi.uploadProfileImage(token, {
        uri: asset.uri,
        name: asset.fileName ?? `profile.${extension}`,
        mimeType,
      });

      if (!result.ok) {
        setPreviewUri(null);
        setError(result.message);
        return;
      }

      onUploaded(result.profileImageUrl);
      setPreviewUri(null);
    } catch {
      setPreviewUri(null);
      setError('이미지를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setUploading(false);
    }
  };

  return {
    uploading,
    previewUri,
    error,
    clearError: () => setError(null),
    pickAndUpload,
  };
}
