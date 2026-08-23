import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AppDialog,
  FormError,
  Screen,
  ScreenHeader,
  SettingsListItem,
} from '@/components/common';
import { Brand, Components, Layout, Typography } from '@/constants/theme';
import { authApi, UnderlineInput, useAuth } from '@/features/auth';

const PROFILE = Components.profile;
const CARD = PROFILE.quickCard;

/**
 * 마이페이지 (Figma 634:3019).
 *
 * 프로필 요약 → 바로가기 카드 3개 → "기타"·"설정" 목록 순으로 쌓는다.
 * 게스트는 계정이 없으므로 비밀번호 변경·계정 탈퇴를 감춘다.
 *
 * 세로 간격은 전부 부모 컨테이너의 gap이다. 간격이 다른 구간마다 묶음을
 * 하나씩 두고, 자식은 자기 여백을 갖지 않는다.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const { token, isGuest, signOut } = useAuth();
  const [profile, setProfile] = useState<authApi.MyProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<'logout' | 'withdraw' | null>(null);
  const [withdrawPassword, setWithdrawPassword] = useState('');
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    authApi.getMyProfile(token).then((p) => {
      if (alive) setProfile(p);
    });
    return () => {
      alive = false;
    };
  }, [token]);

  const handleSignOut = async () => {
    setBusy(true);
    await signOut();
    setBusy(false);
    setDialog(null);
    router.replace('/auth/login');
  };

  const closeDialog = () => {
    if (busy) return;
    setDialog(null);
    setWithdrawPassword('');
    setWithdrawError(null);
  };

  const handleWithdraw = async () => {
    if (!token || !withdrawPassword || busy) return;
    setBusy(true);
    setWithdrawError(null);

    const res = await authApi.withdraw(token, withdrawPassword);
    if (!res.ok) {
      setBusy(false);
      setWithdrawError(res.message);
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
          <View style={styles.identity}>
            {/* 프로필 사진은 아직 서버에 없다 (GET /api/users/me는 닉네임·이메일만 준다) */}
            <View style={styles.avatar}>
              <Ionicons name="person" size={Components.icon.avatar} color={Brand.inactive} />
            </View>
            <View style={styles.names}>
              <Text style={styles.name} numberOfLines={1}>
                {isGuest ? '게스트' : (profile?.nickname ?? '—')}
              </Text>
              <Text style={styles.email} numberOfLines={1}>
                {isGuest ? '로그인하면 기록을 저장할 수 있어요' : (profile?.email ?? '—')}
              </Text>
            </View>
          </View>

          <View style={styles.quickRow}>
            <QuickCard
              icon={require('@/assets/images/profile/book-card.svg')}
              label="내 도감"
              onPress={() => router.push('/log')}
            />
            <QuickCard
              icon={require('@/assets/images/profile/rank-card.svg')}
              label="내 랭킹"
              onPress={() => router.push('/ranking')}
            />
            {/* 저장 목록 화면은 아직 없다. 라우트가 생기면 onPress를 연결한다 */}
            <QuickCard
              icon={require('@/assets/images/profile/saved-card.svg')}
              label="저장 목록"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>기타</Text>
          <View>
            <SettingsListItem label="낚시 인증 기록 조회" onPress={() => router.push('/log')} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>설정</Text>
          <View>
            {/*
              로그인한 사용자는 현재 비밀번호로 바로 바꾼다.
              비밀번호를 잊은 경우는 로그인 화면의 "비밀번호 찾기"가 담당한다.
            */}
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
          </View>
        </View>
        </View>
      </Screen>

      <AppDialog
        visible={dialog === 'logout'}
        title="로그아웃하시겠어요?"
        message="로그인 화면으로 이동합니다."
        buttonLabel="로그아웃"
        loading={busy}
        onConfirm={handleSignOut}
        onCancel={closeDialog}
      />

      <AppDialog
        visible={dialog === 'withdraw'}
        title="정말 탈퇴하시겠어요?"
        message={'탈퇴하면 도감·낚시 기록·저장 목록이 모두 삭제되고\n되돌릴 수 없어요.'}
        buttonLabel="탈퇴하기"
        confirmDisabled={withdrawPassword.length === 0}
        loading={busy}
        onConfirm={handleWithdraw}
        onCancel={closeDialog}>
        <View style={styles.withdrawFields}>
          <UnderlineInput
            value={withdrawPassword}
            onChangeText={(value) => {
              setWithdrawPassword(value);
              if (withdrawError) setWithdrawError(null);
            }}
            placeholder="현재 비밀번호"
            secureTextEntry
            passwordToggle
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={handleWithdraw}
            accessibilityLabel="현재 비밀번호"
          />
          <FormError message={withdrawError} />
        </View>
      </AppDialog>
    </>
  );
}

/** 바로가기 카드 한 장 — 아이콘 + 라벨 (Figma 634:3040). */
function QuickCard({
  icon,
  label,
  onPress,
}: {
  icon: number;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <LinearGradient
        colors={[...Brand.cardSurface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Image source={icon} style={styles.cardIcon} contentFit="contain" />
      <Text style={styles.cardLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /**
   * 헤더 아래 아바타까지 28, 이후 섹션 사이 28.
   * (시안은 "기타"→"설정"만 24지만, 섹션 리듬을 하나로 두는 편이 유지하기 쉽다)
   */
  body: { paddingTop: PROFILE.avatarTop, gap: PROFILE.sectionGap },
  /** 프로필 묶음 ~ 바로가기 카드 */
  top: { gap: PROFILE.quickGap },
  identity: { alignItems: 'center', gap: PROFILE.nameGap },
  names: { alignItems: 'center', gap: PROFILE.emailGap },

  avatar: {
    width: PROFILE.avatarSize,
    height: PROFILE.avatarSize,
    borderRadius: PROFILE.avatarSize / 2,
    backgroundColor: Brand.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...Typography.profileName, color: Brand.textHeading },
  email: { ...Typography.profileEmail, color: Brand.textMuted },

  /** 카드 3장이 본문 폭(326)을 90 + 28 + 90 + 28 + 90으로 나눠 쓴다 */
  quickRow: { flexDirection: 'row', justifyContent: 'space-between' },
  card: {
    width: CARD.size,
    height: CARD.size,
    borderRadius: CARD.radius,
    overflow: 'hidden',
    alignItems: 'center',
    paddingTop: CARD.paddingTop,
    gap: CARD.gap,
    // Figma의 inset shadow. RN 0.76+ 새 아키텍처에서 지원한다.
    boxShadow: `inset 0px 0px 7.271px ${CARD.innerGlow}`,
  },
  cardPressed: { opacity: 0.8 },
  cardIcon: { width: CARD.iconSize, height: CARD.iconSize },
  cardLabel: { ...Typography.quickLabel, color: CARD.label },

  /** 구분 라벨 ~ 목록 */
  section: { gap: PROFILE.listGap },
  sectionLabel: { ...Typography.sectionLabel, color: Brand.textWeak },
  withdrawFields: { gap: 12 },
});
