import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/constants/theme';

/** 추천 스팟 더미 데이터 (디자인의 "지역/스팟명" 3개) */
const SPOTS = [
  { rank: 1, name: '지역/스팟명', info: '00km  I  광어, 멸치, 개복치' },
  { rank: 2, name: '지역/스팟명', info: '00km  I  광어, 멸치, 개복치' },
  { rank: 3, name: '지역/스팟명', info: '00km  I  광어, 멸치, 개복치' },
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* 헤더 */}
        <Text style={styles.brand}>Fishlog</Text>

        {/* 히어로 카드 - 오늘의 추천 어종 */}
        <LinearGradient
          colors={['#1D79E9', '#2E9BF5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}>
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
          {/* 페이지 인디케이터 */}
          <View style={styles.dots}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[styles.dot, i === 0 && styles.dotActive]}
              />
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
                colors={[...Brand.progress]}
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
                <Text style={styles.pinNum}>{s.rank}</Text>
              </View>
              <View style={styles.spotText}>
                <Text style={styles.spotName}>{s.name}</Text>
                <Text style={styles.spotInfo}>{s.info}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={22}
                color="#9DC4DD"
              />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
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
      colors={[...Brand.cardGradient]}
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
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingHorizontal: 20, paddingBottom: 24 },

  brand: {
    fontSize: 28,
    fontWeight: '600',
    color: Brand.primary,
    textAlign: 'center',
    marginVertical: 14,
  },

  // 히어로
  hero: {
    height: 168,
    borderRadius: 16,
    padding: 22,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  heroTextWrap: { gap: 6 },
  heroLabel: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  heroTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  heroFish: {
    position: 'absolute',
    right: 18,
    top: 40,
    transform: [{ rotate: '-8deg' }],
  },
  dots: {
    position: 'absolute',
    bottom: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: { backgroundColor: '#FFFFFF', width: 6, height: 6 },

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
  progressNum: { fontSize: 32, fontWeight: '700', color: '#00A0F0' },
  progressDenom: {
    fontSize: 15,
    fontWeight: '600',
    color: '#00A0F0',
    marginBottom: 5,
  },
  progressTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: Brand.spotBg,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  pin: { width: 40, alignItems: 'center', justifyContent: 'center' },
  pinNum: {
    position: 'absolute',
    top: 5,
    fontSize: 11,
    fontWeight: '800',
    color: Brand.primaryDark,
  },
  spotText: { flex: 1, gap: 2 },
  spotName: { fontSize: 16, fontWeight: '600', color: Brand.textStrong },
  spotInfo: { fontSize: 13, fontWeight: '400', color: Brand.textMuted },
});
