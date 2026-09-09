/* global __dirname */
// Run with: node scripts/check-dex-data.cjs
const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Same explicit-import TS loader as check-catch-flow; assets stay local and no API is called.
const root = path.join(__dirname, '..');
function load(file, imports = {}) {
  const { outputText } = ts.transpileModule(readFileSync(path.join(root, file), 'utf8'), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const module = { exports: {} };
  new Function('require', 'exports', 'module', outputText)((id) => {
    if (id === 'react/jsx-runtime') return require(id);
    if (id.startsWith('@/assets/')) {
      const filePath = path.join(root, id.slice(2));
      // Metro also resolves base image names to the bundled density variant.
      const asset = [filePath, filePath.replace(/(\.[^.]+)$/, '@2x$1'), filePath.replace(/(\.[^.]+)$/, '@3x$1')].find(existsSync);
      assert.ok(asset, `Missing asset: ${id}`);
      return asset;
    }
    assert.ok(id in imports, `Unexpected import: ${id}`);
    return imports[id];
  }, module.exports, module);
  return module.exports;
}

// Explicit render/effect host for the real hooks, not a substitute for native visual QA.
function host() {
  const slots = [];
  let cursor = 0;
  let effects = [];
  const changed = (slot, deps) => !slot || deps.some((value, i) => !Object.is(value, slot.deps[i]));
  const react = {
    useState(initial) {
      const i = cursor++;
      slots[i] ??= { value: initial };
      return [slots[i].value, (next) => {
        slots[i].value = typeof next === 'function' ? next(slots[i].value) : next;
      }];
    },
    useMemo(create, deps) {
      const i = cursor++;
      if (changed(slots[i], deps)) slots[i] = { deps, value: create() };
      return slots[i].value;
    },
    useCallback(callback, deps) { return react.useMemo(() => callback, deps); },
    useRef(initial) { return react.useState({ current: initial })[0]; },
    useEffect(effect, deps) {
      const i = cursor++;
      const previous = slots[i];
      if (changed(previous, deps)) effects.push(() => {
        previous?.cleanup?.();
        slots[i] = { deps, cleanup: effect() };
      });
    },
  };
  return {
    react,
    render(run, ...args) {
      cursor = 0;
      effects = [];
      const result = run(...args);
      effects.forEach((effect) => effect());
      return result;
    },
    unmount() { slots.forEach((slot) => slot?.cleanup?.()); },
  };
}
const flush = () => new Promise((resolve) => setImmediate(resolve));
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [];
}
function viewModels(react) {
  return load('src/features/dex/use-dex-view-model.ts', {
    react,
    '@/lib/use-section': load('src/lib/use-section.ts', { react }),
  });
}

