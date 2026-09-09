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
  const run = load(file, { ...mocks, react })[name];
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
  const positions = [];
  const mocks = {
    'react-native': {
      ...Object.fromEntries(['ActivityIndicator', 'Modal', 'Pressable', 'ScrollView', 'Text', 'View'].map((name) => [name, name])),
      StyleSheet: { create: (styles) => styles, absoluteFill: {} },
    },
    'expo-image': { Image: 'Image' },
    '@expo/vector-icons': { Ionicons: 'Ionicons' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
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
  let tree = ui.render();
  const render = () => { tree = ui.render(); };
  const button = (label) => nodes(tree).find((node) => node.props?.accessibilityLabel === label);
  const rows = () => nodes(tree).filter((node) => node.props?.accessibilityLabel?.endsWith('시설 상세 보기'));
  const detail = () => nodes(tree).find((node) => node.type === 'Modal');
  const screenState = () => nodes(tree).find((node) => node.type?.name === 'ScreenState');
  const assertHidden = () => { assert.equal(rows().length, 0); assert.equal(detail(), undefined); };
  assert.equal(requests.length, 0);
  assert.equal(positions.length, 0, 'opening the facility layer must not request GPS');
  button('음식점 시설 보기').props.onPress();
  render();
  await flush();
  assert.equal(positions.length, 1);
  assert.equal(requests.length, 0, 'category selection must wait for GPS before querying');
  assert.equal(screenState().props.variant, 'loading');
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
  rows()[0].props.onPress();
  render();
  assert.ok(detail());
  assert.ok(nodes(detail()).some((node) => node.type === 'Text' && node.props.children === '시설'));
  assert.ok(nodes(detail()).some((node) => node.props?.large && node.props.uri === item.firstImage));

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
  rows()[0].props.onPress();
  render();
  assert.ok(detail());
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
  let permissionGranted = true;
  const location = hook('src/features/map/use-current-location.ts', 'useCurrentLocation', {
    'expo-location': {
      Accuracy: { Balanced: 3 },
      requestForegroundPermissionsAsync: async () => ({ granted: permissionGranted }),
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
  permissionGranted = false;
  const countBeforeDenied = positions.length;
  await location.render()[1]();
  assert.deepEqual(location.render()[0], { status: 'denied' });
  assert.equal(positions.length, countBeforeDenied, 'denied permission must not request GPS');
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
  console.log('Tour query, coordinate/image validation, request/location races, fixtures and facility UI flow passed.');
}

check().catch((error) => { console.error(error); process.exitCode = 1; });
