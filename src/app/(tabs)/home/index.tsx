import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen, ScreenHeader } from '@/components/common';
import { Brand, Components, Typography } from '@/constants/theme';

/** 도감 진행도 더미 데이터 — API 연동 시 이 상수만 교체한다 */
const DEX_PROGRESS = { collected: 34, total: 150 };

/** 추천 스팟 더미 데이터 (디자인의 "지역/스팟명" 3개) */
const SPOTS = [
  { rank: 1, name: '지역/스팟명', distance: '00km', fish: '광어, 멸치, 개복치' },
  { rank: 2, name: '지역/스팟명', distance: '00km', fish: '광어, 멸치, 개복치' },
  { rank: 3, name: '지역/스팟명', distance: '00km', fish: '광어, 멸치, 개복치' },
];

export default function HomeScreen() {
  // 막대 폭은 숫자에서 유도한다. 고정값을 쓰면 "34/150"인데 62%가 차 있는 식으로 어긋난다.
  const dexPercent = Math.round(
    (DEX_PROGRESS.collected / DEX_PROGRESS.total) * 100,
  );

  return (
    <Screen scroll header={<ScreenHeader title="Fishlog" variant="brand" />}>
      {/*
        히어로 카드.
        배경은 SVG가 아니라 3배 PNG를 쓴다. 원본이 feGaussianBlur(stdDeviation 32.75)로
        glow 타원 두 개를 흐리게 깔아 두는데, expo-image의 SVG 렌더러는 filter를
        지원하지 않아 민트색 덩어리가 그대로 찍힌다. Figma가 렌더한 래스터를 쓰면 블러가 살아난다.

        ⚠️ 하단 페이지 인디케이터(점 5개)도 이 이미지에 함께 구워져 있다.
           캐러셀을 붙일 때는 인디케이터가 빠진 배경 에셋을 새로 받아야 한다.
      */}
      <View style={styles.hero}>
        <Image
          source={require('@/assets/images/home/hero-card.png')}
          style={StyleSheet.absoluteFill}
          contentFit="fill"
        />
        <Text style={styles.heroLabel}>오늘의 추천 어종</Text>
        <Text style={styles.heroTitle}>광어 잡기 좋은 날!</Text>
      </View>

      {/* 통계 카드 2개 */}
      <View style={styles.statRow}>
        <StatCard title="도감 진행도">
          <View style={styles.progressNumWrap}>
            <Text style={styles.progressNum}>{DEX_PROGRESS.collected}</Text>
            <Text style={styles.progressDenom}>/{DEX_PROGRESS.total}종</Text>
          </View>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={[...Components.progress.fill]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${dexPercent}%` }]}
            />
          </View>
        </StatCard>

        <StatCard title="물고기 인증하기">
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

      <View style={styles.spotList}>
        {SPOTS.map((s) => (
          <Pressable
            key={s.rank}
            style={styles.spotRow}
            accessibilityRole="button"
            accessibilityLabel={`${s.rank}위 ${s.name}, ${s.distance}, ${s.fish}`}>
            <RankPin rank={s.rank} />
            <View style={styles.spotText}>
              <Text style={styles.spotName}>{s.name}</Text>
              <Text style={styles.spotInfo}>
                {s.distance}
                <Text style={styles.spotInfoDivider}>{'  I  '}</Text>
                {s.fish}
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
    </Screen>
  );
}

/** 도감/인증 통계 카드 (헤더 + 화살표 + 내용) */
function StatCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
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
  // 히어로 — 배경 이미지 위에 문구만 얹는다
  hero: {
    height: 168,
    borderRadius: 16,
    overflow: 'hidden',
    paddingLeft: 24,
    paddingTop: 24,
  },
  heroLabel: { ...Typography.heroLabel, color: Brand.onPrimary },
  heroTitle: { ...Typography.heroTitle, color: Brand.onPrimary, marginTop: 2 },

  // 통계 카드
  statRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
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
