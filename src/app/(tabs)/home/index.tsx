import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen, ScreenHeader, ScreenState } from '@/components/common';
import { Brand, Components, Typography } from '@/constants/theme';
import { createFixtureFishLogDataSource } from '@/features/home/home-data';
import { HeroCarousel } from '@/features/home/components/hero-carousel';
import { useHomeViewModel } from '@/features/home/use-home-view-model';

const HERO_LABEL = '오늘의 추천 어종';

/** 슬라이드를 못 받았을 때 히어로 자리에 넣는 대체 문구 */
const HERO_FALLBACK = {
  loading: '오늘의 바다를 읽는 중…',
  empty: '오늘은 추천 어종이 없어요',
  error: '추천 어종을 불러오지 못했어요',
} as const;

export default function HomeScreen() {
  const router = useRouter();
  // 렌더마다 새로 만들면 useSection 의존성이 흔들려 무한 재요청이 된다.
  // 빈/오류 화면을 확인하려면 인자를 'empty' | 'partial-error'로 바꾼다.
  const dataSource = useMemo(() => createFixtureFishLogDataSource(), []);
  const { viewModel, retryCollectionProgress, retryRecommendedSpots } =
    useHomeViewModel(dataSource);
  const { featuredSpecies, collectionProgress, recommendedSpots } = viewModel;

  return (
    <Screen scroll header={<ScreenHeader title="Fishlog" variant="brand" />}>
      {featuredSpecies.status === 'ready' ? (
        <HeroCarousel slides={featuredSpecies.data} label={HERO_LABEL} />
      ) : (
        <View style={styles.heroFallback}>
          <Text style={styles.heroFallbackLabel}>{HERO_LABEL}</Text>
          <Text style={styles.heroFallbackTitle}>
            {HERO_FALLBACK[featuredSpecies.status]}
          </Text>
        </View>
      )}

      {/* 통계 카드 2개 */}
      <View style={styles.statRow}>
        <StatCard
          title="도감 진행도"
          accessibilityLabel="도감 진행도, 도감 화면으로 이동"
          onPress={() => router.push('/log')}>
          {collectionProgress.status === 'ready' ? (
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
          ) : collectionProgress.status === 'loading' ? (
            <ActivityIndicator style={styles.statBody} color={Brand.primary} />
          ) : (
            <Pressable
              style={styles.statBody}
              accessibilityRole="button"
              accessibilityLabel="도감 진행도 다시 불러오기"
              onPress={retryCollectionProgress}>
              <Text style={styles.statRetry}>불러오지 못했어요 · 다시 시도</Text>
            </Pressable>
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

      {/* 추천 낚시 스팟 Top 3 */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>추천 낚시 스팟 Top 3</Text>
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
              accessibilityLabel={`${s.rank}위 ${s.name}, ${s.distance}, ${s.species}. 지도에서 보기`}
              onPress={() => router.push('/map')}>
              <RankPin rank={s.rank} />
              <View style={styles.spotText}>
                <Text style={styles.spotName}>{s.name}</Text>
                <Text style={styles.spotInfo}>
                  {s.distance}
                  <Text style={styles.spotInfoDivider}>{'  I  '}</Text>
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

/** 도감/인증 통계 카드 (헤더 + 화살표 + 내용). 카드 전체가 이동 버튼이다 */
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

/** 순위 핀 — 핀 모양 + 안쪽 흰 원 + 순위 숫자를 겹쳐 올린다 */
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

const CARD = Components.statCard;
const BAR = Components.progress;
const ROW = Components.spotRow;

const styles = StyleSheet.create({
  /** 슬라이드가 없을 때의 히어로 자리 (캐러셀과 같은 크기·여백) */
  heroFallback: {
    height: 168,
    borderRadius: 16,
    paddingLeft: 24,
    paddingTop: 24,
    backgroundColor: Brand.primary,
  },
  heroFallbackLabel: { ...Typography.heroLabel, color: Brand.onPrimary },
  heroFallbackTitle: {
    ...Typography.heroTitle,
    color: Brand.onPrimary,
    marginTop: 2,
  },

  // 통계 카드
  statRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  /** flex는 바깥 Pressable이 갖고, 그라데이션은 그 안을 채운다 */
  statCardPress: { flex: 1 },
  pressed: { opacity: 0.85 },
  statCard: {
    flex: 1,
    height: CARD.height,
    borderRadius: CARD.radius,
    padding: CARD.padding,
    justifyContent: 'space-between',
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

  progressNumWrap: { flexDirection: 'row', alignItems: 'baseline' },
  progressNum: { ...Typography.statNumber, color: Brand.primary },
  progressDenom: { ...Typography.statUnit, color: Brand.primary },
  progressTrack: {
    height: BAR.height,
    borderRadius: BAR.radius,
    backgroundColor: BAR.track,
    borderWidth: BAR.trackBorderWidth,
    borderColor: BAR.trackBorder,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: BAR.radius },

  /** 로딩·오류일 때 카드 본문 자리를 채우는 중앙 정렬 영역 */
  statBody: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statRetry: { ...Typography.itemMeta, color: Brand.textMuted, textAlign: 'center' },

  scanWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scanImage: { width: 73.733, height: 56 },

  // 스팟 섹션
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: { ...Typography.sectionTitle, color: Brand.textHeading },
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
  /** 핀 머리 안쪽 흰 원. Figma inset[20% 27.5% 35% 27.5%] 기준 */
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
  /** 거리와 어종 사이 구분자만 회색 + Light */
  spotInfoDivider: { ...Typography.itemMetaDivider, color: Brand.textDisabled },
  spotChevron: { width: ROW.chevronSize, height: ROW.chevronSize },
});
