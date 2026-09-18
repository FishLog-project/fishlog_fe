// Run with: node scripts/check-home-data.cjs
const assert = require('node:assert/strict');
const { load, host, flush, nodes } = require('./check-dex-data.cjs');

async function main() {
  const requests = [];
  let bannerAttempts = 0;
  let banner = [{ fishId: 7, name: '광어', imageUrl: 'https://example.test/server-fish.png?rev=1' }];
  let waitingBanner = null;
  let popularSpots = [];
  const client = {
    ...load('src/lib/api/client.ts', { 'expo/fetch': {} }),
    apiRequest: async (route, options = {}) => {
      requests.push({ route, ...options });
      switch (route) {
        case '/api/banner/seasonal-fish':
          if (++bannerAttempts === 1) throw new Error('temporary offline');
          return waitingBanner ?? banner;
        case '/api/collections/custom/dex': return { fishes: [] };
        case '/api/collections/dex': return { totalCount: 24, caughtCount: 6, fishes: [] };
        case '/api/spots/popular': return popularSpots;
        default: throw new Error(`Unexpected route: ${route}`);
      }
    },
  };
  const apiModule = load('src/features/home/home-api.ts', {
    '@/lib/api/client': client,
    '@/features/dex/dex-api': load('src/features/dex/dex-api.ts', {
      '@/lib/api/client': client,
      '@/lib/api/result': load('src/lib/api/result.ts', { './client': client }),
    }),
  });
  const source = apiModule.createApiFishLogDataSource('test-token');
  const sectionHost = host();
  const models = load('src/features/home/use-home-view-model.ts', {
    '@/lib/use-section': load('src/lib/use-section.ts', { react: sectionHost.react }),
  });
  const render = (dataSource = source) => sectionHost.render(models.useHomeViewModel, dataSource);
  render();
  await flush();
  let current = render();
  assert.equal(current.viewModel.featuredSpecies.status, 'error');
  assert.equal(current.viewModel.collectionProgress.status, 'ready', 'banner failure must not fail other sections');
  assert.equal(current.viewModel.collectionProgress.data.progressPercent, 25);
  assert.equal(current.viewModel.recommendedSpots.status, 'empty');
  const count = (route) => requests.filter((request) => request.route === route).length;
  assert.equal(requests.find((request) => request.route === '/api/collections/dex').token, 'test-token');
  assert.deepEqual(requests.filter((request) => request.route.startsWith('/api/collections/')).map((request) => request.route), ['/api/collections/custom/dex', '/api/collections/dex'], 'home must establish the session before reading personalized public progress');
  assert.equal(requests.find((request) => request.route === '/api/banner/seasonal-fish').token, undefined);
  assert.equal(typeof current.retryFeaturedSpecies, 'function');
  current.retryFeaturedSpecies();
  assert.equal(render().viewModel.featuredSpecies.status, 'loading');
  await flush();
  current = render();
  assert.equal(bannerAttempts, 2);
  assert.equal(current.viewModel.featuredSpecies.data.imageUrl, banner[0].imageUrl);
  assert.equal(current.viewModel.featuredSpecies.data.title, '광어 잡기 좋은 날!');
  assert.equal(count('/api/collections/dex'), 1, 'banner retry must not re-fetch progress');
  assert.equal(count('/api/spots/popular'), 1, 'banner retry must not re-fetch spots');

  const readyBanner = banner;
  banner = [];
  current.retryFeaturedSpecies();
  render();
  await flush();
  current = render();
  assert.equal(current.viewModel.featuredSpecies.status, 'empty');
  banner = readyBanner;
  let finishOldBanner;
  waitingBanner = new Promise((resolve) => { finishOldBanner = resolve; });
  current.retryFeaturedSpecies();
  render();
  waitingBanner = null;
  banner = [{ fishId: 3, name: '돌돔', imageUrl: 'https://example.test/new-server-fish.png?rev=2' }];
  const nextSource = apiModule.createApiFishLogDataSource('new-token');
  render(nextSource);
  await flush();
  assert.equal(render(nextSource).viewModel.featuredSpecies.data.imageUrl, banner[0].imageUrl);
  finishOldBanner(readyBanner);
  await flush();
  assert.equal(render(nextSource).viewModel.featuredSpecies.data.imageUrl, banner[0].imageUrl, 'late old-source banner must not replace the new one');
  sectionHost.unmount();
  const beforeGuest = requests.length;
  await assert.rejects(() => apiModule.createApiFishLogDataSource(null).getCollectionProgress(), /로그인/);
  assert.equal(requests.length, beforeGuest);

  // Follow the real HomeScreen -> HeroCarousel -> retry Pressable callback back into the hook.
  requests.length = 0;
  bannerAttempts = 0;
  popularSpots = [{ id: 12, name: '인기 낚시터', lat: 37, lot: 127, category: '해양', majorFishes: ['광어'], viewCount: 100 }];
  const navigations = [];
  const router = { navigate: (target) => navigations.push(target) };
  const colors = load('src/constants/colors.ts');
  const theme = {
    ...colors,
    ...load('src/constants/components.ts', { './colors': colors }),
    ...load('src/constants/typography.ts', { '@/global.css': {} }),
  };
  const uiHost = host();
  const carouselHost = host();
  const artworkHost = host();
  const art = load('src/features/dex/fish-art.tsx', {
    react: artworkHost.react, 'expo-image': { Image: 'Image' }, '@/constants/theme': theme,
  });
  let fontScale = 1;
  const uiImports = {
    'react-native': {
      ...Object.fromEntries(['ActivityIndicator', 'Pressable', 'ScrollView', 'Text', 'View'].map((name) => [name, name])),
      StyleSheet: { create: (styles) => styles, absoluteFill: {} },
      useWindowDimensions: () => ({ width: 390, height: 844, fontScale }),
    },
    '@expo/vector-icons': { Ionicons: 'Ionicons' },
    'expo-image': { Image: 'Image' },
    'expo-linear-gradient': { LinearGradient: 'LinearGradient' },
    '@/constants/theme': theme,
    '@/features/dex/fish-art': art,
  };
  const carousel = load('src/features/home/components/hero-carousel.tsx', {
    ...uiImports, react: carouselHost.react, 'expo-router': { useIsFocused: () => false, useRouter: () => router },
  });
  let onFocus;
  const screen = load('src/app/(tabs)/home/index.tsx', {
    ...uiImports,
    react: uiHost.react,
    'expo-router': { useRouter: () => router, useFocusEffect: (callback) => { onFocus = callback; } },
    '@/components/common': Object.fromEntries(['Screen', 'ScreenHeader', 'ScreenState', 'SectionTitle'].map((name) => [name, name])),
    '@/features/auth': { useAuth: () => ({ token: 'test-token' }) },
    '@/features/home/home-api': apiModule,
    '@/features/home/home-data': {},
    '@/features/home/components/hero-carousel': carousel,
    '@/features/home/use-home-view-model': load('src/features/home/use-home-view-model.ts', {
      '@/lib/use-section': load('src/lib/use-section.ts', { react: uiHost.react }),
    }),
    '@/lib/data-source-mode': { USE_FIXTURE: false },
  }).default;
  const hero = () => nodes(uiHost.render(screen)).find((node) => node.type === carousel.HeroCarousel);
  const featuredSlide = (heroProps) => {
    const tree = carouselHost.render(carousel.HeroCarousel, heroProps);
    const slide = nodes(tree).find((node) => node.type?.name === 'FeaturedSpeciesSlide');
    return slide.type(slide.props);
  };
  uiHost.render(screen);
  await flush();
  let heroElement = hero();
  assert.equal(heroElement.props.featured.status, 'error');
  const retry = nodes(featuredSlide(heroElement.props)).find((node) => node.props?.accessibilityLabel === '추천 어종 다시 시도');
  assert.equal(retry.props.accessibilityRole, 'button');
  retry.props.onPress();
  assert.equal(hero().props.featured.status, 'loading');
  await flush();
  heroElement = hero();
  assert.equal(heroElement.props.featured.status, 'ready');
  assert.equal(bannerAttempts, 2, 'the visible retry button must actually request the banner again');
  const readySlide = nodes(featuredSlide(heroElement.props));
  assert.equal(readySlide.some((node) => node.props?.accessibilityLabel === '추천 어종 다시 시도'), false);
  const artwork = readySlide.find((node) => node.type === art.FishArtwork && node.props.tintColor === undefined);
  assert.equal(artwork.props.imageUrl, banner[0].imageUrl);
  let carouselTree = carouselHost.render(carousel.HeroCarousel, heroElement.props);
  const spotSlide = nodes(carouselTree).find((node) => node.type?.name === 'RecommendedSpotSlide');
  nodes(spotSlide.type(spotSlide.props)).find((node) => node.type?.name === 'HeroCta').props.onPress();
  const row = nodes(uiHost.render(screen)).find((node) => node.props?.accessibilityLabel?.startsWith('1위 인기 낚시터'));
  row.props.onPress();
  assert.equal(navigations.length, 2);
  for (const target of navigations) {
    assert.equal(target.pathname, '/map');
    assert.equal(target.params.spotId, '12', 'banner and recommended row must pass the actual API spot ID');
    assert.ok(target.params.searchRequest, 'each selection must identify a new map request');
  }
  carouselTree.props.onLayout({ nativeEvent: { layout: { width: 350 } } });
  carouselTree = carouselHost.render(carousel.HeroCarousel, heroElement.props);
  const featuredNode = (tree) => nodes(tree).find((node) => node.type?.name === 'FeaturedSpeciesSlide');
  assert.equal(featuredNode(carouselTree).props.expanded, false, 'normal size preserves Figma art placement');
  fontScale = 2;
  carouselTree = carouselHost.render(carousel.HeroCarousel, heroElement.props);
  assert.equal(featuredNode(carouselTree).props.expanded, true, 'large text must move the artwork below the title');
  for (const slide of nodes(carouselTree).filter((node) => /SpeciesSlide|SpotSlide/.test(node.type?.name))) {
    const content = nodes(slide.type(slide.props));
    if (slide.props.section.status === 'ready' || slide.type.name === 'UnownedSpeciesSlide') {
      assert.ok(content.some((node) => node.type?.name === 'HeroCta'), 'large text must retain the slide action');
    }
    for (const text of content.filter((node) => node.type === 'Text')) {
      assert.equal(text.props.numberOfLines, undefined, 'large text must wrap instead of losing the banner copy');
    }
  }
  let scrolledTo;
  const scroll = nodes(carouselTree).find((node) => node.type === 'ScrollView');
  scroll.props.ref.current = { scrollTo: (position) => { scrolledTo = position; } };
  scroll.props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: 350 } } });
  carouselTree = carouselHost.render(carousel.HeroCarousel, heroElement.props);
  carouselTree.props.onLayout({ nativeEvent: { layout: { width: 760 } } });
  carouselTree = carouselHost.render(carousel.HeroCarousel, heroElement.props);
  nodes(carouselTree).find((node) => node.type === 'ScrollView').props.onContentSizeChange();
  assert.equal(scrolledTo.x, 760, 'rotation must keep the second slide rather than an offset between slides');
  fontScale = 1;
  carouselTree.props.onLayout({ nativeEvent: { layout: { width: 280 } } });
  carouselTree = carouselHost.render(carousel.HeroCarousel, heroElement.props);
  assert.equal(featuredNode(carouselTree).props.expanded, true, 'small phones need room for the full banner title');
    const displayed = artworkHost.render(art.FishArtwork, artwork.props);
  assert.equal(displayed.props.source, banner[0].imageUrl);

  // 마운트 직후의 첫 포커스는 이미 보낸 요청을 되풀이하지 않는다.
  onFocus();
  assert.equal(hero().props.featured.status, 'ready');
  assert.equal(bannerAttempts, 2, 'the first focus must not repeat the mount request');
  assert.equal(count('/api/collections/dex'), 1, 'the first focus must not repeat the progress request');

  onFocus();
  assert.equal(hero().props.featured.status, 'loading');
  await flush();
  assert.equal(hero().props.featured.status, 'ready');
  assert.equal(bannerAttempts, 3, 'home focus must re-fetch the banner after returning');
  assert.equal(count('/api/collections/dex'), 2, 'home focus must preserve progress refresh');
  assert.equal(count('/api/spots/popular'), 1);
  uiHost.unmount();
  carouselHost.unmount();
  artworkHost.unmount();
  console.log('home checks passed: isolated banner error/retry, empty/source races, server image URL, visible retry button, guest and focus refresh');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
