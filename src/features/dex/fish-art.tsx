import { Image, type ImageProps } from 'expo-image';
import { useState } from 'react';

import { Components } from '@/constants/theme';

// 서버 미배포·이미지 로드 실패 때만 쓰는 공통 기본 그림. 어종별 에셋은 API가 결정한다.
const BASIC_ART = require('@/assets/images/fish/basic_image.png');

export function FishArtwork({
  imageUrl,
  locked = false,
  style,
  ...props
}: Omit<ImageProps, 'source' | 'onError'> & { imageUrl: string | null; locked?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const uri = imageUrl?.trim() || null;
  const remote = uri !== null && uri !== failedUrl;

  return (
    <Image
      {...props}
      source={remote ? uri : BASIC_ART}
      style={[style, !remote && locked && { opacity: Components.dex.silhouetteOpacity }]}
      // 서버의 컬러·그림자는 그대로 표시한다. 기본 그림에만 잠금 효과를 준다.
      tintColor={!remote && locked ? Components.dex.silhouette : props.tintColor ?? null}
      recyclingKey={uri}
      onError={() => setFailedUrl(uri)}
    />
  );
}
