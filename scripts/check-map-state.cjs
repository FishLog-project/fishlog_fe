// Run with: node scripts/check-map-state.cjs
const assert = require('node:assert/strict');
const { load, host, flush, nodes } = require('./check-dex-data.cjs');

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

async function check() {
  let active;
  const react = Object.fromEntries(Object.keys(host().react).map((name) => [name, (...args) => active.react[name](...args)]));
  let notifications = 0;
  react.useSyncExternalStore = (subscribe, snapshot) => {
    react.useEffect(() => subscribe(() => { notifications++; }), [subscribe]);
    return snapshot();
  };
  const render = (h, fn, ...args) => { active = h; h.render(fn, ...args); return h.render(fn, ...args); };
  const store = load('src/features/map/spot-list-store.ts', { react });
  const fixture = load('src/features/map/spot-data.ts');
  const source = fixture.createFixtureSpotDataSource();
  const vm = load('src/features/map/use-spot-view-model.ts', {
    react,
    '@/features/map/kakao-address': { lookupAddress: async () => null },
    '@/features/map/spot-list-store': store,
    '@/lib/use-section': load('src/lib/use-section.ts', { react }),
  });
  const map = host();
  render(map, store.useSpotList, source, 'session-1');
  await flush();
  const list = () => render(map, store.useSpotList, source, 'session-1')[0];
  const favorite = () => list().spots.find((spot) => spot.id === 2).isFavorite;
  assert.equal(favorite(), false);
  const onChange = (id, value) => store.setSpotFavorite('session-1', id, value);
  const mapHeart = host();
  render(mapHeart, vm.useSpotFavorite, source, 2, false, onChange).toggle();
  await flush();
  assert.equal(favorite(), true);
  assert.ok(notifications > 0, 'shared store must notify other mounted screens');

  // A refresh started before a saved-list mutation must not resurrect its old heart.
  const savedList = host();
  assert.equal(render(savedList, vm.useSavedSpotsViewModel, source, 'session-1')[0].data.find((spot) => spot.id === 2).isFavorite, true);
  const oldRefresh = deferred();
  const oldSpots = await source.getSpots();
  render(map, store.useSpotList, { ...source, getSpots: () => oldRefresh.promise }, 'session-1')[1]();
  const savedHeart = host();
  render(savedHeart, vm.useSpotFavorite, source, 2, true, onChange).toggle();
  await flush();
  assert.equal(favorite(), false, 'saved-list change must immediately reach map cache');
  assert.equal(render(savedList, vm.useSavedSpotsViewModel, source, 'session-1')[0].data.find((spot) => spot.id === 2).isFavorite, false, 'saved row remains for undo with the updated shared heart');
  oldRefresh.resolve(oldSpots);
  await flush();
  assert.equal(favorite(), false, 'older list response must not overwrite the mutation');
  assert.equal(list().refreshing, false);
  assert.equal(render(mapHeart, vm.useSpotFavorite, source, 2, false, onChange).isFavorite, false, 'mounted map detail follows shared initial value');
  render(map, store.useSpotList, source, 'session-1')[1]();
  await flush();
  assert.equal(favorite(), false, 'later refresh agrees with current server data');

  const pending = deferred();
  let mutations = 0;
  const failedHeart = host();
  const failing = { ...source, addFavorite: () => { mutations++; return pending.promise; } };
  const toggle = render(failedHeart, vm.useSpotFavorite, failing, 2, false, onChange).toggle;
  toggle(); toggle();
  assert.equal(mutations, 1, 'same-frame repeated taps must issue only one request');
  pending.reject(new Error('offline'));
  await flush();
  const failed = render(failedHeart, vm.useSpotFavorite, failing, 2, false, onChange);
  assert.equal(failed.isFavorite, false);
  assert.equal(failed.failure, 'offline');
  assert.equal(favorite(), false, 'failed mutation never changes the shared cache');

  const session2 = host();
  render(session2, store.useSpotList, source, 'session-2');
  await flush();
  store.setSpotFavorite('session-1', 2, true);
  assert.equal(render(session2, store.useSpotList, source, 'session-2')[0].spots.find((spot) => spot.id === 2).isFavorite, false, 'late old-session mutation cannot alter another account');

  const detail = await source.getSpot(1);
  for (const grade of ['매우좋음', '매우나쁨', '좋음', '보통', '나쁨', '위험', ' 매우 좋음 ']) {
    const view = vm.toSpotDetailViewModel({ ...detail, forecast: { ...detail.forecast, totalIndex: grade } });
    assert.equal(view.fishingIndex.label, `낚시지수 ${grade.trim()}`);
    assert.ok(view.fishingIndex.color && view.fishingIndex.description);
    assert.notEqual(view.fishingIndex.color, '#767676');
  }
  for (const grade of ['새로운 등급', 'toString', 'constructor']) {
    const view = vm.toSpotDetailViewModel({ ...detail, forecast: { ...detail.forecast, totalIndex: grade } });
    assert.equal(view.fishingIndex.color, '#767676', 'unknown grade is shown neutrally');
  }
  assert.equal(vm.toSpotDetailViewModel({ ...detail, forecast: null }).fishingIndex, null);

  // Render the actual screen: no screen-local override may hide a later store update.
  const screenHost = host();
  const facilities = { markers: [{ id: 'tour-test', name: '관광지', lat: 37.4, lng: 126.6 }], close() {}, selectPlace(id) { this.selected = id; } };
  const Screen = load('src/app/(tabs)/map/index.tsx', {
    react,
    '@expo/vector-icons': { Ionicons: 'Ionicons' }, 'expo-image': { Image: 'Image' },
    'expo-router': { useRouter: () => ({}), useLocalSearchParams: () => ({}) },
    'react-native': { ActivityIndicator: 'ActivityIndicator', Pressable: 'Pressable', StyleSheet: { create: (value) => value }, View: 'View' },
    '@/components/common': { Screen: 'Screen', ScreenHeader: 'ScreenHeader', SearchBar: 'SearchBar' },
    '@/constants/theme': { Brand: {}, Components: { map: { seaStrip: {} } }, Layout: {} },
    '@/features/auth': { useAuth: () => ({ token: 'fixture', sessionId: 2 }) },
    '@/features/map/components/sea-info-strip': { SeaInfoStrip: 'SeaInfoStrip' },
    '@/features/map/components/spot-detail-sheet': { SpotDetailSheet: 'SpotDetailSheet' },
    '@/features/map/kakao-map': { FishlogKakaoMap: 'FishlogKakaoMap' },
    '@/features/map/spot-api': { createApiSpotDataSource: () => source },
    '@/features/map/spot-data': fixture,
    '@/features/map/spot-list-store': store,
    '@/features/map/tour-facilities': { TourFacilities: 'TourFacilities', useTourFacilities: () => facilities },
    '@/features/map/use-spot-view-model': vm,
    '@/lib/data-source-mode': { USE_FIXTURE: false },
  }).default;
  const node = (tree, type) => nodes(tree).find((item) => item.type === type);
  let tree = render(screenHost, Screen);
  node(tree, 'FishlogKakaoMap').props.onSpotPress(2);
  tree = render(screenHost, Screen);
  node(tree, 'SpotDetailSheet').props.onFavoriteChange(2, true);
  tree = render(screenHost, Screen);
  assert.equal(node(tree, 'SpotDetailSheet').props.isFavorite, true);
  store.setSpotFavorite('session-2', 2, false);
  tree = render(screenHost, Screen);
  assert.equal(node(tree, 'SpotDetailSheet').props.isFavorite, false);
  nodes(tree).find((item) => item.props?.label === '주변 시설').props.onPress();
  tree = render(screenHost, Screen);
  assert.equal(node(tree, 'FishlogKakaoMap').props.tourPlaces, facilities.markers);
  node(tree, 'FishlogKakaoMap').props.onTourPress('tour-test');
  tree = render(screenHost, Screen);
  assert.equal(facilities.selected, 'tour-test');
  assert.equal(node(tree, 'SpotDetailSheet').props.spotId, null);
  nodes(tree).find((item) => item.props?.label === '주변 시설').props.onPress();
  tree = render(screenHost, Screen);
  assert.equal(node(tree, 'FishlogKakaoMap').props.tourPlaces, undefined, 'closing facilities removes map markers');

  [map, mapHeart, savedHeart, savedList, failedHeart, session2, screenHost].forEach((h) => h.unmount());
  console.log('Map checks passed: shared favorites, stale refresh/session protection, duplicate taps/rollback, forecast grades and marker selection wiring.');
}

check().catch((error) => { console.error(error); process.exitCode = 1; });
