// Run with: node scripts/check-tour-data.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
function load(file, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const requireSource = (name) => {
    if (name in mocks) return mocks[name];
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`, mocks);
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
const item = {
  title: '시설', firstImage: 'https://example.com/full.jpg',
  firstImage2: 'https://example.com/thumb.jpg', addr1: '인천', addr2: null,
  mapX: origin.lng, mapY: origin.lat,
};
const response = (items) => ({
  type: '음식점', page: 1, numOfRows: 30, totalCount: items.length, hasNext: false, items,
});

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

  const requests = [];
  const source = { getNearbyTours(query, signal) {
    const request = { ...deferred(), query, signal };
    requests.push(request);
    return request.promise;
  } };
  const tours = hook('src/features/map/use-nearby-tours.ts', 'useNearbyTours');
  assert.equal(tours.render(source, null, origin)[0].status, 'idle');
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

  const positions = [];
  const location = hook('src/features/map/use-current-location.ts', 'useCurrentLocation', {
    'expo-location': {
      Accuracy: { Balanced: 3 },
      requestForegroundPermissionsAsync: async () => ({ granted: true }),
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
  console.log('Tour query, mapping, request races, location races and fixtures passed.');
}

check().catch((error) => { console.error(error); process.exitCode = 1; });
