import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Brand, Components, Typography } from '@/constants/theme';
import type {
  CollectionProgressViewModel,
  FeaturedSlideViewModel,
  HomeSectionState,
  RecommendedSpotViewModel,
} from '@/features/home/use-home-view-model';

const AUTO_ADVANCE_MS = 4000;
const HERO = Components.home;

const FISH_POS = {
  featured: { right: 17, top: 0 },
  featuredShadow: { right: 0, top: 8 },
  unowned: { right: 8, top: 14 },
} as const;

/** 글로우가 우상단에 몰리도록 좌하단→우상단으로 긋고, 절반까지는 바탕색을 유지한다 */
const GLOW_START = { x: 0, y: 1 };
const GLOW_END = { x: 1, y: 0 };
const GLOW_LOCATIONS = [0.5, 1] as const;

/** 스팟 사진은 BE에 없어 분류별 대표 사진을 앱에 넣어 둔다 */
const SPOT_PHOTO = {
  해양: require('@/assets/images/home/recommended-spot-marine.jpg'),
  내륙: require('@/assets/images/home/recommended-spot-inland.jpg'),
} as const;

/** BE가 어종 사진을 아직 안 줄 때(imageUrl null) 쓰는 기본 그림 */
const FLATFISH = require('@/assets/images/home/featured-flatfish.png');
const FLATFISH_SHADOW = require('@/assets/images/home/featured-flatfish-shadow.png');

const FEATURED_LABEL = '오늘의 추천 어종';
/** 섹션이 준비되기 전·실패했을 때 제목 자리에 넣는 문구 */
const FEATURED_FALLBACK = {
  loading: '오늘의 바다를 읽는 중…',
  empty: '오늘은 추천 어종이 없어요',
  error: '추천 어종을 불러오지 못했어요',
} as const;
/** 도감 집계를 못 받았거나 이미 다 모았을 때 쓰는 문구 */
const UNOWNED_SUBTITLE_FALLBACK = '새로운 물고기를 잡고 도감을 채워보세요';
/**
 * 1위 스팟에 붙이는 설명.
 *
 * /api/spots/popular 의 순위 기준이 viewCount 라 '많이 찾아본'이라고 쓴다.
 * 집계 기간은 계약에 없어 '이번 주' 같은 기간은 넣지 않는다.
 */
const SPOT_SUBTITLE = '낚시꾼들이 가장 많이 찾아본 낚시터예요';
const SPOT_FALLBACK = {
  loading: '추천 스팟을 찾고 있어요',
  empty: '추천 스팟이 아직 없어요',
  error: '추천 스팟을 불러오지 못했어요',
} as const;

/**
 * 홈 히어로 캐러셀 (Figma 778:2648 · 778:2662 · 778:2679 / 958:2613).
 * 자동으로 넘어가되 사용자가 직접 스와이프하면 멈춘다.
 */
