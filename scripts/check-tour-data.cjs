/* global __dirname */
// Run with: node scripts/check-tour-data.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
function load(file, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  const requireSource = (name) => {
    if (name in mocks) return mocks[name];
    if (/\.(svg|ttf|css)$/.test(name)) return name;
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`, mocks);
    if (name.startsWith('.')) return load(`${path.join(path.dirname(file), name)}.ts`, mocks);
    return require(name);
  };
  new Function('require', 'module', 'exports', code)(requireSource, module, module.exports);
  return module.exports;
}

// Run the actual hooks' state/effects without a native runtime or test dependency.
function hook(file, name, mocks = {}) {
  const slots = [];
  let cursor;
  let pending;
  const react = {
    useState(initial) {
      const i = cursor++;
      slots[i] ??= { value: initial };
      return [slots[i].value, (next) => {
        slots[i].value = typeof next === 'function' ? next(slots[i].value) : next;
      }];
    },
    useRef(value) {
      const i = cursor++;
      slots[i] ??= { current: value };
      return slots[i];
    },
    useCallback(fn) { cursor++; return fn; },
    useMemo(create, deps) {
      const i = cursor++;
      const previous = slots[i];
      if (!previous || deps.some((value, j) => !Object.is(value, previous.deps[j]))) {
        slots[i] = { deps, value: create() };
      }
      return slots[i].value;
    },
    useEffect(effect, deps) {
      const i = cursor++;
      const previous = slots[i];
      if (!previous || deps.some((value, j) => !Object.is(value, previous.deps[j]))) {
        pending.push(() => {
          previous?.cleanup?.();
          slots[i] = { deps, cleanup: effect() };
        });
      }
    },
  };
  const loaded = load(file, { ...mocks, react });
  const run = name === 'TourFacilities'
    ? (props = {}) => {
      const facilities = loaded.useTourFacilities(props.getSearchOrigin);
      props.capture?.(facilities);
      return loaded.TourFacilities({ facilities });
    }
    : loaded[name];
  return {
    render(...args) {
      cursor = 0;
      pending = [];
      const result = run(...args);
      pending.forEach((effect) => effect());
      return result;
    },
    unmount() { slots.forEach((slot) => slot?.cleanup?.()); },
  };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const origin = { lat: 37.4, lng: 126.6 };
const invalidOrigins = [
  { lat: NaN, lng: Infinity }, { lat: 91, lng: 0 }, { lat: -91, lng: 0 },
  { lat: 0, lng: 181 }, { lat: 0, lng: -181 }, { lat: '37.4', lng: 126.6 },
];
const item = {
  title: '시설', firstImage: 'https://example.com/full.jpg',
  firstImage2: 'https://example.com/thumb.jpg', addr1: '인천', addr2: null,
  mapX: origin.lng, mapY: origin.lat,
};
const response = (items) => ({
  type: '음식점', page: 1, numOfRows: 30, totalCount: items.length, hasNext: false, items,
});

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}

async function checkFacilities() {
  const requests = [];
  const opened = [];
  const lookups = [];
  const sheetValue = {};
  const placeUrl = 'https://place.map.kakao.com/13569455';
  void opened; void lookups;
  const positions = [];
  let backHandler;
  const mocks = {
    'react-native': {
      ...Object.fromEntries(['ActivityIndicator', 'Modal', 'Pressable', 'ScrollView', 'Text', 'View'].map((name) => [name, name])),
      StyleSheet: { create: (styles) => styles, absoluteFill: {} },
      useWindowDimensions: () => ({ width: 390, height: 844 }),
      BackHandler: { addEventListener: (_event, handler) => {
        backHandler = handler;
        return { remove() { backHandler = undefined; } };
      } },
    },
    'react-native-reanimated': {
      default: { View: 'AnimatedView' },
      ReduceMotion: { System: 'system' },
      SlideInDown: { duration: () => ({ reduceMotion: (mode) => ({ mode }) }) },
      // 드래그로 높이를 바꾸는 부분은 값만 흉내 낸다 (실제 애니메이션은 기기에서 확인한다).
      // 렌더마다 새 객체를 주면 스냅한 높이가 사라지므로 하나를 계속 돌려준다.
      useSharedValue: (value) => { if (!('value' in sheetValue)) sheetValue.value = value; return sheetValue; },
      useAnimatedStyle: (build) => build(),
      withTiming: (value) => value,
      runOnJS: (fn) => fn,
    },
    'react-native-gesture-handler': {
      GestureHandlerRootView: 'GestureHandlerRootView',
      GestureDetector: 'GestureDetector',
      Gesture: { Pan: () => { const chain = { onChange: (fn) => { chain.change = fn; return chain; }, onEnd: (fn) => { chain.end = fn; return chain; } }; return chain; } },
    },
    'expo-image': { Image: 'Image' },
    '@expo/vector-icons': { Ionicons: 'Ionicons' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
    'expo-web-browser': { openBrowserAsync: (url) => { opened.push(url); return Promise.resolve(); } },
    '@/features/map/kakao-place': { lookupPlaceUrl: (name, coords) => { lookups.push({ name, coords }); return Promise.resolve(placeUrl); } },
    'expo-location': {
      Accuracy: { Balanced: 3 },
      requestForegroundPermissionsAsync: async () => ({ granted: true }),
      getCurrentPositionAsync(options) {
        assert.equal(options.maximumAge, 0, 'refresh must bypass the browser location cache');
        const next = deferred(); positions.push(next); return next.promise;
      },
    },
    '@/lib/api/client': { apiRequest(requestPath, options) {
      const next = { ...deferred(), url: new URL(requestPath, 'https://api.fishlog.xyz'), options };
      requests.push(next);
      return next.promise;
    } },
  };
  // Load the real UI leaf without importing unrelated components from its barrel.
  mocks['@/components/common'] = load('src/components/common/screen-state.tsx', mocks);
  const ui = hook('src/features/map/tour-facilities.tsx', 'TourFacilities', mocks);
  let facilities;
  const props = { capture: (value) => { facilities = value; } };
  let tree = ui.render(props);
  const render = () => { tree = ui.render(props); };
  // 시트 높이는 지도 영역을 잰 뒤 정해진다. 기기에서 오는 onLayout 을 흉내 낸다 (지도 영역 800)
  nodes(tree).find((node) => node.props?.onLayout).props.onLayout({ nativeEvent: { layout: { height: 800 } } });
  render();
  const button = (label) => nodes(tree).find((node) => node.props?.accessibilityLabel === label);
  const rows = () => nodes(tree).filter((node) => node.props?.accessibilityLabel?.endsWith('시설 상세 보기'));
  const detail = () => nodes(tree).find((node) => node.props?.testID === 'tour-facility-detail');
  const screenState = () => nodes(tree).find((node) => node.type?.name === 'ScreenState');
  const assertHidden = () => { assert.equal(rows().length, 0); assert.equal(detail(), undefined); assert.deepEqual(facilities.markers, []); };
  assert.equal(requests.length, 0);
  assert.equal(positions.length, 0, 'opening the facility layer must not request GPS');
  button('음식점 시설 보기').props.onPress();
  render();
  await flush();
  assert.equal(positions.length, 1);
  assert.equal(requests.length, 0, 'category selection must wait for GPS before querying');
  assert.equal(screenState().props.variant, 'loading');
  const refreshButton = button('현재 위치로 시설 다시 조회');
  assert.ok(!refreshButton.props.disabled && !refreshButton.props.accessibilityState?.disabled, 'pending GPS must allow retry');
  refreshButton.props.onPress();
  render();
  await flush();
  assert.equal(positions.length, 2, 'retry starts a fresh GPS request while the old one is pending');
  positions[0].resolve({ coords: { latitude: 35, longitude: 129 } });
  await flush();
  render();
  assert.equal(requests.length, 0, 'stale GPS must not start a facility request');
  positions.at(-1).resolve({ coords: { latitude: origin.lat, longitude: origin.lng } });
  await flush();
  render();
  assert.equal(requests.at(-1).url.pathname, '/api/tours/nearby');
  assert.deepEqual(Object.fromEntries(requests.at(-1).url.searchParams), { type: '음식점', lat: '37.4', lng: '126.6' });
  assert.equal(requests.at(-1).options.token, undefined);
  requests.at(-1).resolve(response([item]));
  await flush();
  render();
  assert.equal(rows().length, 1);
  assert.equal(rows()[0].props.accessibilityLabel, '시설, 인천, 0m. 시설 상세 보기');
  assert.deepEqual(facilities.markers, [{ id: facilities.state.places[0].id, name: '시설', lat: origin.lat, lng: origin.lng }]);
  const loadedMarkers = facilities.markers;
  const loadedRequests = requests.length;
  rows()[0].props.onPress(); render();
  assert.equal(backHandler(), true, 'Android back closes facility detail before leaving the map');
  render();
  assert.equal(detail(), undefined);
  assert.equal(rows().length, 1, 'first back returns to the same facility list');
  assert.equal(backHandler(), true, 'second back hides the list');
  render();
  assert.equal(facilities.sheetOpen, false);
  assert.equal(facilities.markers, loadedMarkers, 'Android back preserves marker identity and loaded results');
  assert.equal(backHandler, undefined, 'hidden facilities must not trap later Android back presses');
  facilities.selectPlace(loadedMarkers[0].id); render();
  assert.ok(detail(), 'the retained marker must reopen detail after Android back');
  button('시설 목록으로 돌아가기').props.onPress(); render();
  button('시설 목록 닫기').props.onPress(); render();
  assert.equal(nodes(tree).some((node) => node.props?.testID === 'tour-facility-sheet'), false);
  assert.deepEqual(facilities.markers, loadedMarkers, 'hiding the sheet keeps the loaded markers');
  assert.equal(facilities.category, '음식점');
  button('음식점 시설 보기').props.onPress(); render();
  assert.equal(rows().length, 1, 'selected category reopens a hidden list');
  assert.equal(requests.length, loadedRequests, 'reopening must reuse the same result');
  facilities.hide(); render();
  facilities.selectPlace(facilities.markers[0].id); render();
  assert.ok(detail(), 'map marker and list must open the same place');
  assert.equal(facilities.selected, facilities.state.places[0]);
  assert.equal(tree.type, 'View', 'the full map overlay must not be a gesture-handler root');
  assert.equal(tree.props.pointerEvents, 'box-none');
  assert.equal(nodes(tree).find((node) => node.props?.testID === 'tour-facility-dim').props.pointerEvents, 'none', 'detail dim must pass touches through to the map');
  assert.equal(nodes(tree).some((node) => node.props?.accessibilityLabel === '시설 상세 닫기'), false, 'no full-map pressable may block map gestures or other markers');
  const renderedSheet = nodes(tree).find((node) => node.props?.testID === 'tour-facility-sheet');
  assert.equal(nodes(renderedSheet).filter((node) => node.type === 'GestureHandlerRootView').length, 1, 'gesture root stays inside the sheet');
  button('시설 목록으로 돌아가기').props.onPress(); render();
  rows()[0].props.onPress();
  render();
  assert.ok(detail());
  assert.ok(nodes(tree).some((node) => node.type === 'Text' && node.props.children === '시설'));
  assert.equal(nodes(tree).filter((node) => node.props?.testID === 'tour-facility-sheet').length, 1);
  // 카카오 장소 링크는 상세에만 두고 선택한 시설을 그대로 넘긴다 (링크 탐색은 checkPlaceLookup 에서 확인)
  const placeLink = nodes(tree).find((node) => node.type?.name === 'PlaceLink');
  assert.ok(placeLink, 'detail must render the kakao place link');
  assert.equal(placeLink.props.place, facilities.state.places[0]);
  assert.equal(nodes(tree).some((node) => node.type === 'Modal'), false, 'detail must stay in the same sheet');
  button('시설 목록으로 돌아가기').props.onPress();
  render();
  assert.equal(rows().length, 1);
  assert.equal(detail(), undefined);
  const drag = nodes(tree).find((node) => node.type === 'GestureDetector').props.gesture;
  drag.change({ changeY: 350 });
  drag.end(); render();
  assert.equal(nodes(tree).some((node) => node.props?.testID === 'tour-facility-sheet'), false, 'dragging below the collapsed snap hides the sheet');
  assert.deepEqual(facilities.markers, loadedMarkers, 'drag dismissal keeps the same markers');
  button('음식점 시설 보기').props.onPress(); render(); render();
  assert.equal(rows().length, 1);
  assert.equal(requests.length, loadedRequests);
  rows()[0].props.onPress();
  render();
  assert.ok(nodes(detail()).some((node) => node.props?.large && node.props.uri === item.firstImage));

  const staleMarker = facilities.markers[0].id;
  button('숙박 시설 보기').props.onPress();
  render();
  assertHidden();
  assert.equal(requests.at(-1).url.searchParams.get('type'), '숙박');
  requests.at(-1).reject(new Error('API unavailable'));
  await flush();
  render();
  assert.equal(screenState().props.variant, 'error');
  screenState().props.onRetry();
  render();
  assertHidden();
  assert.equal(screenState().props.variant, 'loading');
  const lodging = { ...item, title: '숙박 시설' };
  requests.at(-1).resolve({ ...response([lodging]), type: '숙박' });
  await flush();
  render();
  assert.equal(rows()[0].props.accessibilityLabel, '숙박 시설, 인천, 0m. 시설 상세 보기');
  facilities.selectPlace(staleMarker); render();
  assert.equal(detail(), undefined, 'late marker tap from previous category must not choose a new place');
  rows()[0].props.onPress();
  render();
  assert.ok(detail());
  button('시설 목록으로 돌아가기').props.onPress();
  render();
  button('현재 위치로 시설 다시 조회').props.onPress();
  render();
  assertHidden();
  const countBeforeGps = requests.length;
  await flush();
  positions.at(-1).reject(new Error('GPS unavailable'));
  await flush();
  render();
  assertHidden();
  assert.equal(screenState().props.title, '현재 위치를 확인하지 못했어요');
  screenState().props.onRetry();
  render();
  await flush();
  assert.equal(requests.length, countBeforeGps);
  positions.at(-1).resolve({ coords: { latitude: 37.5, longitude: 126.7 } });
  await flush();
  render();
  assertHidden();
  assert.deepEqual(Object.fromEntries(requests.at(-1).url.searchParams), { type: '숙박', lat: '37.5', lng: '126.7' });
  requests.at(-1).resolve({ ...response([lodging]), type: '숙박' });
  await flush();
  render();
  assert.equal(rows().length, 1);
  assert.equal(detail(), undefined, 'new coordinates must not reopen the old detail');
  button('숙박 시설 보기').props.onPress();
  render();
  assertHidden();
  ui.unmount();
}

// 지도가 중심 좌표를 주면 GPS 없이 그 좌표로 찾고, 다시 조회할 때 그 순간의 중심을 다시 읽는다.
async function checkFacilitiesByMapCenter() {
  const requests = [];
  const opened = [];
  const lookups = [];
  const sheetValue = {};
  const placeUrl = null;
  void opened; void lookups;
  let gpsCalls = 0;
  const mocks = {
    'react-native': {
      ...Object.fromEntries(['ActivityIndicator', 'Modal', 'Pressable', 'ScrollView', 'Text', 'View'].map((name) => [name, name])),
      StyleSheet: { create: (styles) => styles, absoluteFill: {} },
      useWindowDimensions: () => ({ width: 390, height: 844 }),
      BackHandler: { addEventListener: () => ({ remove() {} }) },
    },
    'react-native-reanimated': {
      default: { View: 'AnimatedView' },
      ReduceMotion: { System: 'system' },
      SlideInDown: { duration: () => ({ reduceMotion: (mode) => ({ mode }) }) },
      // 드래그로 높이를 바꾸는 부분은 값만 흉내 낸다 (실제 애니메이션은 기기에서 확인한다).
      // 렌더마다 새 객체를 주면 스냅한 높이가 사라지므로 하나를 계속 돌려준다.
      useSharedValue: (value) => { if (!('value' in sheetValue)) sheetValue.value = value; return sheetValue; },
      useAnimatedStyle: (build) => build(),
      withTiming: (value) => value,
      runOnJS: (fn) => fn,
    },
    'react-native-gesture-handler': {
      GestureHandlerRootView: 'GestureHandlerRootView',
      GestureDetector: 'GestureDetector',
      Gesture: { Pan: () => { const chain = { onChange: (fn) => { chain.change = fn; return chain; }, onEnd: (fn) => { chain.end = fn; return chain; } }; return chain; } },
    },
    'expo-image': { Image: 'Image' },
    '@expo/vector-icons': { Ionicons: 'Ionicons' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
    'expo-web-browser': { openBrowserAsync: (url) => { opened.push(url); return Promise.resolve(); } },
    '@/features/map/kakao-place': { lookupPlaceUrl: (name, coords) => { lookups.push({ name, coords }); return Promise.resolve(placeUrl); } },
    'expo-location': {
      Accuracy: { Balanced: 3 },
      requestForegroundPermissionsAsync: async () => { gpsCalls++; return { granted: true }; },
      getCurrentPositionAsync: () => { gpsCalls++; return new Promise(() => {}); },
    },
    '@/lib/api/client': { apiRequest(requestPath, options) {
      const next = { ...deferred(), url: new URL(requestPath, 'https://api.fishlog.xyz'), options };
      requests.push(next);
      return next.promise;
    } },
  };
  mocks['@/components/common'] = load('src/components/common/screen-state.tsx', mocks);
  const ui = hook('src/features/map/tour-facilities.tsx', 'TourFacilities', mocks);
  let center = { lat: 35.1, lng: 129.0 };
  const props = { getSearchOrigin: () => center };
  let tree = ui.render(props);
  const render = () => { tree = ui.render(props); };
  // 시트 높이는 지도 영역을 잰 뒤 정해진다. 기기에서 오는 onLayout 을 흉내 낸다 (지도 영역 800)
  nodes(tree).find((node) => node.props?.onLayout).props.onLayout({ nativeEvent: { layout: { height: 800 } } });
  render();
  const button = (label) => nodes(tree).find((node) => node.props?.accessibilityLabel === label);
  const heading = () => nodes(tree).find((node) => node.props?.accessibilityRole === 'header');
  const sheet = () => nodes(tree).find((node) => node.props?.testID === 'tour-facility-sheet');

  button('음식점 시설 보기').props.onPress();
  render();
  await flush();
  assert.equal(gpsCalls, 0, 'map center search must not wait for GPS');
  assert.deepEqual(Object.fromEntries(requests.at(-1).url.searchParams), { type: '음식점', lat: '35.1', lng: '129' });
  assert.equal(heading().props.children, '지도 중심 주변 음식점');
  // 처음엔 화면 절반, 펼치면 88% 높이로 스냅한다 (드래그도 같은 두 지점 사이를 오간다)
  assert.equal(sheet().props.style[1].height, 800 * 0.5, 'first-open sheet leaves half the map visible');
  assert.equal(sheet().props.entering.mode, 'system', 'sheet animation respects reduced motion');
  button('시설 시트 펼치기').props.onPress(); render();
  assert.equal(sheet().props.style[1].height, 800 * 0.85);
  button('시설 시트 접기').props.onPress(); render();
  assert.equal(sheet().props.style[1].height, 800 * 0.5);

  const countBefore = requests.length;
  button('지도 중심으로 시설 다시 조회').props.onPress();
  render();
  await flush();
  assert.equal(requests.length, countBefore + 1, 'refresh on an unmoved map must still re-request');

  center = { lat: 37.56, lng: 126.97 };
  button('지도 중심으로 시설 다시 조회').props.onPress();
  render();
  await flush();
  assert.deepEqual(Object.fromEntries(requests.at(-1).url.searchParams), { type: '음식점', lat: '37.56', lng: '126.97' });
  assert.equal(gpsCalls, 0);
  assert.equal(nodes(tree).some((node) => node.type?.name === 'PlaceLink'), false, 'list rows have no place link');
  ui.unmount();
}

// 카카오 장소 링크 탐색: 좌표로 같은 장소를 고르고, 멀거나 모호하면 링크를 만들지 않는다.
async function checkPlaceLookup() {
  const calls = [];
  let reply = { documents: [] };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    calls.push({ url: new URL(url), options });
    return { ok: true, json: async () => reply };
  };

  try {
    const place = load('src/features/map/kakao-place.ts', {
      'expo-constants': { __esModule: true, default: { expoConfig: { extra: { kakaoRestApiKey: 'rest-key' } } } },
    });

    const near = { id: '1', place_name: '시설', place_url: 'http://place.map.kakao.com/13569455', x: '126.6', y: '37.4' };
    const far = { id: '2', place_name: '시설', place_url: 'http://place.map.kakao.com/999', x: '126.7', y: '37.5' };

    // 가까운 후보를 고르고, http 링크는 https 로 올린다
    reply = { documents: [far, near] };
    assert.equal(await place.lookupPlaceUrl('시설', origin), 'https://place.map.kakao.com/13569455');
    assert.equal(calls.at(-1).options.headers.Authorization, 'KakaoAK rest-key');
    assert.deepEqual(Object.fromEntries(calls.at(-1).url.searchParams), {
      query: '시설', size: '5', x: String(origin.lng), y: String(origin.lat), radius: '300', sort: 'distance',
    });

    // 같은 시설은 다시 묻지 않는다
    const countAfterFirst = calls.length;
    assert.equal(await place.lookupPlaceUrl('시설', origin), 'https://place.map.kakao.com/13569455');
    assert.equal(calls.length, countAfterFirst, 'second lookup must use the cache');

    // 좌표에서 멀면 동명이인으로 보고 버린다
    reply = { documents: [far] };
    assert.equal(await place.lookupPlaceUrl('먼 시설', origin), null);

    // 좌표를 모르면 결과가 하나일 때만 쓴다
    reply = { documents: [near] };
    assert.equal(await place.lookupPlaceUrl('좌표없음', null), 'https://place.map.kakao.com/13569455');
    reply = { documents: [near, far] };
    assert.equal(await place.lookupPlaceUrl('모호한 이름', null), null);

    // 응답 실패·빈 결과는 링크 없음
    reply = { documents: [] };
    assert.equal(await place.lookupPlaceUrl('없는 시설', origin), null);

    // REST 키가 없으면 아예 부르지 않는다
    const noKey = load('src/features/map/kakao-place.ts', {
      'expo-constants': { __esModule: true, default: { expoConfig: { extra: {} } } },
    });
    assert.equal(noKey.canLookupPlaceUrl(), false);
    const countBeforeNoKey = calls.length;
    assert.equal(await noKey.lookupPlaceUrl('시설', origin), null);
    assert.equal(calls.length, countBeforeNoKey, 'no request without a REST key');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function check() {
  const calls = [];
  const api = load('src/features/map/tour-api.ts', {
    '@/lib/api/client': { apiRequest: async (...args) => { calls.push(args); return response([]); } },
  }).createApiTourDataSource();
  const signal = new AbortController().signal;
  for (const type of ['음식점', '관광지', '숙박']) {
    await api.getNearbyTours({ type, ...origin }, signal);
    const [requestPath, options] = calls.at(-1);
    const url = new URL(requestPath, 'https://api.fishlog.xyz');
    assert.equal(url.pathname, '/api/tours/nearby');
    assert.deepEqual(Object.fromEntries(url.searchParams), { type, lat: '37.4', lng: '126.6' });
    assert.equal(options.signal, signal);
    assert.equal(options.token, undefined);
  }
  for (const coords of invalidOrigins) {
    await assert.rejects(api.getNearbyTours({ type: '음식점', ...coords }));
  }
  assert.equal(calls.length, 3, 'invalid coordinates must never reach the API');
  const { isValidCoords } = load('src/features/map/geo.ts');
  assert.equal(isValidCoords({ lat: 90, lng: 180 }), true);
  assert.equal(isValidCoords({ lat: -90, lng: -180 }), true);
  assert.equal(isValidCoords(null), false);

  const requests = [];
  const source = { getNearbyTours(query, signal) {
    const request = { ...deferred(), query, signal };
    requests.push(request);
    return request.promise;
  } };
  const tours = hook('src/features/map/use-nearby-tours.ts', 'useNearbyTours');
  assert.equal(tours.render(source, null, origin)[0].status, 'idle');
  for (const coords of invalidOrigins) {
    assert.equal(tours.render(source, '음식점', coords)[0].status, 'idle');
  }
  assert.equal(requests.length, 0);
  assert.equal(tours.render(source, '음식점', origin)[0].status, 'loading');
  tours.render(source, '음식점', { ...origin });
  assert.equal(requests.length, 1, 'equal coordinates must not restart a request');
  tours.render(source, '숙박', origin);
  assert.equal(requests[0].signal.aborted, true);
  requests[1].resolve(response([
    item,
    { ...item, firstImage: null, firstImage2: null, addr1: null, mapX: null },
    { ...item, firstImage: ' ', mapX: Infinity },
    { ...item, mapY: 91 },
    { ...item, firstImage: 'http://tong.visitkorea.or.kr/full.jpg', firstImage2: 'http://tong.visitkorea.or.kr/thumb.jpg' },
    { ...item, firstImage: 'http://example.com/full.jpg' },
    { ...item, firstImage: 'javascript:alert(1)', firstImage2: 'not a URL' },
    { ...item, firstImage: 'http://tong.visitkorea.or.kr.other.example/full.jpg' },
    { ...item, firstImage: 'https://user:secret@tong.visitkorea.or.kr/full.jpg', firstImage2: null },
  ]));
  await flush();
  const ready = tours.render(source, '숙박', origin)[0];
  assert.equal(ready.status, 'ready');
  assert.deepEqual(ready.places[0].photos, [item.firstImage]);
  assert.equal(ready.places[0].thumbnailUrl, item.firstImage2);
  assert.equal(ready.places[0].distanceLabel, '0m');
  assert.equal(ready.places[1].address, null);
  assert.deepEqual(ready.places[1].photos, []);
  assert.equal(ready.places[1].distanceLabel, null);
  assert.deepEqual(ready.places[2].photos, [item.firstImage2]);
  assert.equal(ready.places[2].coords, null);
  assert.equal(ready.places[3].coords, null);
  assert.deepEqual(ready.places[4].photos, ['https://tong.visitkorea.or.kr/full.jpg']);
  assert.equal(ready.places[4].thumbnailUrl, 'https://tong.visitkorea.or.kr/thumb.jpg');
  assert.deepEqual(ready.places[5].photos, ['http://example.com/full.jpg']);
  assert.deepEqual(ready.places[6].photos, []);
  assert.deepEqual(ready.places[7].photos, ['http://tong.visitkorea.or.kr.other.example/full.jpg']);
  assert.deepEqual(ready.places[8].photos, []);
  requests[0].resolve(response([]));
  await flush();
  assert.equal(tours.render(source, '숙박', origin)[0], ready, 'late response must be ignored');

  const nextSource = { ...source };
  assert.equal(tours.render(nextSource, '숙박', origin)[0].status, 'loading');
  requests.at(-1).reject(new Error('offline'));
  await flush();
  const [error, retry] = tours.render(nextSource, '숙박', origin);
  assert.equal(error.status, 'error');
  retry();
  assert.equal(tours.render(nextSource, '숙박', origin)[0].status, 'loading');
  requests.at(-1).resolve(response([]));
  await flush();
  assert.equal(tours.render(nextSource, '숙박', origin)[0].status, 'empty');
  tours.render(nextSource, '숙박', { ...origin, lat: 37.5 });
  assert.equal(requests.at(-1).query.lat, 37.5);
  tours.unmount();
  assert.equal(requests.at(-1).signal.aborted, true);

  const switches = hook('src/features/map/use-nearby-tours.ts', 'useNearbyTours');
  switches.render(source, '음식점', origin);
  requests.at(-1).resolve(response([item]));
  await flush();
  assert.equal(switches.render(source, '음식점', origin)[0].status, 'ready');
  switches.render(source, '숙박', origin);
  const lodging = requests.at(-1);
  assert.equal(switches.render(source, '음식점', origin)[0].status, 'loading', 'A → B → A must not reuse A');
  lodging.resolve(response([item]));
  await flush();
  assert.equal(switches.render(source, '음식점', origin)[0].status, 'loading');
  requests.at(-1).resolve(response([item]));
  await flush();
  assert.equal(switches.render(source, '음식점', origin)[0].status, 'ready');
  assert.equal(switches.render(source, '음식점', null)[0].status, 'idle');
  assert.equal(switches.render(source, '음식점', origin)[0].status, 'loading', 'location retry must not revive stale facilities');
  requests.at(-1).reject(new Error('new request failed'));
  await flush();
  assert.deepEqual(switches.render(source, '음식점', origin)[0], { status: 'error' });
  switches.unmount();

  const positions = [];
  let permission = { status: 'granted', granted: true };
  const location = hook('src/features/map/use-current-location.ts', 'useCurrentLocation', {
    'expo-location': {
      Accuracy: { Balanced: 3 },
      requestForegroundPermissionsAsync: async () => permission,
      getCurrentPositionAsync: () => {
        const request = deferred();
        positions.push(request);
        return request.promise;
      },
    },
  });
  const first = location.render()[1]();
  await flush();
  const second = location.render()[1]();
  await flush();
  positions[1].resolve({ coords: { latitude: 37.5, longitude: 126.7 } });
  await second;
  positions[0].reject(new Error('old request failed'));
  await first;
  assert.deepEqual(location.render()[0], { status: 'ready', coords: { lat: 37.5, lng: 126.7 } });
  const failedLocation = location.render()[1]();
  assert.deepEqual(location.render()[0], { status: 'loading' });
  await flush();
  positions.at(-1).reject(new Error('GPS failed'));
  await failedLocation;
  assert.deepEqual(location.render()[0], { status: 'unavailable' });
  for (const { lat, lng } of invalidOrigins) {
    const locating = location.render()[1]();
    await flush();
    positions.at(-1).resolve({ coords: { latitude: lat, longitude: lng } });
    await locating;
    assert.deepEqual(location.render()[0], { status: 'unavailable' });
  }
  permission = { status: 'denied', granted: false };
  const countBeforeDenied = positions.length;
  await location.render()[1]();
  assert.deepEqual(location.render()[0], { status: 'denied' });
  assert.equal(positions.length, countBeforeDenied, 'denied permission must not request GPS');
  permission = { status: 'granted', granted: false };
  await location.render()[1]();
  assert.deepEqual(location.render()[0], { status: 'unavailable' }, 'web GPS failure is not permission denial');
  assert.equal(positions.length, countBeforeDenied);
  location.unmount();

  const { createFixtureTourDataSource } = load('src/features/map/tour-data.ts');
  const query = { type: '관광지', ...origin };
  const aborted = new AbortController();
  aborted.abort();
  await Promise.all([
    createFixtureTourDataSource().getNearbyTours(query).then((value) => assert.equal(value.items.length, 3)),
    createFixtureTourDataSource('empty').getNearbyTours(query).then((value) => assert.equal(value.items.length, 0)),
    assert.rejects(createFixtureTourDataSource('error').getNearbyTours(query)),
    assert.rejects(createFixtureTourDataSource().getNearbyTours(query, aborted.signal)),
  ]);
  await checkFacilities();
  await checkFacilitiesByMapCenter();
  await checkPlaceLookup();
  console.log('Tour query, coordinate/image validation, request/location races, fixtures, facility UI flow and kakao place links passed.');
}

check().catch((error) => { console.error(error); process.exitCode = 1; });