async function main() {
  const dex = load('src/features/dex/dex-data.ts', {
    'expo-asset': { Asset: { fromModule: () => ({ uri: 'fixture-photo' }) } },
  });
  const fixture = dex.createFixtureDexDataSource();
  const fixtureNormal = await fixture.getMyDex();
  const normal = {
    ...fixtureNormal,
    fishes: fixtureNormal.fishes.map((fish) => ({
      ...fish, imageUrl: `https://example.test/fish/${fish.id}-${fish.caught ? 'color' : 'shadow'}.png?rev=2`,
    })),
  };
  assert.equal(normal.fishes.length, 24);
  const normalFish = { ...await fixture.getFish(1), imageUrl: normal.fishes[0].imageUrl };
  const normalRecord = await fixture.getCatchRecord(1);
  const customImageUrl = 'https://example.test/custom/default.png?rev=7';
  const rawCustom = {
    customFishId: 1, name: '감성돔', habitat: null, catchCount: 2, maxSize: 35,
    recentCatches: [{
      customCatchRecordId: 41, imageUrl: 'https://example.test/custom.jpg', size: 35,
      location: null, registeredAt: '2026-09-08T12:00:00',
    }],
  };
  const requests = [];
  let failurePath = null;
  let waitingFish = null;
  const { ApiError } = load('src/lib/api/client.ts', { 'expo/fetch': {} });
  const apiModule = load('src/features/dex/dex-api.ts', {
    '@/lib/api/client': { apiRequest: async (route, options) => {
      requests.push({ route, ...options });
      if (route === failurePath) throw new ApiError(401, 'expired');
      switch (route) {
        case '/api/collections/dex': return normal;
        case '/api/collections/custom/dex': return { fishes: [
          { id: 1, name: rawCustom.name, imageUrl: customImageUrl, habitat: null, catchCount: 2 },
          { id: 2, name: '수기 테스트 어종', imageUrl: null, habitat: '강', catchCount: 1 },
        ] };
        case '/api/fish/1': return waitingFish ?? normalFish;
        case '/api/collections?fishId=1': return normalRecord;
        case '/api/collections/custom?customFishId=1': return rawCustom;
        default: throw new Error(`Unexpected route: ${route}`);
      }
    } },
    '@/lib/api/result': load('src/lib/api/result.ts', { './client': { ApiError } }),
  });
  const api = apiModule.createApiDexDataSource('test-token');
  const merged = await api.getMyDex();
  assert.equal(merged.totalCount, normal.totalCount, 'custom entries must not inflate normal completion');
  assert.equal(merged.caughtCount, normal.caughtCount);
  assert.equal(merged.fishes.length, 26);
  assert.equal(merged.fishes.filter((fish) => fish.id === 1).length, 2, 'overlapping IDs must preserve both kinds');
  assert.equal(merged.fishes.at(-2).custom, true);
  assert.equal(merged.fishes.at(-2).caught, true);
  assert.equal(merged.fishes[0].imageUrl, normalFish.imageUrl);
  assert.equal(merged.fishes.at(-2).imageUrl, customImageUrl);
  assert.equal(merged.fishes.at(-1).imageUrl, null);
  assert.ok(requests.every((request) => request.token === 'test-token'));
  const custom = await api.getCustomFish(1);
  assert.equal(custom.imageUrl, customImageUrl, 'custom detail must use its own list artwork');
  assert.notEqual(custom.imageUrl, rawCustom.recentCatches[0].imageUrl, 'artwork and catch photos are separate');
  assert.deepEqual(custom.recentCatches, [{
    catchRecordId: 41, verifiedAt: rawCustom.recentCatches[0].registeredAt,
    imageUrl: rawCustom.recentCatches[0].imageUrl, size: 35, location: null,
  }], 'custom DTO fields must be normalized for the common photo viewer');

  for (const token of [null, '']) {
    const guest = apiModule.createApiDexDataSource(token);
    const before = requests.length;
    for (const request of [() => guest.getMyDex(), () => guest.getCatchRecord(1), () => guest.getCustomFish(1)]) {
      await assert.rejects(request, (error) => error.reason === 'unauthorized');
    }
    assert.equal(requests.length, before, 'guest private reads must stop before the API boundary');
  }
  for (failurePath of ['/api/collections/dex', '/api/collections/custom/dex']) {
    await assert.rejects(() => api.getMyDex(), (error) => error.reason === 'unauthorized');
  }
  failurePath = '/api/collections/custom?customFishId=1';
  await assert.rejects(() => api.getCustomFish(1), (error) => error.reason === 'unauthorized');
  failurePath = '/api/collections/custom/dex';
  const withoutArtwork = await api.getCustomFish(1);
  assert.equal(withoutArtwork.imageUrl, null, 'an artwork lookup failure must not hide saved catches');
  assert.deepEqual(withoutArtwork.recentCatches, custom.recentCatches);
  failurePath = null;

  dex.recordFixtureCustomCatch('감성돔', custom.recentCatches[0]);
  const afterCustom = await fixture.getMyDex();
  assert.equal(afterCustom.totalCount, normal.totalCount);
  assert.equal(afterCustom.caughtCount, normal.caughtCount);
  assert.deepEqual(afterCustom.fishes.filter((fish) => !fish.custom), fixtureNormal.fishes);
  assert.equal(afterCustom.fishes.at(-1).custom, true);
  assert.equal(afterCustom.fishes.at(-1).id, 1);
  assert.deepEqual((await fixture.getCustomFish(1)).recentCatches, custom.recentCatches);

  const vmHost = host();
  const models = viewModels(vmHost.react);
  vmHost.render(models.useDexViewModel, api);
  await flush();
  let list = vmHost.render(models.useDexViewModel, api);
  assert.equal(list.state.status, 'ready');
  assert.equal(list.state.data.progressPercent, Math.round(normal.caughtCount / normal.totalCount * 100));
  assert.equal(list.results.length, 26);
  assert.equal(list.results[0].imageUrl, normalFish.imageUrl);
  assert.equal(list.results.find((fish) => fish.id === 1 && fish.custom).imageUrl, customImageUrl);
  list.setQuery(' 수기 테스트 ');
  list = vmHost.render(models.useDexViewModel, api);
  assert.equal(list.results.length, 1);
  assert.equal(list.results[0].custom, true);
  list.setQuery('돌돔');
  assert.equal(vmHost.render(models.useDexViewModel, api).results.length, 0, 'locked species must not leak through search');
  vmHost.unmount();

  const detailHost = host();
  const detailModels = viewModels(detailHost.react);
  requests.length = 0;
  detailHost.render(detailModels.useDexDetailViewModel, api, 1, false);
  await flush();
  assert.deepEqual(requests.map((request) => request.route).sort(), ['/api/collections?fishId=1', '/api/fish/1']);
  assert.equal(requests.find((request) => request.route === '/api/fish/1').token, undefined);
  const normalDetail = detailHost.render(detailModels.useDexDetailViewModel, api, 1, false)[0].data;
  assert.equal(normalDetail.custom, undefined);
  assert.equal(normalDetail.imageUrl, normalFish.imageUrl);
  requests.length = 0;
  assert.equal(detailHost.render(detailModels.useDexDetailViewModel, api, 1, true)[0].status, 'loading');
  await flush();
  const customDetail = detailHost.render(detailModels.useDexDetailViewModel, api, 1, true)[0].data;
  assert.deepEqual(requests.map((request) => request.route).sort(), ['/api/collections/custom/dex', '/api/collections/custom?customFishId=1']);
  assert.ok(requests.every((request) => request.token === 'test-token'));
  assert.equal(customDetail.custom, true);
  assert.equal(customDetail.imageUrl, customImageUrl);
  assert.equal(customDetail.description, '');
  assert.equal(customDetail.maxSizeLabel, null, 'personal max size must not become the species max size');
  assert.equal(customDetail.catchLabel, '잡은 횟수: 2회');
  assert.deepEqual(customDetail.photos, custom.recentCatches);
  detailHost.unmount();

  const raceHost = host();
  const raceModels = viewModels(raceHost.react);
  let finishOldFish;
  waitingFish = new Promise((resolve) => { finishOldFish = resolve; });
  raceHost.render(raceModels.useDexDetailViewModel, api, 1, false);
  raceHost.render(raceModels.useDexDetailViewModel, api, 1, true);
  await flush();
  assert.equal(raceHost.render(raceModels.useDexDetailViewModel, api, 1, true)[0].data.imageUrl, customImageUrl);
  finishOldFish(normalFish);
  await flush();
  assert.equal(raceHost.render(raceModels.useDexDetailViewModel, api, 1, true)[0].data.custom, true, 'a late same-ID normal detail must not replace custom detail');
  raceHost.unmount();
  waitingFish = null;

  const colors = load('src/constants/colors.ts');
  const theme = {
    ...colors,
    ...load('src/constants/components.ts', { './colors': colors }),
    ...load('src/constants/layout.ts'),
    ...load('src/constants/typography.ts', { '@/global.css': {} }),
  };
  const uiHost = host();
  const uiModels = viewModels(uiHost.react);
  const imageHost = host();
  const art = load('src/features/dex/fish-art.tsx', {
    react: imageHost.react, 'expo-image': { Image: 'Image' }, '@/constants/theme': theme,
  });
  const imageStyle = { width: 80, height: 80 };
  const flatten = (style) => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
  let image = imageHost.render(art.FishArtwork, { imageUrl: normalFish.imageUrl, style: imageStyle });
  assert.equal(image.props.source, normalFish.imageUrl, 'the server image URL must remain authoritative');
  assert.equal(image.props.tintColor, null);
  image.props.onError({ error: 'unavailable image' });
  image = imageHost.render(art.FishArtwork, { imageUrl: normalFish.imageUrl, style: imageStyle });
  const basic = image.props.source;
  assert.match(basic, /basic_image\.png$/);
  const shadowUrl = normal.fishes.find((fish) => !fish.caught).imageUrl;
  image = imageHost.render(art.FishArtwork, { imageUrl: shadowUrl, locked: true, style: imageStyle });
  assert.equal(image.props.source, shadowUrl, 'a new URL must recover from a previous URL error');
  assert.equal(image.props.tintColor, null, 'server shadows must not be tinted again');
  assert.equal(flatten(image.props.style).opacity, undefined, 'server shadows must not be faded again');
  for (const imageUrl of [null, '']) {
    image = imageHost.render(art.FishArtwork, { imageUrl, locked: true, style: imageStyle });
    assert.equal(image.props.source, basic);
    assert.equal(image.props.tintColor, theme.Components.dex.silhouette);
    assert.equal(flatten(image.props.style).opacity, theme.Components.dex.silhouetteOpacity);
  }
  image = imageHost.render(art.FishArtwork, { imageUrl: customImageUrl, style: imageStyle });
  assert.equal(image.props.source, customImageUrl, 'custom artwork must not be replaced by a name-based asset');
  assert.equal(image.props.tintColor, null);
  imageHost.unmount();
  const uiImports = {
    react: uiHost.react,
    'react-native': {
      ...Object.fromEntries(['FlatList', 'Image', 'Modal', 'Pressable', 'Text', 'View'].map((name) => [name, name])),
      StyleSheet: { create: (styles) => styles, absoluteFill: {} },
    },
    'expo-image': { Image: 'Image' },
    'expo-linear-gradient': { LinearGradient: 'LinearGradient' },
    '@/constants/theme': theme,
    '@/features/dex/fish-art': art,
    '@/features/dex/use-dex-view-model': uiModels,
    '@/components/common': Object.fromEntries(['Screen', 'ScreenHeader', 'ScreenState', 'SearchBar'].map((name) => [name, name])),
  };
  const cards = load('src/features/dex/components/species-card.tsx', uiImports);
  const dialogs = load('src/features/dex/components/species-detail-dialog.tsx', uiImports);
  const screen = load('src/app/(tabs)/dex/index.tsx', {
    ...uiImports,
    'expo-router': { useRouter: () => ({}), useFocusEffect: () => {} },
    '@/features/auth': { useAuth: () => ({ token: 'test-token' }) },
    '@/features/dex/dex-api': apiModule,
    '@/features/dex/dex-data': dex,
    '@/features/dex/components/species-card': cards,
    '@/features/dex/components/species-detail-dialog': dialogs,
    '@/lib/data-source-mode': { USE_FIXTURE: false },
  }).default;
  uiHost.render(screen);
  await flush();
  let tree = uiHost.render(screen);
  const grid = nodes(tree).find((node) => node.type === 'FlatList').props;
  const normalEntry = grid.data.find((fish) => fish?.id === 1 && !fish.custom);
  const customEntry = grid.data.find((fish) => fish?.id === 1 && fish.custom);
  assert.equal(grid.keyExtractor(normalEntry), 'fish-1');
  assert.equal(grid.keyExtractor(customEntry), 'custom-1');
  const keys = grid.data.map(grid.keyExtractor);
  assert.equal(new Set(keys).size, keys.length, 'normal/custom and padding keys must be distinct');
  for (const species of [normalEntry, customEntry, grid.data.find((fish) => fish && !fish.caught)]) {
    let pressed;
    const card = cards.SpeciesCard({ species, onPress: (value) => { pressed = value; } });
    const artwork = nodes(card).find((node) => node.type === art.FishArtwork);
    assert.equal(artwork.props.imageUrl, species.imageUrl);
    assert.equal(artwork.props.locked, !species.caught);
    assert.equal(artwork.props.tintColor, undefined);
    assert.equal(flatten(artwork.props.style).opacity, undefined);
    assert.equal(card.props.disabled, !species.caught);
    if (species.caught) { card.props.onPress(); assert.equal(pressed, species); }
  }
  const dialogKeys = [];
  for (const species of [normalEntry, customEntry]) {
    grid.renderItem({ item: species }).props.onPress(species);
    tree = uiHost.render(screen);
    const dialog = nodes(tree).find((node) => node.type === dialogs.SpeciesDetailDialog);
    assert.equal(dialog.props.fishId, 1);
    assert.equal(dialog.props.custom, species.custom);
    const loader = nodes(dialogs.SpeciesDetailDialog(dialog.props)).find((node) => node.type?.name === 'SpeciesDetailLoader');
    dialogKeys.push(loader.key);
    assert.equal(loader.props.custom, !!species.custom);
  }
  assert.notEqual(...dialogKeys, 'switching same-ID species kinds must remount their detail loader');
  uiHost.unmount();
  console.log('dex checks passed: server artwork/fallback, custom DTO/photos, ID/detail separation, completion/search, guest/errors, stale responses and route keys');
}

module.exports = { load, host, flush, nodes };
if (require.main === module) main().catch((error) => { console.error(error); process.exitCode = 1; });
