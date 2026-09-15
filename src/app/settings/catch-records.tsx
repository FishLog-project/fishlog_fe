import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen, ScreenHeader, ScreenState, SettingsListItem } from '@/components/common';
import { Brand, Components, Layout, Typography } from '@/constants/theme';
import { useAuth } from '@/features/auth';
import { createApiCatchHistoryDataSource } from '@/features/catch/catch-history-api';
import { createFixtureCatchHistoryDataSource } from '@/features/catch/catch-history-data';
import { useCatchHistory } from '@/features/catch/use-catch-history';
import { USE_FIXTURE } from '@/lib/data-source-mode';

const RECORDS = Components.profile.records;

/**
 * 낚시 인증 기록 조회 (Figma 634:3205).
 *
 * 마이페이지 "기타"에서 들어온다. 날짜별로 묶어 최신 날짜를 위에 두고,
 * 한 줄에 "어종 (크기)"만 보여준다 — 시안에 화살표가 없어 항목은 누를 수 없다.
 */
export default function CatchRecordsScreen() {
  const { token } = useAuth();
  const dataSource = useMemo(
    () =>
      USE_FIXTURE
        ? createFixtureCatchHistoryDataSource()
        : createApiCatchHistoryDataSource(token),
    [token],
  );
  const [state, retry] = useCatchHistory(dataSource);

  return (
    <Screen
      scroll
      contentPadding={Layout.profilePadding}
      header={<ScreenHeader title="낚시 인증 기록 조회" showBack />}>
      {state.status === 'ready' ? (
        <View style={styles.groups}>
          {state.data.map((group) => (
            <View key={group.date} style={styles.group}>
              <Text style={styles.dateLabel}>{group.dateLabel}</Text>
              <View>
                {group.items.map((item) => (
                  <SettingsListItem
                    key={`${item.recordType}-${item.recordId}`}
                    label={item.label}
                    showChevron={false}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <ScreenState
          variant={state.status === 'empty' ? 'empty' : state.status}
          title={state.status === 'empty' ? '아직 인증한 기록이 없어요' : undefined}
          description={
            state.status === 'empty' ? '물고기를 인증하면 여기에 쌓여요.' : undefined
          }
          onRetry={state.status === 'error' ? retry : undefined}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  groups: { gap: RECORDS.groupGap },
  group: { gap: RECORDS.labelGap },
  dateLabel: { ...Typography.sectionLabel, color: Brand.textWeak },
});
