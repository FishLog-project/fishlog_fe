import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo, useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen, ScreenHeader, ScreenState, SectionTitle } from '@/components/common';
import { Brand, Components, Typography } from '@/constants/theme';
import { useAuth } from '@/features/auth';
import { createApiFishLogDataSource } from '@/features/home/home-api';
import { createFixtureFishLogDataSource } from '@/features/home/home-data';
import { HeroCarousel } from '@/features/home/components/hero-carousel';
import { useHomeViewModel } from '@/features/home/use-home-view-model';
import { USE_FIXTURE } from '@/lib/data-source-mode';

/** 도감 진행도를 못 받았을 때 카드 본문 문구. 카드 자체가 버튼이라 안내와 동작이 함께 바뀐다 */
const PROGRESS_FALLBACK = {
  login: '로그인하면 도감 진행도를 볼 수 있어요',
  error: '불러오지 못했어요 · 다시 시도',
} as const;

export default function HomeScreen() {
  const router = useRouter();
  const { token } = useAuth();
  // 렌더마다 새로 만들면 useSection 의존성이 흔들려 무한 재요청이 된다.
  // fixture의 빈/오류 화면은 인자를 'empty' | 'partial-error'로 바꿔 확인한다.
  const dataSource = useMemo(
    () => (USE_FIXTURE ? createFixtureFishLogDataSource() : createApiFishLogDataSource(token)),
    [token],
  );
  const { viewModel, retryFeaturedSpecies, retryCollectionProgress, retryRecommendedSpots } =
    useHomeViewModel(dataSource);
  const { featuredSpecies, collectionProgress, recommendedSpots } = viewModel;

  // 인증 뒤 집계를 갱신하고, 네트워크 복구 후 홈 재진입 시 배너도 다시 읽는다.
  // 첫 포커스는 마운트 요청과 겹치므로 건너뛴다.
  const returned = useRef(false);
  useFocusEffect(useCallback(() => {
    if (!returned.current) {
      returned.current = true;
      return;
    }
    retryCollectionProgress();
    retryFeaturedSpecies();
  }, [retryCollectionProgress, retryFeaturedSpecies]));

  // 게스트는 도감 진행도 대신 로그인 안내를 본다 (fixture는 로그인 없이도 채워 준다)
  const needsLogin = !USE_FIXTURE && token === null;
  const progressMessage = needsLogin
    ? PROGRESS_FALLBACK.login
    : collectionProgress.status === 'error'
      ? PROGRESS_FALLBACK.error
      : null;
  // 카드 전체가 버튼이라 본문에 버튼을 겹치지 않고, 상태에 따라 카드의 동작을 바꾼다
  const onProgressPress = needsLogin
    ? () => router.replace('/auth/login')
    : collectionProgress.status === 'error'
      ? retryCollectionProgress
      : () => router.push('/dex');

  return (
    <Screen scroll header={<ScreenHeader title="Fishlog" variant="brand" />}>
      <View style={styles.hero}>
        <HeroCarousel
          featured={featuredSpecies}
          recommendedSpots={recommendedSpots}
          onRetryFeatured={retryFeaturedSpecies}
        />
      </View>

      <View style={styles.statRow}>
        <StatCard
          title="도감 진행도"
          accessibilityLabel={progressMessage ?? '도감 진행도, 도감 화면으로 이동'}
          onPress={onProgressPress}>
          {progressMessage ? (
            <View style={styles.statBody}>
              <Text style={styles.statRetry}>{progressMessage}</Text>
            </View>
          ) : collectionProgress.status === 'ready' ? (
            <>
              <View style={styles.progressNumWrap}>
                <Text style={styles.progressNum}>
                  {collectionProgress.data.collected}
                </Text>
                <Text style={styles.progressDenom}>
                  /{collectionProgress.data.total}종
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <LinearGradient
                  colors={[...Components.progress.fill]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.progressFill,
                    { width: `${collectionProgress.data.progressPercent}%` },
                  ]}
                />
              </View>
            </>
          ) : (
            <ActivityIndicator style={styles.statBody} color={Brand.primary} />
          )}
        </StatCard>

        <StatCard
          title="물고기 인증하기"
          accessibilityLabel="물고기 인증하기, 낚시 인증 화면으로 이동"
          onPress={() => router.push('/catch')}>
          <View style={styles.scanWrap}>
            <Image
              source={require('@/assets/images/home/scan-fish.svg')}
              style={styles.scanImage}
              contentFit="contain"
            />
          </View>
        </StatCard>
      </View>

      <View style={styles.sectionHead}>
        <SectionTitle>추천 낚시 스팟 Top 3</SectionTitle>
        <Image
          source={require('@/assets/images/home/fishing-rod.png')}
          style={styles.sectionIcon}
          contentFit="contain"
        />
      </View>

      {recommendedSpots.status === 'ready' ? (
        <View style={styles.spotList}>
          {recommendedSpots.data.map((s) => (
            <Pressable
              key={s.id}
              style={({ pressed }) => [styles.spotRow, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`${s.rank}위 ${s.name}, ${[s.distance, s.species]
                .filter(Boolean)
                .join(', ')}. 지도에서 보기`}
              onPress={() => router.push('/map')}>
              <RankPin rank={s.rank} />
              <View style={styles.spotText}>
                <Text numberOfLines={1} style={styles.spotName}>
                  {s.name}
                </Text>
                <Text numberOfLines={1} style={styles.spotInfo}>
                  {s.distance ? (
                    <>
                      {s.distance}
                      <Text style={styles.spotInfoDivider}>{'  I  '}</Text>
                    </>
                  ) : null}
                  {s.species}
                </Text>
              </View>
              <Image
                source={require('@/assets/images/home/chevron-28.svg')}
                style={styles.spotChevron}
                contentFit="contain"
              />
            </Pressable>
          ))}
        </View>
      ) : (
        <ScreenState
          variant={recommendedSpots.status}
          title={
            recommendedSpots.status === 'empty' ? '추천할 스팟이 아직 없어요' : undefined
          }
          description={
            recommendedSpots.status === 'empty'
              ? '주변 낚시 스팟 정보가 준비되면 여기서 보여드릴게요.'
              : undefined
          }
          onRetry={
            recommendedSpots.status === 'error' ? retryRecommendedSpots : undefined
          }
        />
      )}
    </Screen>
  );
}

