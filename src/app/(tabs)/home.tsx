import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen, ScreenHeader } from '@/components/common';
import { Brand, Derived, Palette } from '@/constants/theme';

/** 추천 스팟 더미 데이터 (디자인의 "지역/스팟명" 3개) */
const SPOTS = [
  { rank: 1, name: '지역/스팟명', info: '00km  I  광어, 멸치, 개복치' },
  { rank: 2, name: '지역/스팟명', info: '00km  I  광어, 멸치, 개복치' },
  { rank: 3, name: '지역/스팟명', info: '00km  I  광어, 멸치, 개복치' },
];

export default function HomeScreen() {
  return (
    <Screen scroll header={<ScreenHeader title="Fishlog" variant="brand" />}>
      {/* 히어로 카드 - 오늘의 추천 어종 */}
      <LinearGradient
        colors={[...Derived.heroGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}>
        <View style={styles.heroMain}>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroLabel}>오늘의 추천 어종</Text>
            <Text style={styles.heroTitle}>광어 잡기 좋은 날!</Text>
          </View>
          <Ionicons
            name="fish"
            size={110}
            color="rgba(255,255,255,0.9)"
            style={styles.heroFish}
          />
        </View>

        {/* 페이지 인디케이터 */}
        <View style={styles.dots}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
          ))}
        </View>
      </LinearGradient>

      {/* 통계 카드 2개 */}
      <View style={styles.statRow}>
        {/* 도감 진행도 */}
        <StatCard title="도감 진행도">
          <View style={styles.progressNumWrap}>
            <Text style={styles.progressNum}>34</Text>
            <Text style={styles.progressDenom}>/150종</Text>
          </View>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={[...Derived.progressGradient]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: '62%' }]}
            />
          </View>
        </StatCard>

        {/* 물고기 인증하기 */}
        <StatCard title="물고기 인증하기">
          <View style={styles.scanWrap}>
            <View style={styles.scanFrame}>
              <Ionicons name="fish" size={44} color={Brand.primary} />
            </View>
          </View>
        </StatCard>
      </View>

      {/* 추천 낚시 스팟 Top 3 */}
      <Text style={styles.sectionTitle}>추천 낚시 스팟 Top 3 🎣</Text>
      <View style={styles.spotList}>
        {SPOTS.map((s) => (
          <Pressable key={s.rank} style={styles.spotRow}>
            <View style={styles.pin}>
              <Ionicons name="location" size={34} color={Brand.primaryDark} />
              {/* 핀 머리 안쪽에 순위 숫자를 겹쳐 올린다 */}
              <View style={[StyleSheet.absoluteFill, styles.pinNumWrap]}>
                <Text style={styles.pinNum}>{s.rank}</Text>
              </View>
            </View>
            <View style={styles.spotText}>
              <Text style={styles.spotName}>{s.name}</Text>
              <Text style={styles.spotInfo}>{s.info}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={Derived.chevron} />
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
      colors={[...Derived.cardGradient]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.statCard}>
      <View style={styles.statHead}>
        <Text style={styles.statTitle}>{title}</Text>
        <Ionicons name="chevron-forward" size={20} color={Brand.primaryDark} />
      </View>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  // 히어로 — 본문(텍스트+물고기)은 row, 인디케이터는 그 아래 줄
  hero: {
    height: 168,
    borderRadius: 16,
    padding: 22,
    overflow: 'hidden',
  },
  heroMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTextWrap: { flex: 1, gap: 6 },
  heroLabel: { color: Palette.font.white, fontSize: 12, fontWeight: '600' },
  heroTitle: { color: Palette.font.white, fontSize: 22, fontWeight: '700' },
  heroFish: { transform: [{ rotate: '-8deg' }] },
  dots: { flexDirection: 'row', alignSelf: 'center', gap: 6 },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: { backgroundColor: Palette.font.white, width: 6, height: 6 },

  // 통계 카드
  statRow: { flexDirection: 'row', gap: 14, marginTop: 16 },
  statCard: {
    flex: 1,
    height: 140,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-between',
  },
  statHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statTitle: { fontSize: 16, fontWeight: '700', color: Brand.primaryDark },

  progressNumWrap: { flexDirection: 'row', alignItems: 'flex-end' },
  progressNum: { fontSize: 32, fontWeight: '700', color: Brand.primary },
  progressDenom: {
    fontSize: 15,
    fontWeight: '600',
    color: Brand.primary,
    marginBottom: 5,
  },
  progressTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: Palette.font.white,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 6 },

  scanWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scanFrame: {
    width: 74,
    height: 60,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Brand.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 스팟 섹션
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Brand.primaryDark,
    marginTop: 28,
    marginBottom: 14,
  },
  spotList: { gap: 12 },
  spotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.surfaceSoft,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  pin: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  /** 아이콘 위에 겹치는 배지. 좌표 대신 부모를 채우고 flex로 가운데 정렬한다 */
  pinNumWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 9,
  },
  pinNum: { fontSize: 11, fontWeight: '800', color: Brand.primaryDark },
  spotText: { flex: 1, gap: 2 },
  spotName: { fontSize: 16, fontWeight: '600', color: Brand.textStrong },
  spotInfo: { fontSize: 13, fontWeight: '400', color: Brand.textMuted },
});
