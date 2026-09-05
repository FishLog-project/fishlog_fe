import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Brand, Components, Typography } from "@/constants/theme";
import type {
  FeaturedSlideViewModel,
  RecommendedSpotViewModel,
} from "@/features/home/use-home-view-model";

const AUTO_ADVANCE_MS = 4000;
const SLIDE_COUNT = 3;
const HERO = Components.home;

/** 배너 물고기 위치. right를 키우면 왼쪽으로, top을 줄이면 위로 간다 */
const FISH_POS = {
  featured: { right: 17, top: 0 },
  featuredShadow: { right: 0, top: 8 },
  unowned: { right: 38, top: 28.6 },
} as const;

/** 글로우가 우상단에 몰리도록 좌하단→우상단으로 긋고, 절반까지는 바탕색을 유지한다 */
const GLOW_START = { x: 0, y: 1 };
const GLOW_END = { x: 1, y: 0 };
const GLOW_LOCATIONS = [0.5, 1] as const;

/** 스팟 사진은 BE에 없어 분류별 대표 사진을 앱에 넣어 둔다 */
const SPOT_PHOTO = {
  해양: require("@/assets/images/home/recommended-spot-marine.jpg"),
  내륙: require("@/assets/images/home/recommended-spot-inland.jpg"),
} as const;

/** BE가 어종 사진을 아직 안 줄 때(imageUrl null) 쓰는 기본 그림 */
const FLATFISH = require("@/assets/images/home/featured-flatfish.png");
const FLATFISH_SHADOW = require("@/assets/images/home/featured-flatfish-shadow.png");

/**
 * 홈 히어로 캐러셀 (Figma 778:2648 · 778:2662 · 778:2679 / 958:2613).
 * 자동으로 넘어가되 사용자가 직접 스와이프하면 멈춘다.
 */
