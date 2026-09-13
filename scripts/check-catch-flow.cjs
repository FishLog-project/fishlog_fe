// Run with: node scripts/check-catch-flow.cjs
/* global __dirname */
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(file, imports) {
  const { outputText } = ts.transpileModule(readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const module = { exports: {} };
  new Function('require', 'exports', 'module', outputText)((id) => {
    assert.ok(id in imports, `Unexpected import: ${id}`);
    return imports[id];
  }, module.exports, module);
  return module.exports;
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

async function flush() {
  for (let i = 0; i < 8; i += 1) await Promise.resolve();
}

// Minimal hook host: re-render explicitly after actions; keep async work controllable.
function mount(source) {
  const slots = [];
  const effects = [];
  let cursor = 0;
  let updates = 0;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (next) => {
        updates += 1;
        slots[index] = typeof next === 'function' ? next(slots[index]) : next;
      }];
    },
    useRef(initial) { return react.useState({ current: initial })[0]; },
    useCallback(callback) { return callback; },
    useEffect(effect, deps) {
      const index = cursor++;
      const previous = slots[index];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
        effects.push(() => {
          previous?.cleanup?.();
          slots[index] = { deps, cleanup: effect() };
        });
      }
    },
  };
  const { useCatchFlow: runHook } = load('src/features/catch/use-catch-flow.ts', {
    react,
    '@/features/dex/use-dex-view-model': load('src/features/dex/use-dex-view-model.ts', {
      react,
      '@/lib/use-section': {},
    }),
  });
  const render = (nextSource = source) => {
    source = nextSource;
    cursor = 0;
    const result = runHook(source);
    effects.splice(0).forEach((effect) => effect());
    return result;
  };
  render.unmount = () => slots.forEach((slot) => slot?.cleanup?.());
  render.updateCount = () => updates;
  return render;
}

async function checkBackgroundDetails() {
  const serverTime = '2026-09-09T07:00:00';
  for (const custom of [false, true]) {
    for (const transition of ['pending', 'complete', 'retake', 'new-catch', 'source', 'unmount', 'refresh-during-save']) {
      const detail = deferred();
      const save = deferred();
      let posts = 0;
      const source = {
        classify: async () => ({ candidates: [] }),
        listSpecies: async () => [{ id: 1, name: '광어' }],
        verify: async (request) => {
          posts += 1;
          if (transition === 'refresh-during-save') await save.promise;
          return {
            catchRecordId: posts, fishId: 1, fishName: '광어', size: request.size,
            imageUrl: request.photoUri, location: null, catchCount: posts, verifiedAt: serverTime,
          };
        },
        verifyCustom: async (request) => {
          posts += 1;
          if (transition === 'refresh-during-save') await save.promise;
          return {
            customCatchRecordId: posts, customFishId: 1, fishName: '뚱어', habitat: null,
            imageUrl: request.photoUri, size: request.size, location: null, registeredAt: serverTime,
          };
        },
        getFish: () => detail.promise,
        getCustomFish: () => detail.promise,
      };
      const render = mount(source);
      const prepare = async (photo) => {
        await render().analyze(photo);
        render().startManual();
        render().setFishName(custom ? '뚱어' : '광어');
        render().setSizeCm(20);
      };
      await prepare('saved-photo');
      const staleRegister = render().register;
      let completed = false;
      const pending = staleRegister().then(() => { completed = true; });
      await flush();
      if (transition === 'refresh-during-save') {
        assert.equal(render().registering, true);
        render({ ...source });
        save.resolve();
        await flush();
      }
      assert.equal(completed, true, `${custom}/${transition}: register must settle without waiting for detail`);
      await pending;
      const fallback = render().state.detail;
      assert.equal(render().state.step, 'registered');
      assert.equal(render().registering, false);
      assert.equal(fallback.photos[0].imageUrl, 'saved-photo');
      assert.equal(fallback.photos[0].verifiedAt, serverTime, 'prefer the server timestamp when provided');
      assert.equal(fallback.catchLabel, custom ? null : '잡은 횟수: 1회');
      await staleRegister();
      await render().register();
      assert.equal(posts, 1, 'even an old onPress must not re-POST a completed save');
      if (transition === 'pending') continue; // A permanently pending GET never holds the save lock.

      if (transition === 'retake' || transition === 'new-catch') render().retake();
      if (transition === 'new-catch') {
        source.getFish = source.getCustomFish = () => new Promise(() => {});
        await prepare('new-photo');
        await render().register();
        assert.equal(posts, 2, 'retake must allow one genuinely new save');
      }
      if (transition === 'source') {
        render({ ...source });
        render(source); // Returning to the old source must not revive its old detail.
      }
      const updates = render.updateCount();
      if (transition === 'unmount') render.unmount();
      detail.resolve(custom ? {
        customFishId: 1, name: '뚱어', habitat: '바다', catchCount: 4, maxSize: 20,
        imageUrl: 'server-custom-art', recentCatches: [],
      } : {
        id: 1, name: '광어', description: '서버 설명', habitat: '바다', imageUrl: 'server-fish-art', rarity: 'LOW',
      });
      await flush();
      if (transition === 'unmount') {
        assert.equal(render.updateCount(), updates, 'late detail must not update an unmounted hook');
      } else if (transition === 'complete') {
        assert.equal(render().state.detail.imageUrl, custom ? 'server-custom-art' : 'server-fish-art');
        assert.equal(render().state.detail.habitatLabel, '주요 서식지: 바다');
        assert.equal(render().registrationError, null);
      } else if (transition === 'retake') {
        assert.equal(render().state.step, 'capture', 'late detail must not reopen a completed catch');
      } else if (transition === 'new-catch') {
        assert.equal(render().state.detail.photos[0].imageUrl, 'new-photo', 'late detail must not replace the next catch');
      } else {
        assert.equal(render().state.detail, fallback, 'old-source detail must not replace the current completion');
      }
    }
  }
}

