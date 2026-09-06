// Run with: node scripts/check-catch-flow.cjs
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

// Minimal state/ref host: re-render explicitly after actions; keep async work controllable.
function mount(source) {
  const slots = [];
  let cursor = 0;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (next) => {
        slots[index] = typeof next === 'function' ? next(slots[index]) : next;
      }];
    },
    useRef(initial) { return react.useState({ current: initial })[0]; },
    useCallback(callback) { return callback; },
  };
  const { useCatchFlow } = load('src/features/catch/use-catch-flow.ts', {
    react,
    '@/features/dex/use-dex-view-model': { toDexSpeciesDetail: (fish) => fish },
  });
  return () => { cursor = 0; return useCatchFlow(source); };
}

async function main() {
  let calls = 0;
  const source = {
    classify: async () => ({ candidates: [{ fishId: 1, name: '광어', sizeCm: 20 }] }),
    listSpecies: async () => [{ id: 1, name: '광어' }],
    verify: async ({ fishId, size, photoUri }) => {
      calls += 1;
      return { fishId, fishName: '광어', size, imageUrl: photoUri, catchCount: 1 };
    },
    getFish: async () => { throw new Error('detail unavailable after successful save'); },
  };
  const render = mount(source);
  await render().analyze('photo');
  render().startManual();
  render().setFishName('unknown');
  render().setSizeCm(20);
  await render().register();
  assert.equal(render().state.step, 'result', 'unknown species must not claim a successful save');
  assert.match(render().registrationError, /어종명/);
  assert.equal(calls, 0);
  render().setFishName('광어');
  const listSpecies = source.listSpecies;
  source.listSpecies = async () => { throw new Error('offline'); };
  await render().register();
  assert.equal(render().state.step, 'result');
  assert.match(render().registrationError, /다시 시도/);
  assert.equal(render().state.photoUri, 'photo');
  source.listSpecies = listSpecies;

  for (const size of [0, -1, NaN, Infinity, 1001]) {
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

  const classified = deferred();
  source.classify = () => classified.promise;
  render().retake();
  const analyzing = render().analyze('cancelled-photo');
  render().retake();
  classified.resolve({ candidates: [{ fishId: 1, name: '광어' }] });
  await analyzing;
  assert.equal(render().state.step, 'capture', 'cancelled analysis must not reopen results');

  const requests = [];
  const platform = { OS: 'web' };
  const { createApiCatchDataSource } = load('src/features/catch/catch-api.ts', {
    'expo-file-system': { File: class extends Blob { constructor(uri) { super([uri]); } } },
    'react-native': { Platform: platform },
    '@/lib/api/client': { apiRequest: async (route, options) => { requests.push({ route, ...options }); } },
    '@/lib/api/result': { toFail: (error) => error },
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
  console.log('catch checks passed: registration, cancellation, validation, web/native multipart');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
