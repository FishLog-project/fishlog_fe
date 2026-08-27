import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import {
  Screen,
  ScreenHeader,
  ScreenState,
  SectionTitle,
  SegmentControl,
} from '@/components/common';
import { Components } from '@/constants/theme';
import { authApi, useAuth } from '@/features/auth';
import {
  formatMyRankMeta,
  formatRankValue,
  MyRankCard,
  type Ranking,
  rankingApi,
  type RankingMetric,
  RankRow,
} from '@/features/ranking';

const RANK = Components.ranking;

const METRICS: readonly { value: RankingMetric; label: string }[] = [
  { value: 'COMPLETION', label: '도감 완성도' },
  { value: 'SIZE', label: '최대 크기' },
];

/* TODO: 전체 순위 UI 확인이 필요할 때만 임시 데이터를 다시 활성화한다.
const DEV_RANKINGS = Array.from({ length: 25 }, (_, index) => ({
  rank: index + 1,
  userId: -(index + 1),
  nickname: `낚시왕 ${index + 1}호`,
  caughtCount: Math.max(1, 29 - index),
  completionRate: Number(Math.max(3.4, 96.6 - index * 3.2).toFixed(1)),
  maxSize: Number(Math.max(20, 92 - index * 2.4).toFixed(1)),
}));
*/

/** 어떤 요청의 응답인지 함께 들고 있어야 로딩 여부를 상태 없이 알 수 있다 */
type Loaded = {
  key: string;
  ranking: Ranking | null;
  profile: authApi.MyProfile | null;
  error: string | null;
};

/**
 * 랭킹 (Figma 634:2270 도감 완성도 / 634:2305 최대 크기).
 *
 * 두 시안은 세그먼트로 전환되는 같은 화면이라 한 파일에서 metric만 바꿔 그린다.
 * 세로 배치는 [세그먼트] → [나의 순위] → [전체 순위] 세 묶음이고,
 * 간격은 전부 부모 컨테이너의 gap이 잡는다.
 */
export default function RankingScreen() {
  // 목록 자체는 공개다. 토큰은 내 순위를 함께 받기 위한 것이라 없어도 조회된다.
  const { token } = useAuth();
  const router = useRouter();
  const [metric, setMetric] = useState<RankingMetric>('COMPLETION');
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  // 지금 화면이 필요로 하는 요청. 응답에 붙은 key와 다르면 아직 불러오는 중이다.
  // (로딩 플래그를 따로 두면 effect 안에서 동기로 setState 하게 된다)
  const key = `${metric}#${attempt}#${token ? 'auth' : 'guest'}`;
  const loading = loaded?.key !== key;

  useFocusEffect(useCallback(() => {
    let alive = true;
    Promise.all([
      rankingApi.getRanking(metric, token),
      token ? authApi.getMyProfile(token) : Promise.resolve(null),
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
  }, [key, metric, token]));

  const ranking = loaded?.ranking ?? null;
  const profile = loaded?.profile ?? null;
  const error = loaded?.error ?? null;
  const displayRankings = ranking?.rankings ?? [];
  /* 전체 순위 임시 데이터 표시용. 실제 API 연결 중에는 사용하지 않는다.
  const displayRankings =
    ranking && ranking.rankings.length === 0 && __DEV__
      ? DEV_RANKINGS
      : (ranking?.rankings ?? []);
  */

  return (
    <Screen scroll header={<ScreenHeader title="랭킹" />}>
      <View style={styles.body}>
        <SegmentControl options={METRICS} value={metric} onChange={setMetric} />

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
                    meta={formatMyRankMeta(ranking.me, metric, ranking.totalFishCount)}
                    profileImageUrl={profile?.profileImageUrl}
                  />
                </View>
              ) : token ? (
                <View style={styles.section}>
                  <SectionTitle>나의 순위</SectionTitle>
                  <ScreenState
                    variant="empty"
                    actionLabel="기록하러 가기"
                    onAction={() => router.push('/log')}
                  />
                </View>
              ) : null}

              <View style={styles.section}>
                <SectionTitle>전체 순위</SectionTitle>
                {displayRankings.length > 0 ? (
                  <View style={styles.list}>
                    {displayRankings.map((entry) => (
                      <RankRow
                        key={entry.userId}
                        rank={entry.rank}
                        nickname={entry.nickname}
                        value={formatRankValue(entry, metric)}
                        profileImageUrl={
                          entry.userId === profile?.userId ? profile.profileImageUrl : null
                        }
                      />
                    ))}
                    {/* TODO: 랭킹 API에 page/size가 추가되면 10위 단위 페이지네이션을 연결한다.
                    <View style={styles.pagination}>
                      <Pressable><Text>이전</Text></Pressable>
                      <Text>{currentPage} / {totalPages}</Text>
                      <Pressable><Text>다음</Text></Pressable>
                    </View>
                    */}
                  </View>
                ) : (
                  <ScreenState variant="empty" />
                )}
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  /** 세그먼트 ~ 본문 */
  body: { gap: RANK.segmentGap },
  /**
   * 세그먼트는 화면 여백에 맞추고 본문만 조금 더 안으로 들인다.
   * 자식마다 여백을 주지 않고 이 컨테이너 한 곳에서 처리한다.
   */
  sections: { paddingHorizontal: RANK.contentInset, gap: RANK.sectionGap },
  section: { gap: RANK.titleGap },
  list: { gap: RANK.rowGap },
});
