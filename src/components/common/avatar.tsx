import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Components } from '@/constants/theme';

const AVATAR = Components.avatar;

type Props = {
  /** 프로필 사진 URL. 없으면 사람 아이콘으로 대체한다 */
  uri?: string | null;
  /** 지름 */
  size: number;
  accessibilityLabel?: string;
};

/**
 * Common/Avatar — 둥근 프로필 사진.
 *
 * 크기는 쓰는 쪽이 정한다(랭킹 카드 52, 목록 40). 사진이 아직 없거나
 * 불러오지 못했을 때 빈 원이 남지 않도록 사람 아이콘으로 대체한다.
 */
export function Avatar({ uri, size, accessibilityLabel }: Props) {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[styles.base, { width: size, height: size, borderRadius: size / 2 }]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <Ionicons
          name="person"
          size={Math.round(size * AVATAR.fallbackIconRatio)}
          color={AVATAR.fallbackIcon}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AVATAR.fallbackBg,
  },
});
