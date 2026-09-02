import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Brand, Typography } from '@/constants/theme';
import type { FeaturedSlideViewModel } from '@/features/home/use-home-view-model';

/** 자동으로 다음 슬라이드로 넘어가는 주기 */
const AUTO_ADVANCE_MS = 4000;

const CARD_HEIGHT = 168;

/**
 * ⚠️ 임시 — 배경 PNG 하단에 인디케이터 점 5개가 함께 구워져 있다(TODO.md 3-2).
 * 이미지를 카드보다 세로로 크게 그려서 그 영역이 overflow에 잘리게 한다.
 * 점 없는 에셋을 받으면 이 값을 CARD_HEIGHT로 되돌린다.
 */
const ART_HEIGHT = 182;

/**
 * 홈 히어로 캐러셀.
 *
 * 자동으로 넘어가되 사용자가 직접 스와이프하면 멈춘다 (읽는 중에 화면이 움직이지 않도록).
 * 인디케이터는 실제 스크롤 위치를 따라간다.
 *
 * ⚠️ 배경 일러스트는 아직 어종별 에셋이 없어 모든 슬라이드가 같은 그림을 쓴다.
 *    에셋이 들어오면 slide별 이미지로 교체한다.
 */
export function HeroCarousel({
  slides,
  label,
}: {
  slides: readonly FeaturedSlideViewModel[];
  label: string;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  // 슬라이드 폭 = 카드 폭. 화면 좌우 여백을 뺀 값이라 기기마다 다르다.
  const [width, setWidth] = useState(0);

  // 타이머가 최신 index를 읽되, index가 바뀔 때마다 타이머를 다시 걸지 않도록 ref로 둔다.
  const indexRef = useRef(0);

  useEffect(() => {
    if (!autoPlay || width === 0 || slides.length < 2) return;

    const timer = setInterval(() => {
      const next = (indexRef.current + 1) % slides.length;
      // index 갱신은 onMomentumScrollEnd가 한다 (스와이프와 경로를 하나로 유지)
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
    }, AUTO_ADVANCE_MS);

    return () => clearInterval(timer);
  }, [autoPlay, width, slides.length]);

  const syncIndex = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width === 0) return;
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    indexRef.current = next;
    setIndex(next);
  };

  return (
    <View
      style={styles.card}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={() => setAutoPlay(false)}
        onMomentumScrollEnd={syncIndex}>
        {slides.map((slide) => (
          <View key={slide.speciesId} style={[styles.slide, { width }]}>
            <Image
              source={require('@/assets/images/home/hero-card.png')}
              style={styles.art}
              contentFit="fill"
            />
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.title}>{slide.title}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots} pointerEvents="none">
        {slides.map((slide, i) => (
          <View
            key={slide.speciesId}
            style={[styles.dot, i === index && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: CARD_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    // 레이아웃 측정 전 한 프레임 동안 흰 배경이 비치지 않게 한다
    backgroundColor: Brand.primary,
  },
  slide: { height: CARD_HEIGHT, paddingLeft: 24, paddingTop: 24 },
  art: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ART_HEIGHT,
  },
  label: { ...Typography.heroLabel, color: Brand.onPrimary },
  title: { ...Typography.heroTitle, color: Brand.onPrimary, marginTop: 2 },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 2.67,
  },
  /** Figma 75:1853 — 4pt 원 5개, 간격 6.67 (지름 4 + 여백 2.67) */
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Brand.onPrimary,
    opacity: 0.5,
  },
  dotActive: { opacity: 1 },
});