async function main() {
  let calls = 0;
  const source = {
    classify: async () => ({ candidates: [{ fishId: 1, name: '광어', sizeCm: 20 }] }),
    listSpecies: async () => [{ id: 1, name: '광어' }],
    verify: async ({ fishId, size, photoUri }) => {
      calls += 1;
      return { catchRecordId: 1, fishId, fishName: '광어', size, imageUrl: photoUri, catchCount: 1 };
    },
    getFish: async () => { throw new Error('detail unavailable after successful save'); },
  };
  const render = mount(source);
  await render().analyze('photo');
  render().startManual();
  render().setFishName('   ');
  render().setSizeCm(20);
  await render().register();
  assert.equal(render().state.step, 'result', 'blank species must not claim a successful save');
  assert.equal(calls, 0);
  render().setFishName('광어');
  const listSpecies = source.listSpecies;
  source.listSpecies = async () => { throw new Error('offline'); };
  await render().register();
  assert.equal(render().state.step, 'result');
  assert.match(render().registrationError, /다시 시도/);
  assert.equal(render().state.photoUri, 'photo');
  source.listSpecies = listSpecies;

  for (const size of [0, -1, NaN, Infinity, 301, 1001]) {
    render().setSizeCm(size);
    await render().register();
  }
  assert.equal(calls, 0, 'invalid sizes must not reach verify');
  render().setSizeCm(20);
  const verify = source.verify;
  const saved = deferred();
  source.verify = async (request) => { const result = await verify(request); await saved.promise; return result; };
  const pending = render().register();
  await Promise.resolve();
  await render().register();
  render().retake();
  assert.equal(calls, 1, 'repeat presses must not duplicate the save');
  assert.equal(render().state.step, 'result', 'retake must preserve a pending save');
  saved.resolve();
  await pending;
  assert.equal(render().state.step, 'registered', 'detail failure must not repeat a successful save');
  assert.equal(render().registering, false);
  assert.equal(render().state.detail.photos[0].imageUrl, 'photo');
  assert.equal(render().state.detail.catchLabel, '잡은 횟수: 1회');

  const classified = deferred();
  source.classify = () => classified.promise;
  render().retake();
  const analyzing = render().analyze('cancelled-photo');
  render().retake();
  classified.resolve({ candidates: [{ fishId: 1, name: '광어' }] });
  await analyzing;
  assert.equal(render().state.step, 'capture', 'cancelled analysis must not reopen results');

  const customRequests = [];
  const customDetails = [];
  let failCustom = true;
  let failCustomDetail = false;
  let customSaved;
  const customResponse = {
    customCatchRecordId: 51, customFishId: 1, fishName: '뚱어', habitat: null,
    imageUrl: 'uploaded-custom-photo', size: 20, location: '제주 & 바다',
    registeredAt: '2026-09-08T12:34:56',
  };
  const customSource = {
    classify: async () => ({ candidates: [] }),
    listSpecies: async () => [{ id: 1, name: '광어' }],
    verify: async () => { assert.fail('custom species must not use ordinary verify'); },
    getFish: async () => { assert.fail('custom ID must not reach ordinary fish detail'); },
    verifyCustom: async (request) => {
      customRequests.push(request);
      if (failCustom) throw new Error('custom save unavailable');
      if (customSaved) await customSaved.promise;
      return customResponse;
    },
    getCustomFish: async (id) => {
      customDetails.push(id);
      if (failCustomDetail) throw new Error('custom detail unavailable after save');
      return {
        customFishId: id, name: '뚱어', habitat: null, maxSize: 35, catchCount: 4,
        imageUrl: 'https://example.test/images/fish/basic_image.png',
        recentCatches: [{
          catchRecordId: 51, imageUrl: 'uploaded-custom-photo', size: 20,
          location: '제주 & 바다', verifiedAt: customResponse.registeredAt,
        }],
      };
    },
  };
  const customRender = mount(customSource);
  await customRender().analyze('custom-photo');
  assert.equal(customRender().state.reason, 'empty');
  customRender().startManual();
  customRender().setFishName(' 뚱어 ');
  customRender().setSizeCm(20);
  customRender().setLocation(' 제주 & 바다 ');
  await customRender().register();
  assert.equal(customRender().state.step, 'result');
  assert.equal(customRender().state.photoUri, 'custom-photo');
  assert.equal(customRender().state.fishName, ' 뚱어 ');
  assert.equal(customRender().state.location, ' 제주 & 바다 ');
  assert.match(customRender().registrationError, /다시 시도/);
  assert.equal(customRender().registering, false);
  assert.equal(customDetails.length, 0, 'failed save must not claim a registered detail');
  failCustom = false;
  customSaved = deferred();
  const customPending = customRender().register();
  await Promise.resolve();
  await customRender().register();
  customRender().retake();
  assert.equal(customRequests.length, 2, 'retry plus repeated taps must perform one new custom save');
  assert.deepEqual(customRequests[0], customRequests[1]);
  assert.deepEqual(customRequests[1], {
    fishName: '뚱어', size: 20, photoUri: 'custom-photo', location: '제주 & 바다',
  });
  assert.equal(customRender().state.step, 'result');
  customSaved.resolve();
  await customPending;
  await flush();
  assert.equal(customRender().state.step, 'registered');
  assert.equal(customRender().registering, false);
  assert.deepEqual(customDetails, [1]);
  assert.equal(customRender().state.detail.custom, true);
  assert.equal(customRender().state.detail.imageUrl, 'https://example.test/images/fish/basic_image.png', 'custom species uses the server illustration, not its catch photo');
  assert.equal(customRender().state.detail.catchLabel, '잡은 횟수: 4회');
  assert.equal(customRender().state.detail.maxSizeLabel, null, 'personal maximum is not a species maximum');
  assert.equal(customRender().state.detail.photos[0].verifiedAt, customResponse.registeredAt);

  customRender().retake();
  await customRender().analyze('fallback-photo');
  customRender().startManual();
  customRender().setFishName('뚱어');
  customRender().setSizeCm(20);
  for (const invalid of [' ', '가'.repeat(31)]) {
    customRender().setFishName(invalid);
    await customRender().register();
  }
  customRender().setFishName('뚱어');
  customRender().setLocation('가'.repeat(101));
  await customRender().register();
  customRender().setLocation('');
  for (const size of [0, -1, NaN, Infinity, 301]) {
    customRender().setSizeCm(size);
    await customRender().register();
  }
  assert.equal(customRequests.length, 2, 'invalid custom inputs must not reach save');
  customRender().setSizeCm(300);
  failCustomDetail = true;
  await customRender().register();
  assert.equal(customRequests.length, 3, '300 cm must be allowed');
  assert.equal(customRender().state.step, 'registered', 'custom detail failure must not repeat a completed save');
  assert.equal(customRender().registrationError, null);
  assert.equal(customRender().state.detail.catchLabel, null, 'POST has no count; do not invent one');
  assert.equal(customRender().state.detail.imageUrl, null);
  assert.equal(customRender().state.detail.photos[0].imageUrl, customResponse.imageUrl);
  assert.equal(customRender().state.detail.photos[0].verifiedAt, customResponse.registeredAt);

  const requests = [];
  const platform = { OS: 'web' };
  const apiClient = { apiRequest: async (route, options) => {
    requests.push({ route, ...options });
    if (route === '/api/collections/custom/dex') return {
      fishes: [{ id: 1, imageUrl: 'https://example.test/images/fish/basic_image.png' }],
    };
    if (route === '/api/collections/custom?customFishId=1') return {
      customFishId: 1, name: '뚱어', habitat: null, maxSize: 35, catchCount: 4,
      recentCatches: [{
        customCatchRecordId: 51, imageUrl: customResponse.imageUrl,
        size: 20, location: null, registeredAt: customResponse.registeredAt,
      }],
    };
  } };
  const apiResult = { toFail: (error) => error };
  const { createApiCatchDataSource } = load('src/features/catch/catch-api.ts', {
    'expo-file-system': { File: class extends Blob { constructor(uri) { super([uri]); } } },
    'react-native': { Platform: platform },
    '@/features/dex/dex-api': load('src/features/dex/dex-api.ts', {
      '@/lib/api/client': apiClient, '@/lib/api/result': apiResult,
    }),
    '@/lib/api/client': apiClient,
    '@/lib/api/result': apiResult,
  });
  const api = createApiCatchDataSource('test-token');
  await api.classify('data:image/jpeg;base64,aGVsbG8=');
  assert.equal(await requests[0].body.get('image').text(), 'hello', 'web uploads must contain image bytes');
  assert.equal(requests[0].token, 'test-token');
  platform.OS = 'ios';
  await api.verify({ fishId: 1, size: 20, photoUri: 'file:///catch.jpg', location: '서울 & 바다' });
  const query = new URL(requests[1].route, 'https://example.test').searchParams;
  assert.equal(query.get('location'), '서울 & 바다');
  assert.equal(await requests[1].body.get('image').text(), 'file:///catch.jpg');
  await api.verifyCustom({ fishName: ' 뚱어 & 새종 ', size: 300, photoUri: 'file:///custom.jpg', location: ' 바다 & 강 ', habitat: ' 기수역 ' });
  const customQuery = new URL(requests[2].route, 'https://example.test');
  assert.equal(customQuery.pathname, '/api/collections/custom');
  assert.equal(customQuery.searchParams.get('fishName'), '뚱어 & 새종');
  assert.equal(customQuery.searchParams.get('size'), '300');
  assert.equal(customQuery.searchParams.get('location'), '바다 & 강');
  assert.equal(customQuery.searchParams.get('habitat'), '기수역');
  assert.equal(customQuery.searchParams.has('fishId'), false);
  assert.equal(requests[2].token, 'test-token');
  assert.equal(requests[2].method, 'POST');
  assert.equal(await requests[2].body.get('image').text(), 'file:///custom.jpg');
  const customDetail = await api.getCustomFish(1);
  assert.equal(requests[3].route, '/api/collections/custom?customFishId=1');
  assert.equal(requests[3].token, 'test-token');
  assert.equal(customDetail.recentCatches[0].catchRecordId, 51);
  assert.equal(customDetail.recentCatches[0].verifiedAt, customResponse.registeredAt);
  assert.equal(customDetail.imageUrl, 'https://example.test/images/fish/basic_image.png');
  assert.equal(requests[4].route, '/api/collections/custom/dex');
  platform.OS = 'web';
  await api.verifyCustom({ fishName: '뚱어', size: 1, photoUri: 'data:image/jpeg;base64,aGVsbG8=' });
  assert.equal(await requests[5].body.get('image').text(), 'hello');
  assert.equal(new URL(requests[5].route, 'https://example.test').searchParams.has('location'), false);
  for (const invalid of [
    { fishName: '' }, { fishName: '가'.repeat(31) }, { photoUri: '' },
    ...[0, -1, NaN, Infinity, 301].map((size) => ({ size })),
    { location: '가'.repeat(101) }, { habitat: '가'.repeat(21) },
  ]) {
    await assert.rejects(api.verifyCustom({ fishName: '뚱어', size: 20, photoUri: 'data:image/jpeg;base64,aGVsbG8=', ...invalid }));
  }
  await assert.rejects(createApiCatchDataSource(null).verifyCustom({
    fishName: '뚱어', size: 20, photoUri: 'data:image/jpeg;base64,aGVsbG8=',
  }), (error) => error.reason === 'unauthorized');
  assert.equal(requests.length, 6, 'invalid or unauthenticated custom requests must not reach API');

  const dex = load('src/features/dex/dex-data.ts', {
    'expo-asset': { Asset: { fromModule: () => ({ uri: 'fixture-photo' }) } },
    '@/assets/images/dex/species-card.png': 'fixture-photo',
  });
  const { createFixtureCatchDataSource } = load('src/features/catch/catch-data.ts', {
    '@/features/dex/dex-data': dex,
  });
  const { createFixtureFishLogDataSource } = load('src/features/home/home-data.ts', {
    '@/features/dex/dex-data': dex,
  });
  const home = createFixtureFishLogDataSource();
  const beforeProgress = await home.getCollectionProgress();
  const fixture = createFixtureCatchDataSource();
  const catalog = await fixture.listSpecies();
  const classifiedFixture = await fixture.classify('new-photo');
  for (const candidate of classifiedFixture.candidates) {
    assert.equal(catalog.find((fish) => fish.id === candidate.fishId)?.name, candidate.name);
  }
  const newCatch = await fixture.verify({ fishId: 3, size: 25, photoUri: 'new-photo', location: '제주' });
  assert.equal(newCatch.firstCatch, true);
  const record = await dex.createFixtureDexDataSource().getCatchRecord(3);
  assert.equal(record.catchCount, 1);
  assert.equal(record.recentCatches[0].imageUrl, 'new-photo');
  assert.equal(record.recentCatches[0].location, '제주');
  const afterProgress = await home.getCollectionProgress();
  assert.equal(afterProgress.caughtCount, beforeProgress.caughtCount + 1);
  assert.equal(afterProgress.totalCount, beforeProgress.totalCount);
  assert.deepEqual(afterProgress, await dex.createFixtureDexDataSource().getMyDex());
  const customCatch = await fixture.verifyCustom({ fishName: '나만의 뚱어', size: 30, photoUri: 'custom-fixture-photo', location: '제주' });
  assert.equal((await fixture.getCustomFish(customCatch.customFishId)).catchCount, 1);
  assert.equal((await fixture.listSpecies()).some((fish) => fish.name === '나만의 뚱어'), false, 'custom names must never resolve to normal fish IDs');
  const anotherCustom = await fixture.verifyCustom({ fishName: '나만의 뚱어', size: 35, photoUri: 'second-custom-photo' });
  assert.equal(anotherCustom.customFishId, customCatch.customFishId);
  const customRecord = await fixture.getCustomFish(customCatch.customFishId);
  assert.equal(customRecord.catchCount, 2);
  assert.equal(customRecord.recentCatches[0].imageUrl, 'second-custom-photo');
  assert.equal(customRecord.recentCatches[0].verifiedAt, anotherCustom.registeredAt);
  const withCustom = await dex.createFixtureDexDataSource().getMyDex();
  assert.equal(withCustom.caughtCount, afterProgress.caughtCount, 'custom catches do not change normal completion');
  assert.equal(withCustom.totalCount, afterProgress.totalCount);
  assert.equal(withCustom.fishes.find((fish) => fish.custom)?.id, customCatch.customFishId);
  const failingFixture = createFixtureCatchDataSource('register-fail');
  const fixtureRequest = { fishName: '재시도 뚱어', size: 15, photoUri: 'retry-custom-photo' };
  await assert.rejects(failingFixture.verifyCustom(fixtureRequest));
  const retried = await failingFixture.verifyCustom(fixtureRequest);
  assert.equal((await fixture.getCustomFish(retried.customFishId)).catchCount, 1, 'failed fixture save must not leave a hidden record');
  const emptyHome = createFixtureFishLogDataSource('empty');
  assert.equal((await emptyHome.getCollectionProgress()).caughtCount, 0);
  assert.deepEqual(await emptyHome.getSeasonalFish(), []);
  assert.deepEqual(await emptyHome.getPopularSpots(), []);
  await checkBackgroundDetails();
  console.log('catch checks passed: normal/custom registration, retry, cancellation, validation, nonblocking/stale detail, web/native multipart');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
