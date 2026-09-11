// Run with: node scripts/check-home-data.cjs
const assert = require('node:assert/strict');
const { load, host, flush, nodes } = require('./check-dex-data.cjs');

async function main() {
  const requests = [];
  let bannerAttempts = 0;
  let banner = [{ fishId: 7, name: '광어', imageUrl: 'https://example.test/server-fish.png?rev=1' }];
  let waitingBanner = null;
  const apiModule = load('src/features/home/home-api.ts', {
    '@/lib/api/client': { apiRequest: async (route, options = {}) => {
      requests.push({ route, ...options });
      switch (route) {
        case '/api/banner/seasonal-fish':
          if (++bannerAttempts === 1) throw new Error('temporary offline');
          return waitingBanner ?? banner;
        case '/api/collections/dex': return { totalCount: 24, caughtCount: 6 };
        case '/api/spots/popular': return [];
        default: throw new Error(`Unexpected route: ${route}`);
      }
    } },
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
  const uiImports = {
    'react-native': {
      ...Object.fromEntries(['ActivityIndicator', 'Pressable', 'ScrollView', 'Text', 'View'].map((name) => [name, name])),
      StyleSheet: { create: (styles) => styles, absoluteFill: {} },
    },
    'expo-image': { Image: 'Image' },
    'expo-linear-gradient': { LinearGradient: 'LinearGradient' },
    '@/constants/theme': theme,
    '@/features/dex/fish-art': art,
  };
  const carousel = load('src/features/home/components/hero-carousel.tsx', {
    ...uiImports, react: carouselHost.react, 'expo-router': { useIsFocused: () => false },
  });
  let onFocus;
  const screen = load('src/app/(tabs)/home/index.tsx', {
    ...uiImports,
    react: uiHost.react,
    'expo-router': { useRouter: () => ({}), useFocusEffect: (callback) => { onFocus = callback; } },
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