export function HeroCarousel({
  featured,
  label,
  recommendedSpot,
}: {
  featured: FeaturedSlideViewModel;
  label: string;
  /** 스팟 섹션이 준비되기 전엔 비어 있고, 슬라이드는 안내 문구를 보여 준다 */
  recommendedSpot?: RecommendedSpotViewModel;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  // 슬라이드 폭 = 카드 폭. 기기마다 다르다
  const [width, setWidth] = useState(0);

  // 타이머가 index를 읽되, index가 바뀔 때마다 타이머를 다시 걸지 않도록 ref로 둔다
  const indexRef = useRef(0);

  useEffect(() => {
    if (!autoPlay || width === 0) return;

    const timer = setInterval(() => {
      const next = (indexRef.current + 1) % SLIDE_COUNT;
      // 프로그램 스크롤은 플랫폼에 따라 onMomentumScrollEnd가 오지 않아 여기서 바로 맞춘다
      indexRef.current = next;
      setIndex(next);
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
    }, AUTO_ADVANCE_MS);

    return () => clearInterval(timer);
  }, [autoPlay, width]);

  const syncIndex = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width === 0) return;
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    indexRef.current = Math.max(0, Math.min(SLIDE_COUNT - 1, next));
    setIndex(indexRef.current);
  };

  return (
    <View
      style={styles.card}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={() => setAutoPlay(false)}
        onMomentumScrollEnd={syncIndex}
      >
        <FeaturedSpeciesSlide
          width={width}
          label={label}
          title={featured.title}
          imageUrl={featured.imageUrl}
        />
        <UnownedSpeciesSlide width={width} />
        <RecommendedSpotSlide width={width} spot={recommendedSpot} />
      </ScrollView>

      <View style={styles.dots}>
        {Array.from({ length: SLIDE_COUNT }, (_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

/** 뒤에 흐릿한 실루엣을 깔아 그림자를 만든다 (Figma 778:2658/2659) */
function FeaturedSpeciesSlide({
  width,
  label,
  title,
  imageUrl,
}: {
  width: number;
  label: string;
  title: string;
  imageUrl: string | null;
}) {
  const fish = imageUrl ? { uri: imageUrl } : FLATFISH;

  return (
    <View style={[styles.slide, { width }]}>
      <LinearGradient
        colors={[...Brand.heroSurface]}
        locations={GLOW_LOCATIONS}
        start={GLOW_START}
        end={GLOW_END}
        style={StyleSheet.absoluteFill}
      />
      <Image
        source={imageUrl ? fish : FLATFISH_SHADOW}
        style={[styles.featuredFish, styles.featuredFishShadow]}
        contentFit="contain"
        blurRadius={5.55}
        tintColor={imageUrl ? Brand.textStrong : undefined}
      />
      <Image source={fish} style={styles.featuredFish} contentFit="contain" />
      <Text style={[styles.label, styles.onDark]}>{label}</Text>
      <Text numberOfLines={1} style={[styles.title, styles.onDark]}>
        {title}
      </Text>
      <View style={styles.innerGlow} />
    </View>
  );
}

/** 잡지 않은 어종이라 실루엣만 보여 준다 (Figma 778:2662) */
function UnownedSpeciesSlide({ width }: { width: number }) {
  return (
    <View style={[styles.slide, { width }]}>
      <LinearGradient
        colors={[...Brand.heroSurfaceSoft]}
        locations={GLOW_LOCATIONS}
        start={GLOW_START}
        end={GLOW_END}
        style={StyleSheet.absoluteFill}
      />
      <Image
        source={require("@/assets/images/home/unowned-fish.png")}
        style={styles.unownedFish}
        contentFit="contain"
        blurRadius={0.9}
      />
      <Text style={[styles.label, styles.onLight]}>미보유 어종</Text>
      <Text numberOfLines={1} style={[styles.title, styles.onLight]}>
        이 물고기는 무엇일까요?
      </Text>
      <View style={styles.innerGlowSoft} />
    </View>
  );
}

function RecommendedSpotSlide({
  width,
  spot,
}: {
  width: number;
  spot?: RecommendedSpotViewModel;
}) {
  const category = spot?.category ?? "해양";

  return (
    <View style={[styles.slide, styles.spotSlide, { width }]}>
      <Image
        source={SPOT_PHOTO[category]}
        style={
          category === "해양" ? styles.spotPhotoMarine : styles.spotPhotoInland
        }
        contentFit="cover"
      />
      <Text style={[styles.label, styles.onLight]}>추천 스팟</Text>
      <Text numberOfLines={1} style={[styles.title, styles.onLight]}>
        {spot?.name ?? "추천 스팟을 찾고 있어요"}
      </Text>
      <View style={styles.innerGlowSoft} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: HERO.heroHeight,
    borderRadius: HERO.heroRadius,
    overflow: "hidden",
    // 레이아웃 측정 전 한 프레임 동안 흰 배경이 비치지 않게 한다
    backgroundColor: Brand.heroSurface[0],
  },
  /** 그림이 옆 슬라이드로 넘치지 않게 슬라이드 단위로도 자른다 */
  slide: {
    height: HERO.heroHeight,
    overflow: "hidden",
    paddingLeft: HERO.heroPadding,
    paddingTop: HERO.heroPadding,
  },
  spotSlide: { backgroundColor: Brand.background },
  label: { ...Typography.heroLabel },
  title: { ...Typography.heroTitle, marginTop: HERO.labelGap },
  onDark: { color: Brand.onPrimary },
  onLight: { color: Brand.textHeading },

  // 그림은 오른쪽 끝을 기준으로 잡아 카드 폭이 달라져도 우측 구도를 유지한다
  featuredFish: {
    position: "absolute",
    ...FISH_POS.featured,
    width: 162.816,
    height: 162.816,
    transform: [{ rotate: "-15.29deg" }],
  },
  featuredFishShadow: { ...FISH_POS.featuredShadow, opacity: 0.2 },
  unownedFish: {
    position: "absolute",
    ...FISH_POS.unowned,
    width: 140,
    height: 140,
    opacity: 0.4,
    transform: [{ rotate: "-7.6deg" }],
  },
  // 사진은 좌우를 함께 못 박아 카드가 넓어져도 흰 여백이 생기지 않는다
  /** Figma 778:2698 */
  spotPhotoMarine: {
    position: "absolute",
    left: -42.3,
    right: -59.7,
    top: -32.6,
    height: 339,
    transform: [{ rotate: "2.69deg" }],
  },
  /** Figma 978:3001 */
  spotPhotoInland: {
    position: "absolute",
    left: -57,
    right: -26,
    top: -7,
    height: 325,
  },

  /** Figma의 inset shadow */
  innerGlow: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    borderRadius: HERO.heroRadius,
    boxShadow: `inset 3px 1px 13px 2px ${HERO.heroInnerGlow}`,
  },
  innerGlowSoft: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    borderRadius: HERO.heroRadius,
    boxShadow: `inset 3px 1px 13px 2px ${HERO.heroInnerGlowSoft}`,
  },

  dots: {
    position: "absolute",
    pointerEvents: "none",
    left: 0,
    right: 0,
    bottom: 8,
    flexDirection: "row",
    justifyContent: "center",
    gap: 2.67,
  },
  /** Figma 778:2731 — 연한 슬라이드에서도 흰색이다 */
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Brand.onPrimary,
    opacity: 0.42,
  },
  dotActive: { opacity: 1 },
});
