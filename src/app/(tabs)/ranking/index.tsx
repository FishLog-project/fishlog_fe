import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  Screen,
  ScreenHeader,
  ScreenState,
  SectionTitle,
} from '@/components/common';
import { Brand, Components, Typography } from '@/constants/theme';
import { useAuth } from '@/features/auth';
import { profileApi } from '@/features/profile';
import {
  formatMyRankMeta,
  formatRankValue,
  MyRankCard,
  type Ranking,
  rankingApi,
  RankRow,
} from '@/features/ranking';

const RANK = Components.ranking;

const METRIC = 'COMPLETION';

const PAGE_SIZE = 10;

/** 어떤 요청의 응답인지 함께 들고 있어야 로딩 여부를 상태 없이 알 수 있다 */
type Loaded = {
  key: string;
  ranking: Ranking | null;
  profile: profileApi.MyProfile | null;
  error: string | null;
};

/**
 * 도감 완성도 랭킹. 나의 순위와 전체 순위를 같은 기준으로 표시한다.
 */
export default function RankingScreen() {
  // 목록 자체는 공개다. 토큰은 내 순위를 함께 받기 위한 것이라 없어도 조회된다.
  const { token } = useAuth();
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [page, setPage] = useState(1);

  // 지금 화면이 필요로 하는 요청. 응답에 붙은 key와 다르면 아직 불러오는 중이다.
  // (로딩 플래그를 따로 두면 effect 안에서 동기로 setState 하게 된다)
  const key = `${METRIC}#${attempt}#${token ? 'auth' : 'guest'}`;
  const loading = loaded?.key !== key;

  useFocusEffect(useCallback(() => {
    let alive = true;
    Promise.all([
      rankingApi.getRanking(METRIC, token),
      token ? profileApi.getMyProfile(token) : Promise.resolve(null),
    ]).then(([res, profile]) => {
      if (!alive) return;
      setLoaded(
        res.ok
          ? { key, ranking: res.data, profile, error: null }
          : { key, ranking: null, profile, error: res.message },
      );
    });
    return () => {
      alive = false;
    };
  }, [key, token]));

  const ranking = loaded?.ranking ?? null;
  const profile = loaded?.profile ?? null;
  const error = loaded?.error ?? null;
  const displayRankings = ranking?.rankings ?? [];
  const totalPages = Math.max(1, Math.ceil(displayRankings.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRankings = displayRankings.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <Screen scroll header={<ScreenHeader title="도감 완성도 랭킹" />}
      footer={!loading && !error && ranking ? (
        <View style={styles.pagination}>
          <Pressable accessibilityRole="button" accessibilityLabel="이전 페이지"
            accessibilityState={{ disabled: currentPage === 1 }} disabled={currentPage === 1}
            onPress={() => setPage(currentPage - 1)}
            style={({ pressed }) => [styles.pageButton, currentPage === 1 && styles.disabled, pressed && styles.pressed]}>
            <Ionicons name="chevron-back" size={20} color={Brand.textHeading} />
          </Pressable>
          <Text accessibilityLiveRegion="polite" style={styles.pageLabel}>{currentPage} / {totalPages}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="다음 페이지"
            accessibilityState={{ disabled: currentPage === totalPages }} disabled={currentPage === totalPages}
            onPress={() => setPage(currentPage + 1)}
            style={({ pressed }) => [styles.pageButton, currentPage === totalPages && styles.disabled, pressed && styles.pressed]}>
            <Ionicons name="chevron-forward" size={20} color={Brand.textHeading} />
          </Pressable>
        </View>
      ) : undefined}>
        <View style={styles.sections}>
          {loading ? <ScreenState variant="loading" /> : null}
          {!loading && error ? (
            <ScreenState variant="error" onRetry={() => setAttempt((n) => n + 1)} />
          ) : null}

          {!loading && !error && ranking ? (
            <>
              {/* me는 로그인했을 때만 내려온다. 게스트에게는 이 묶음을 아예 감춘다 */}
              {ranking.me ? (
                <View style={styles.section}>
                  <SectionTitle>나의 순위</SectionTitle>
                  <MyRankCard
                    rank={ranking.me.rank}
                    nickname={ranking.me.nickname}
                    meta={formatMyRankMeta(ranking.me, METRIC, ranking.totalFishCount)}
                    profileImageUrl={profile?.profileImageUrl}
                  />
                </View>
              ) : token ? (
                <View style={styles.section}>
                  <SectionTitle>나의 순위</SectionTitle>
                  <ScreenState
                    variant="empty"
                    actionLabel="기록하러 가기"
                    onAction={() => router.push('/dex')}
                  />
                </View>
              ) : null}

              <View style={styles.section}>
                <SectionTitle>전체 순위</SectionTitle>
                {displayRankings.length > 0 ? (
                  <View key={currentPage} style={styles.list}>
                    {pageRankings.map((entry) => (
                      <RankRow
                        key={entry.userId}
                        rank={entry.rank}
                        nickname={entry.nickname}
                        value={formatRankValue(entry, METRIC)}
                        profileImageUrl={
                          entry.userId === profile?.userId ? profile.profileImageUrl : null
                        }
                      />
                    ))}
                  </View>
                ) : (
                  <ScreenState variant="empty" />
                )}
              </View>
            </>
          ) : null}
        </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sections: { paddingHorizontal: RANK.contentInset, gap: RANK.sectionGap },
  section: { gap: RANK.titleGap },
  list: { gap: RANK.rowGap },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  pageButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: Brand.surfaceSoft },
  pageLabel: { ...Typography.cardCaption, letterSpacing: 0, color: Brand.textHeading, minWidth: 64, textAlign: 'center' },
  disabled: { opacity: 0.3 },
  pressed: { opacity: 0.6 },
});
