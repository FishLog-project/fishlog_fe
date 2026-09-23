import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, Components, Typography } from '@/constants/theme';
import type { MyProfile } from '@/features/profile/api';

const PROFILE = Components.profile;

type Props = {
  profile: MyProfile | null;
  isGuest: boolean;
  previewUri: string | null;
  uploading: boolean;
  onChangeImage: () => void;
};

export function ProfileHeader({
  profile,
  isGuest,
  previewUri,
  uploading,
  onChangeImage,
}: Props) {
  const imageUri = previewUri ?? profile?.profileImageUrl;

  return (
    <View style={styles.identity}>
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <Ionicons name="person" size={Components.icon.avatar} color={Brand.inactive} />
          )}
        </View>
        {!isGuest ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="프로필 이미지 변경"
            disabled={uploading}
            onPress={onChangeImage}
            style={({ pressed }) => [styles.cameraButton, pressed && styles.pressed]}>
            <Image
              source={require('@/assets/images/profile/camera-button-40.svg')}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
            />
            {uploading ? (
              <ActivityIndicator size="small" color={Brand.onPrimary} />
            ) : (
              <Image
                source={require('@/assets/images/profile/camera-20.svg')}
                style={styles.cameraIcon}
                contentFit="contain"
              />
            )}
          </Pressable>
        ) : null}
      </View>

      <View style={styles.names}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {isGuest ? '게스트' : (profile?.nickname ?? '')}
          </Text>
          {!isGuest ? (
            <Image
              source={require('@/assets/images/profile/pencil-16.svg')}
              style={styles.pencilIcon}
              contentFit="contain"
            />
          ) : null}
        </View>
        <Text style={styles.email} numberOfLines={1}>
          {isGuest ? '로그인하면 기록을 저장할 수 있어요' : (profile?.email ?? '')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  identity: { alignItems: 'center', gap: PROFILE.nameGap },
  names: { alignItems: 'center', gap: PROFILE.emailGap },
  avatarWrap: { width: PROFILE.avatarSize, height: PROFILE.avatarSize },
  avatar: {
    width: PROFILE.avatarSize,
    height: PROFILE.avatarSize,
    borderRadius: PROFILE.avatarSize / 2,
    backgroundColor: Brand.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cameraButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.8 },
  cameraIcon: { width: 20, height: 20 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' },
  name: { ...Typography.profileName, color: Brand.textHeading },
  pencilIcon: { width: 16, height: 16 },
  email: { ...Typography.profileEmail, color: Brand.textMuted },
});
