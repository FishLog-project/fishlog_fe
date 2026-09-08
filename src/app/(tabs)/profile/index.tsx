import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppDialog, Screen, ScreenHeader, SettingsListItem } from '@/components/common';
import { Brand, Components, Layout, Typography } from '@/constants/theme';
import { accountApi } from '@/features/account';
import { useAuth } from '@/features/auth';
import {
  profileApi,
  ProfileHeader,
  ProfileQuickMenu,
  useProfileImageUpload,
  WithdrawDialog,
} from '@/features/profile';

const PROFILE = Components.profile;

export default function ProfileScreen() {
  const router = useRouter();
  const { token, isGuest, signOut } = useAuth();
  const [profile, setProfile] = useState<profileApi.MyProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<'logout' | 'withdraw' | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    profileApi.getMyProfile(token).then((result) => {
      if (alive) setProfile(result);
    });
    return () => {
      alive = false;
    };
  }, [token]);

  const handleUploaded = useCallback((profileImageUrl: string) => {
    setProfile((current) => current ? { ...current, profileImageUrl } : current);
  }, []);
  const imageUpload = useProfileImageUpload({ token, onUploaded: handleUploaded });

  const closeDialog = () => {
    if (busy) return;
    setDialog(null);
    setWithdrawError(null);
  };

  const handleSignOut = async () => {
    setBusy(true);
    await signOut();
    setBusy(false);
    setDialog(null);
    router.replace('/auth/login');
  };

  const handleWithdraw = async (password: string) => {
    if (!token || !password || busy) return;
    setBusy(true);
    setWithdrawError(null);
    const result = await accountApi.withdraw(token, password);
    if (!result.ok) {
      setBusy(false);
      setWithdrawError(result.message);
      return;
    }

    await signOut();
    setBusy(false);
    setDialog(null);
    router.replace('/auth/login');
  };

  return (
    <>
      <Screen
        scroll
        contentPadding={Layout.profilePadding}
        header={<ScreenHeader title="마이페이지" />}>
        <View style={styles.body}>
          <View style={styles.top}>
            <ProfileHeader
              profile={profile}
              isGuest={isGuest}
              previewUri={imageUpload.previewUri}
              uploading={imageUpload.uploading}
              onChangeImage={imageUpload.pickAndUpload}
            />
            <ProfileQuickMenu
              onOpenLog={() => router.push('/dex')}
              onOpenRanking={() => router.push('/ranking')}
            />
          </View>

          <SettingsSection label="기록">
            <SettingsListItem label="낚시 인증 기록 조회" onPress={() => router.push('/dex')} />
          </SettingsSection>

          <SettingsSection label="설정">
            {!isGuest ? (
              <SettingsListItem
                label="비밀번호 재설정"
                onPress={() => router.push('/settings/password')}
              />
            ) : null}
            <SettingsListItem
              label="로그아웃"
              disabled={busy}
              onPress={() => setDialog('logout')}
            />
            {!isGuest && token ? (
              <SettingsListItem
                label="계정 탈퇴"
                disabled={busy}
                onPress={() => setDialog('withdraw')}
              />
            ) : null}
          </SettingsSection>
        </View>
      </Screen>

      <AppDialog
        visible={imageUpload.error !== null}
        title="이미지를 업로드하지 못했어요"
        message={imageUpload.error ?? undefined}
        onConfirm={imageUpload.clearError}
      />
      <AppDialog
        visible={dialog === 'logout'}
        title="로그아웃하시겠어요?"
        message="로그인 화면으로 이동합니다."
        buttonLabel="로그아웃"
        loading={busy}
        onConfirm={handleSignOut}
        onCancel={closeDialog}
      />
      <WithdrawDialog
        visible={dialog === 'withdraw'}
        loading={busy}
        error={withdrawError}
        onConfirm={handleWithdraw}
        onCancel={closeDialog}
        onInput={() => setWithdrawError(null)}
      />
    </>
  );
}

function SettingsSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingTop: PROFILE.avatarTop, gap: PROFILE.sectionGap },
  top: { gap: PROFILE.quickGap },
  section: { gap: PROFILE.listGap },
  sectionLabel: { ...Typography.sectionLabel, color: Brand.textWeak },
});
