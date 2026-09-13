import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppDialog } from '@/components/common';
import { Brand, Typography } from '@/constants/theme';

import {
  type AppPermission,
  getRequestablePermissions,
  requestPermissions,
} from './app-permissions';

const ONBOARDED_KEY = 'fishlog.permissions-onboarded';

/**
 * 앱 첫 진입 권한 안내 팝업.
 *
 * 필요한 권한(위치·카메라·알림)을 앱 안 팝업 하나로 설명하고, "허용하기"를 누르면
 * OS 권한 창을 차례로 띄운다. 설정 앱으로 보내지 않는다.
 *
 * ⚠️ 권한 부여 자체는 OS 창에서만 된다 (앱 UI 로 대신할 수 없다).
 * ⚠️ 이미 거부해 OS 가 더 묻지 않는 권한은 목록에서 빠진다. 앱 안에서 다시 켤 방법은 없다.
 * ⚠️ 시안이 없어 공통 AppDialog 로 구성했다.
 *
 * 허용하든 나중에 하든 한 번 띄우면 다시 띄우지 않는다. 각 기능은 필요할 때 따로 묻는다.
 */
export function PermissionOnboarding({ enabled }: { enabled: boolean }) {
  const [pending, setPending] = useState<readonly AppPermission[] | null>(null);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    (async () => {
      const onboarded = await SecureStore.getItemAsync(ONBOARDED_KEY).catch(() => null);
      if (onboarded) return;

      const requestable = await getRequestablePermissions();
      if (!active) return;
      // 이미 모두 허용됐으면(기존 사용자) 띄우지 않고 끝낸 것으로 기억한다
      if (requestable.length === 0) {
        void markOnboarded();
        return;
      }
      setPending(requestable);
    })().catch(() => undefined);

    return () => {
      active = false;
    };
  }, [enabled]);

  const close = () => {
    setPending(null);
    void markOnboarded();
  };

  const allow = async () => {
    if (!pending) return;
    setRequesting(true);
    // OS 권한 창이 이 팝업 위에 겹치지 않게 먼저 닫는다
    const toRequest = pending;
    setPending(null);
    await requestPermissions(toRequest);
    setRequesting(false);
    void markOnboarded();
  };

  return (
    <AppDialog
      visible={pending !== null && !requesting}
      title="편한 낚시 기록을 위해 권한을 허용해 주세요"
      message="허용하지 않아도 앱은 쓸 수 있어요. 일부 기능만 제한돼요."
      buttonLabel="허용하기"
      onConfirm={allow}
      cancelLabel="나중에"
      onCancel={close}>
      <View style={styles.list}>
        {pending?.map((permission) => (
          <View key={permission.key} style={styles.row}>
            <View style={styles.iconWrap}>
              <Ionicons name={permission.icon} size={22} color={Brand.primary} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>{permission.title}</Text>
              <Text style={styles.description}>{permission.description}</Text>
            </View>
          </View>
        ))}
      </View>
    </AppDialog>
  );
}

function markOnboarded() {
  return SecureStore.setItemAsync(ONBOARDED_KEY, '1').catch(() => undefined);
}

const styles = StyleSheet.create({
  list: { gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.surfaceSoft,
  },
  copy: { flex: 1, gap: 2 },
  title: { ...Typography.itemTitle, color: Brand.textStrong },
  description: { ...Typography.caption, color: Brand.textMuted },
});