export function HeroCarousel({
  featured,
  collectionProgress,
  recommendedSpots,
}: {
  featured: HomeSectionState<FeaturedSlideViewModel>;
  collectionProgress: HomeSectionState<CollectionProgressViewModel>;
  recommendedSpots: HomeSectionState<readonly RecommendedSpotViewModel[]>;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [width, setWidth] = useState(0);
  const focused = useIsFocused();

  const slides = [
    <FeaturedSpeciesSlide key="featured" width={width} section={featured} />,
    <UnownedSpeciesSlide key="unowned" width={width} section={collectionProgress} />,
    <RecommendedSpotSlide key="spot" width={width} section={recommendedSpots} />,
  ];

  // 탭 화면은 마운트된 채 남으므로 다른 탭에 가 있는 동안엔 돌리지 않는다
  useEffect(() => {
    if (!autoPlay || !focused || width === 0) return;

    const timer = setTimeout(() => {
      const next = (index + 1) % slides.length;
      setIndex(next);
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
    }, AUTO_ADVANCE_MS);

    return () => clearTimeout(timer);
  }, [autoPlay, focused, width, index, slides.length]);

  const syncIndex = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width > 0) setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <View style={styles.card} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={() => setAutoPlay(false)}
        onMomentumScrollEnd={syncIndex}>
        {slides}
      </ScrollView>

      <View style={styles.dots}>
        {slides.map((slide, i) => (
          <View key={slide.key} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

/**
 * 슬라이드 우측 하단의 이동 링크.
 * 면 없이 글자만 두므로 슬라이드 배경에 맞는 색을 밖에서 받는다.
 */
function HeroCta({
  label,
  color,
  onPhoto,
  onPress,
}: {
  label: string;
  color: string;
  /** 사진 위에 얹을 때. 무늬가 많아 글자만으로는 안 읽혀 그림자를 깐다 */
  onPhoto?: boolean;
  onPress: () => void;
}) {
  const shadow = onPhoto ? styles.heroCtaShadow : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.heroCta, pressed && styles.heroCtaPressed]}>
      <Text style={[styles.heroCtaLabel, { color }, shadow]}>{label}</Text>
      <Ionicons name="chevron-forward" size={14} color={color} style={shadow} />
    </Pressable>
  );
}

/** 뒤에 흐릿한 실루엣을 깔아 그림자를 만든다 (Figma 778:2658/2659) */
function FeaturedSpeciesSlide({
  width,
  section,
}: {
  width: number;
  section: HomeSectionState<FeaturedSlideViewModel>;
}) {
  // 원격 사진이 안 열리면 기본 그림으로 돌아간다
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const imageUrl =
    section.status === 'ready' && section.data.imageUrl !== failedUrl
      ? section.data.imageUrl
      : null;
  const title =
    section.status === 'ready' ? section.data.title : FEATURED_FALLBACK[section.status];
  const router = useRouter();

  return (
    <View style={[styles.slide, { width }]}>
      <LinearGradient
        colors={[...Brand.heroSurface]}
        locations={GLOW_LOCATIONS}
        start={GLOW_START}
        end={GLOW_END}
        style={StyleSheet.absoluteFill}
      />
      {section.status === 'ready' ? (
        <>
          {/* 실루엣 그림자는 배경이 투명한 기본 그림에서만 — 원격 사진은 배경이 있을 수 있다 */}
          {imageUrl ? null : (
            <Image
              source={FLATFISH_SHADOW}
              style={[styles.featuredFish, styles.featuredFishShadow]}
              contentFit="contain"
              blurRadius={5.55}
            />
          )}
          <Image
            source={imageUrl ? { uri: imageUrl } : FLATFISH}
            style={styles.featuredFish}
            contentFit="contain"
            onError={() => setFailedUrl(imageUrl)}
          />
        </>
      ) : null}
      <Text style={[styles.label, styles.onDark]}>{FEATURED_LABEL}</Text>
      <Text numberOfLines={1} style={[styles.title, styles.onDark]}>
        {title}
      </Text>
      {/* 못 불러왔을 땐 안내 문구만 남기고 링크는 숨긴다 */}
      {section.status === 'ready' ? (
        <HeroCta
          label="인증하러 가기"
          color={Brand.onPrimary}
          onPress={() => router.push('/catch')}
        />
      ) : null}
      <View style={[styles.innerGlow, styles.innerGlowDark]} />
    </View>
  );
}

/**
 * 잡지 않은 어종이라 실루엣만 보여 준다 (Figma 778:2662).
 * 실루엣만 보여 주고 끝내지 않고 도감으로 보내는 버튼까지 둔다.
 */
function UnownedSpeciesSlide({
  width,
  section,
}: {
  width: number;
  section: HomeSectionState<CollectionProgressViewModel>;
}) {
  const router = useRouter();

  // 집계를 못 받았거나(비회원·오류) 다 모았으면 숫자 없는 문구로 돌아간다
  const remaining =
    section.status === 'ready' ? section.data.total - section.data.collected : 0;
  const subtitle =
    remaining > 0
      ? `아직 잡지 못한 ${remaining}종의 물고기를 채워보세요`
      : UNOWNED_SUBTITLE_FALLBACK;

  return (
    <View style={[styles.slide, { width }]}>
      <LinearGradient
        colors={[...Brand.heroSurfaceSoft]}
        locations={GLOW_LOCATIONS}
        start={GLOW_START}
        end={GLOW_END}
        style={StyleSheet.absoluteFill}
      />
      {/* ??? 는 실루엣 위에 겹쳐 올린다 — 어떤 어종인지 가리는 표시라서 */}
      <View pointerEvents="none" style={styles.unownedSilhouette}>
        <Image
          source={require('@/assets/images/home/unowned-fish.png')}
          style={styles.unownedFish}
          contentFit="contain"
          blurRadius={0.9}
        />
        <Text style={styles.unownedMark}>???</Text>
      </View>

      <Text style={[styles.label, styles.onLight]}>아직 만나지 못한 어종</Text>
      <Text numberOfLines={1} style={[styles.title, styles.onLight]}>
        도감에 빈자리가 있어요!
      </Text>
      <Text numberOfLines={2} style={styles.unownedSubtitle}>
        {subtitle}
      </Text>

      <HeroCta
        label="도감 채우러 가기"
        color={Brand.primaryDark}
        onPress={() => router.push('/dex')}
      />

      <View style={[styles.innerGlow, styles.innerGlowSoft]} />
    </View>
  );
}

function RecommendedSpotSlide({
  width,
  section,
}: {
  width: number;
  section: HomeSectionState<readonly RecommendedSpotViewModel[]>;
}) {
  const router = useRouter();
  const spot = section.status === 'ready' ? section.data[0] : null;
  const title = section.status === 'ready' ? section.data[0].name : SPOT_FALLBACK[section.status];
  const category = spot?.category ?? '해양';

  return (
    <View style={[styles.slide, styles.spotSlide, { width }]}>
      <Image
        source={SPOT_PHOTO[category]}
        style={category === '해양' ? styles.spotPhotoMarine : styles.spotPhotoInland}
        contentFit="cover"
      />
      <Text style={[styles.label, styles.onLight]}>지금 인기 스팟</Text>
      <Text numberOfLines={1} style={[styles.title, styles.onLight]}>
        {title}
      </Text>
      {spot ? (
        <Text numberOfLines={2} style={styles.spotSubtitle}>
          {SPOT_SUBTITLE}
        </Text>
      ) : null}
      {/*
        지도 화면은 spotId 를 받으면 그 스팟의 상세 시트를 연다.
        같은 스팟을 다시 눌러도 열리도록 매번 새 요청 값을 함께 넘긴다.
      */}
      {spot ? (
        <HeroCta
          label="지도에서 보기"
          color={Brand.onPrimary}
          onPhoto
          onPress={() =>
            router.navigate({
              pathname: '/map',
              params: { spotId: String(spot.id), searchRequest: String(Date.now()) },
            })
          }
        />
      ) : null}
      <View style={[styles.innerGlow, styles.innerGlowSoft]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: HERO.heroHeight,
    borderRadius: HERO.heroRadius,
    overflow: 'hidden',
    // 레이아웃 측정 전 한 프레임 동안 흰 배경이 비치지 않게 한다
    backgroundColor: Brand.heroSurface[0],
  },
  /** 그림이 옆 슬라이드로 넘치지 않게 슬라이드 단위로도 자른다 */
  slide: {
    height: HERO.heroHeight,
    overflow: 'hidden',
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
    position: 'absolute',
    ...FISH_POS.featured,
    width: 162.816,
    height: 162.816,
    transform: [{ rotate: '-15.29deg' }],
  },
  featuredFishShadow: { ...FISH_POS.featuredShadow, opacity: 0.2 },
  /** ??? 를 실루엣 위에 겹쳐 올리는 칸 */
  unownedSilhouette: {
    position: 'absolute',
    ...FISH_POS.unowned,
    width: 140,
    height: 140,
  },
  unownedFish: {
    width: 140,
    height: 140,
    opacity: 0.4,
    transform: [{ rotate: '-7.6deg' }],
  },
  /**
   * 물고기 한가운데에 얹는다.
   *
   * 그림 파일(384×384)에서 물고기가 실제로 차지하는 칸은 세로 31%~70% 라
   * 가운데가 0.507 · 약 71 이다. 글줄 높이의 절반을 빼 그 지점에 맞춘다.
   */
  unownedMark: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 63,
    textAlign: 'center',
    ...Typography.heroTitle,
    fontSize: 14,
    lineHeight: 16,
    color: Brand.textHeading,
    opacity: 0.7,
  },
  /** 그림에 가리지 않도록 글줄 폭을 잡아 둔다 */
  unownedSubtitle: {
    ...Typography.cardCaption,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
    maxWidth: 165,
    color: Brand.textMuted,
  },
  spotSubtitle: {
    ...Typography.cardCaption,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
    maxWidth: 200,
    color: Brand.textHeading,
  },
  /** 면 없이 글자만 두므로 터치 영역은 패딩으로 벌려 둔다 */
  heroCta: {
    position: 'absolute',
    right: HERO.heroPadding - 6,
    bottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  heroCtaPressed: { opacity: 0.6 },
  heroCtaLabel: { ...Typography.chipLabel, fontSize: 12 },
  heroCtaShadow: {
    textShadowColor: 'rgba(0, 42, 68, 0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  // 사진은 좌우를 함께 못 박아 카드가 넓어져도 흰 여백이 생기지 않는다
  spotPhotoMarine: {
    position: 'absolute',
    left: -42.3,
    right: -59.7,
    top: -32.6,
    height: 339,
    transform: [{ rotate: '2.69deg' }],
  },
  spotPhotoInland: {
    position: 'absolute',
    left: -57,
    right: -26,
    top: -7,
    height: 325,
  },

  innerGlow: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    borderRadius: HERO.heroRadius,
  },
  innerGlowDark: { boxShadow: `inset 3px 1px 13px 2px ${HERO.heroInnerGlow}` },
  innerGlowSoft: { boxShadow: `inset 3px 1px 13px 2px ${HERO.heroInnerGlowSoft}` },

  dots: {
    position: 'absolute',
    pointerEvents: 'none',
    left: 0,
    right: 0,
    bottom: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 2.67,
  },
  /** 연한 슬라이드에서도 흰색이다 (Figma 778:2731) */
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Brand.onPrimary,
    opacity: 0.42,
  },
  dotActive: { opacity: 1 },
});
