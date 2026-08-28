import * as ImagePicker from 'expo-image-picker';
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

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (picked.canceled) return;

    const asset = picked.assets[0];
    if (asset.fileSize !== undefined && asset.fileSize > MAX_PROFILE_IMAGE_BYTES) {
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
    setUploading(false);

    if (!result.ok) {
      setPreviewUri(null);
      setError(result.message);
      return;
    }

    onUploaded(result.profileImageUrl);
    setPreviewUri(null);
  };

  return {
    uploading,
    previewUri,
    error,
    clearError: () => setError(null),
    pickAndUpload,
  };
}