/** 카드 전체가 이동 버튼이다 */
function StatCard({
  title,
  accessibilityLabel,
  onPress,
  children,
}: {
  title: string;
  accessibilityLabel: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.statCardPress, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}>
      <LinearGradient
        colors={[...Brand.cardSurface]}
        // Figma는 151.27deg. 아래로 내려가면서 살짝 오른쪽으로 기운다.
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.statCard}>
        <View style={styles.statHead}>
          <Text style={styles.statTitle}>{title}</Text>
          <Image
            source={require('@/assets/images/home/chevron-20.svg')}
            style={styles.statChevron}
            contentFit="contain"
          />
        </View>
        {children}
      </LinearGradient>
    </Pressable>
  );
}

/** 핀 모양 + 안쪽 흰 원 + 순위 숫자를 겹쳐 올린다 */
function RankPin({ rank }: { rank: number }) {
  return (
    <View style={styles.pin}>
      <Image
        source={require('@/assets/images/home/pin-shape.svg')}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
      />
      <View style={styles.pinInner}>
        <Image
          source={require('@/assets/images/home/pin-inner.svg')}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
        />
        <Text style={styles.pinNum}>{rank}</Text>
      </View>
    </View>
  );
}

const HOME = Components.home;
const CARD = Components.statCard;
const BAR = Components.progress;
const ROW = Components.spotRow;

const styles = StyleSheet.create({
  hero: { marginTop: HOME.heroTop },

  // 통계 카드
  statRow: { flexDirection: 'row', gap: HOME.cardGap, marginTop: HOME.blockGap },
  /** flex는 바깥 Pressable이 갖고, 그라데이션은 그 안을 채운다 */
  statCardPress: { flex: 1 },
  pressed: { opacity: 0.85 },
  statCard: {
    flex: 1,
    height: CARD.height,
    borderRadius: CARD.radius,
    padding: CARD.padding,
    // Figma의 inset shadow. RN 0.76+ 새 아키텍처에서 지원한다.
    boxShadow: `inset 0px 0px 8.4px ${CARD.innerGlow}`,
  },
  statHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statTitle: { ...Typography.cardTitle, color: Brand.primaryDark },
  statChevron: { width: 20, height: 20 },

  progressNumWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: CARD.valueTop,
  },
  progressNum: { ...Typography.statNumber, color: Brand.primary },
  progressDenom: { ...Typography.statUnit, color: Brand.primary },
  progressTrack: {
    marginTop: CARD.barTop,
    height: BAR.height,
    borderRadius: BAR.radius,
    backgroundColor: BAR.track,
    borderWidth: BAR.trackBorderWidth,
    borderColor: BAR.trackBorder,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: BAR.radius },

  /** 로딩·오류일 때 카드 본문 자리 */
  statBody: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statRetry: { ...Typography.itemMeta, color: Brand.textMuted, textAlign: 'center' },

  scanWrap: { marginTop: CARD.iconTop, alignItems: 'center' },
  scanImage: { width: 73.733, height: 56 },

  // 스팟 섹션
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: HOME.sectionTitleGap,
    marginTop: HOME.blockGap,
    marginBottom: HOME.sectionBottom,
  },
  sectionIcon: { width: 20, height: 20 },

  spotList: { gap: ROW.rowGap },
  spotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ROW.bg,
    borderRadius: ROW.radius,
    paddingVertical: ROW.paddingY,
    paddingHorizontal: ROW.paddingX,
    gap: ROW.contentGap,
  },
  pin: { width: ROW.pinSize, height: ROW.pinSize },
  /** Figma inset[20% 27.5% 35% 27.5%] */
  pinInner: {
    position: 'absolute',
    left: '27.5%',
    right: '27.5%',
    top: '20%',
    bottom: '35%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinNum: { ...Typography.badge, color: Brand.primaryDark },
  spotText: { flex: 1 },
  spotName: { ...Typography.itemTitle, color: Brand.textStrong },
  spotInfo: { ...Typography.itemMeta, color: Brand.textMuted },
  /** 구분자만 회색 + Light */
  spotInfoDivider: { ...Typography.itemMetaDivider, color: Brand.textDisabled },
  spotChevron: { width: ROW.chevronSize, height: ROW.chevronSize },
});
