import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Screen, ScreenHeader } from '@/components/common';
import { Brand, Components } from '@/constants/theme';
import { authApi, useAuth } from '@/features/auth';

/**
 * ⚠️ 임시 화면 — 마이페이지 디자인이 나오기 전까지 개발 편의를 위해 둔다.
 *
 * 디자인이 확정되면 이 파일은 통째로 교체된다. 여기 있는 레이아웃/문구는
 * 디자인 근거가 없는 임시값이므로 다른 화면의 참고 대상으로 삼지 말 것.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const { token, isGuest, signOut } = useAuth();
  const [profile, setProfile] = useState<authApi.MyProfile | null>(null);
  const [busy, setBusy] = useState(false);

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
    router.replace('/auth/login');
  };

  const handleWithdraw = () => {
    // 회원탈퇴는 비밀번호 확인이 필요하다(DELETE /api/users/me).
    Alert.prompt(
      '회원탈퇴',
      '계정과 기록이 모두 삭제돼요. 확인을 위해 비밀번호를 입력해 주세요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴',
          style: 'destructive',
          onPress: (password?: string) => confirmWithdraw(password ?? ''),
        },
      ],
      'secure-text',
    );
  };

  const confirmWithdraw = async (password: string) => {
    if (!password) return;
    setBusy(true);
    const res = await authApi.withdraw(token, password);
    if (!res.ok) {
      setBusy(false);
      Alert.alert('회원탈퇴 실패', res.message);
      return;
    }
    await signOut();
    setBusy(false);
    router.replace('/auth/login');
  };

  return (
    <Screen scroll header={<ScreenHeader title="마이페이지" />}>
      <View style={styles.notice}>
        <Text style={styles.noticeText}>
          디자인 준비 중인 임시 화면이에요. 개발용 동작만 넣어 두었어요.
        </Text>
      </View>

      <View style={styles.card}>
        <Row label="상태" value={isGuest ? '게스트' : token ? '로그인됨' : '비로그인'} />
        <Row label="닉네임" value={profile?.nickname ?? '—'} />
        <Row label="이메일" value={profile?.email ?? '—'} />
      </View>

      <Pressable
        style={styles.action}
        disabled={busy}
        accessibilityRole="button"
        onPress={handleSignOut}>
        <Text style={styles.actionText}>로그아웃</Text>
      </Pressable>

      {/* 게스트는 지울 계정이 없다. 안드로이드는 아래 인라인 입력을 쓴다 */}
      {Platform.OS === 'ios' && !isGuest && token ? (
        <Pressable
          style={styles.action}
          disabled={busy}
          accessibilityRole="button"
          onPress={handleWithdraw}>
          <Text style={[styles.actionText, styles.danger]}>회원탈퇴</Text>
        </Pressable>
      ) : null}

      {/* Alert.prompt는 iOS 전용이라 안드로이드에서는 인라인 입력으로 대체한다 */}
      <AndroidWithdraw
        visible={Platform.OS !== 'ios' && !isGuest && !!token}
        busy={busy}
        onSubmit={confirmWithdraw}
      />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

/**
 * Alert.prompt가 없는 플랫폼(안드로이드)용 탈퇴 입력.
 * 임시 화면이므로 모달 없이 그대로 펼쳐 둔다.
 */
function AndroidWithdraw({
  visible,
  busy,
  onSubmit,
}: {
  visible: boolean;
  busy: boolean;
  onSubmit: (password: string) => void;
}) {
  const [password, setPassword] = useState('');
  if (!visible) return null;

  return (
    <View style={styles.androidBox}>
      <Text style={styles.androidLabel}>회원탈퇴 (비밀번호 확인)</Text>
      <TextInput
        style={styles.androidInput}
        value={password}
        onChangeText={setPassword}
        placeholder="비밀번호"
        placeholderTextColor={Components.authInput.placeholder}
        secureTextEntry
        autoCapitalize="none"
      />
      <Pressable
        disabled={busy || password.length === 0}
        accessibilityRole="button"
        onPress={() => onSubmit(password)}>
        <Text style={[styles.actionText, styles.danger]}>탈퇴하기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    backgroundColor: Brand.surfaceSoft,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  noticeText: { fontSize: 13, color: Brand.textMuted },
  card: {
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: Brand.surfaceSoft,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowLabel: { fontSize: 14, color: Brand.textMuted },
  rowValue: { fontSize: 14, fontWeight: '600', color: Brand.textStrong },
  action: { paddingVertical: 18 },
  actionText: { fontSize: 16, fontWeight: '600', color: Brand.textStrong },
  danger: { color: Brand.textError },
  androidBox: { marginTop: 8, gap: 12 },
  androidLabel: { fontSize: 14, color: Brand.textMuted },
  androidInput: {
    height: Components.authInput.boxHeight,
    borderRadius: Components.authInput.boxRadius,
    backgroundColor: Components.authInput.boxBg,
    paddingHorizontal: Components.authInput.boxPaddingX,
    fontSize: 16,
    color: Components.authInput.text,
  },
});
