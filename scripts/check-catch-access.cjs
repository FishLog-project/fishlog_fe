// Run with: node scripts/check-catch-access.cjs
const assert = require('node:assert/strict');
const { load, host, nodes } = require('./check-dex-data.cjs');

globalThis.__DEV__ = false;
const find = (tree, type) => nodes(tree).find((node) => node.type === type);
const copy = (tree) => nodes(tree).flatMap((node) =>
  Array.isArray(node.props?.children) ? node.props.children : [node.props?.children]);

function catchStep(step, { permission = null, platform = 'ios', pick } = {}) {
  const view = host();
  let requests = 0;
  let picks = 0;
  let captured;
  const flow = { state: { step, fishName: '광어', sizeCm: null, manual: false }, analyze: (uri) => { captured = uri; } };
  const Screen = load('src/app/catch.tsx', {
    '@expo/vector-icons': { Ionicons: 'Ionicons' },
    react: { ...view.react, useMemo: (fn) => fn() },
    expo: {}, 'expo-asset': {},
    'expo-camera': {
      CameraView: 'CameraView',
      useCameraPermissions: () => [permission, async () => {
        requests++;
        permission = { granted: true, canAskAgain: true };
        return permission;
      }],
    },
    'expo-image': { Image: 'Image' },
    'expo-image-picker': { launchImageLibraryAsync: async (options) => {
      picks++;
      assert.deepEqual(options.mediaTypes, ['images']);
      return pick ? pick() : { canceled: false, assets: [{ uri: 'chosen-fish.jpg' }] };
    } },
    'expo-router': { useRouter: () => ({}), useLocalSearchParams: () => ({}) },
    'expo-router/react-navigation': { usePreventRemove() {} },
    'expo-video': {},
    'react-native-reanimated': {},
    'react-native': { Platform: { OS: platform }, View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView', StyleSheet: { create: (s) => s, absoluteFill: {} } },
    '@/components/common': Object.fromEntries(['Screen', 'ScreenHeader', 'ScreenState', 'AppDialog', 'PrimaryButton', 'TextField'].map((name) => [name, name])),
    '@/constants/theme': { Brand: {}, Components: { catch: {}, dex: { detail: {} } }, Typography: {} },
    '@/features/auth': { useAuth: () => ({ token: 'qa' }) },
    '@/features/catch/catch-api': { createApiCatchDataSource: () => ({}) },
    '@/features/catch/catch-data': { CATCH_FIXTURE_SCENARIOS: [] },
    '@/features/catch/use-catch-flow': { useCatchFlow: () => flow },
    '@/features/dex/components/species-detail-dialog': {},
    '@/features/dex/fish-art': {},
    '@/lib/data-source-mode': { USE_FIXTURE: false },
  }).default;
  const element = nodes(Screen()).find((node) => node.type?.name === (step === 'capture' ? 'CaptureStep' : 'ResultStep'));
  return {
    render: (props = element.props) => view.render(element.type, props),
    props: element.props,
    counts: () => ({ requests, picks, captured }),
  };
}

async function main() {
  const pending = catchStep('capture');
  assert.equal(find(pending.render(), 'AppDialog').props.visible, false, 'wait for permission status');
  const granted = catchStep('capture', { permission: { granted: true, canAskAgain: true } });
  assert.equal(find(granted.render(), 'AppDialog').props.visible, false);
  assert.ok(find(granted.render(), 'CameraView'));

  const gallery = (tree) => nodes(tree).find((node) => node.props?.accessibilityLabel === '사진 보관함에서 선택하기');
  for (const platform of ['ios', 'android', 'web']) {
    let finish;
    let first = true;
    const pendingPick = new Promise((resolve) => { finish = resolve; });
    const camera = catchStep('capture', {
      permission: { granted: true, canAskAgain: true }, platform,
      pick: () => {
        if (first) { first = false; return pendingPick; }
        return { canceled: false, assets: [{ uri: 'chosen-fish.jpg' }] };
      },
    });
    find(camera.render(), 'CameraView').props.onCameraReady();
    const button = gallery(camera.render());
    assert.ok(button, `${platform}: the gallery stays visible beside a working camera`);
    assert.equal(button.props.disabled, false);
    button.props.onPress();
    button.props.onPress();
    assert.equal(camera.counts().picks, 1, 'rapid taps must open only one picker before React re-renders');
    assert.equal(gallery(camera.render()).props.disabled, true);
    assert.equal(nodes(camera.render()).find((node) => node.props?.accessibilityLabel === '촬영하기').props.disabled, true);
    finish({ canceled: true, assets: null });
    await new Promise(setImmediate);
    assert.equal(camera.counts().captured, undefined, 'cancelling must keep the capture step');
    assert.ok(find(camera.render(), 'CameraView'));
    assert.equal(gallery(camera.render()).props.disabled, false);
    gallery(camera.render()).props.onPress();
    await new Promise(setImmediate);
    assert.deepEqual(camera.counts(), { requests: 0, picks: 2, captured: 'chosen-fish.jpg' });
  }
  const failedPick = catchStep('capture', {
    permission: { granted: true, canAskAgain: true },
    pick: async () => { throw new Error('picker unavailable'); },
  });
  gallery(failedPick.render()).props.onPress();
  await new Promise(setImmediate);
  assert.equal(failedPick.counts().captured, undefined);
  assert.equal(gallery(failedPick.render()).props.disabled, false, 'picker failure must allow retry');
  assert.ok(copy(failedPick.render()).some((text) => typeof text === 'string' && text.includes('사진을 불러오지 못했어요')));

  const ask = catchStep('capture', { permission: { granted: false, canAskAgain: true } });
  let dialog = find(ask.render(), 'AppDialog');
  assert.equal(dialog.props.visible, true);
  assert.equal(dialog.props.buttonLabel, '카메라 허용하기');
  await dialog.props.onConfirm();
  assert.equal(ask.counts().requests, 1);
  assert.equal(find(ask.render(), 'AppDialog').props.visible, false);
  assert.ok(find(ask.render(), 'CameraView'), 'permission grant enables camera');

  for (const platform of ['ios', 'android', 'web']) {
    const denied = catchStep('capture', { permission: { granted: false, canAskAgain: false }, platform });
    dialog = find(denied.render(), 'AppDialog');
    assert.equal(dialog.props.buttonLabel, '사진 선택하기', 'permanent denial offers the library');
    dialog.props.onConfirm();
    if (platform === 'ios') {
      assert.equal(denied.counts().picks, 0, 'wait until iOS modal is dismissed');
      const closed = find(denied.render(), 'AppDialog');
      assert.equal(closed.props.visible, false);
      closed.props.onDismiss();
      closed.props.onDismiss();
    }
    await new Promise(setImmediate);
    assert.deepEqual(denied.counts(), { requests: 0, picks: 1, captured: 'chosen-fish.jpg' });
  }

  const result = catchStep('result');
  let tree = result.render();
  assert.equal(find(tree, 'PrimaryButton').props.disabled, true);
  assert.ok(copy(tree).some((text) => typeof text === 'string' && text.includes('물고기 크기(cm)를 입력')));
  tree = result.render({ ...result.props, sizeCm: 20 });
  assert.equal(find(tree, 'PrimaryButton').props.disabled, false);
  assert.ok(!copy(tree).some((text) => typeof text === 'string' && text.includes('물고기 크기(cm)를 입력')));

  let token = null;
  let route;
  let historyState = { status: 'error' };
  const history = load('src/app/settings/catch-records.tsx', {
    react: { useMemo: (fn) => fn() },
    'expo-router': { useRouter: () => ({ push: (next) => { route = next; } }) },
    'react-native': { View: 'View', Text: 'Text', StyleSheet: { create: (s) => s } },
    '@/components/common': { Screen: 'Screen', ScreenHeader: 'ScreenHeader', ScreenState: 'ScreenState', SettingsListItem: 'SettingsListItem' },
    '@/constants/theme': { Brand: {}, Components: { profile: { records: {} } }, Layout: {}, Typography: {} },
    '@/features/auth': { useAuth: () => ({ token }) },
    '@/features/catch/catch-history-api': { createApiCatchHistoryDataSource: () => ({}) },
    '@/features/catch/catch-history-data': {},
    '@/features/catch/use-catch-history': { useCatchHistory: () => [historyState, () => {}] },
    '@/lib/data-source-mode': { USE_FIXTURE: false },
  }).default;
  const guest = find(history(), 'ScreenState');
  assert.equal(guest.props.actionLabel, '로그인하기');
  assert.equal(guest.props.onRetry, undefined);
  guest.props.onAction();
  assert.equal(route, '/auth/login');
  token = 'qa';
  assert.equal(typeof find(history(), 'ScreenState').props.onRetry, 'function', 'authenticated failures still retry');
  historyState = { status: 'ready', data: [{
    date: '2026-09-18',
    dateLabel: '2026년 9월 18일',
    items: [
      { recordId: 11, recordType: 'DEX', fishId: 3, label: '돌돔 (25cm)' },
      { recordId: 12, recordType: 'CUSTOM', fishId: 2, label: '직접 등록 어종 (31cm)' },
    ],
  }] };
  const historyRows = nodes(history()).filter((node) => node.type === 'SettingsListItem');
  historyRows[0].props.onPress();
  assert.equal(route.pathname, '/dex');
  assert.deepEqual({ fishId: route.params.fishId, fishType: route.params.fishType }, { fishId: '3', fishType: 'DEX' });
  assert.match(route.params.openRequest, /^11-\d+$/);
  historyRows[1].props.onPress();
  assert.deepEqual({ fishId: route.params.fishId, fishType: route.params.fishType }, { fishId: '2', fishType: 'CUSTOM' });
  console.log('catch access checks passed: persistent gallery, cancellation/duplicate taps/failure, camera permission states, iOS modal ordering, required size guidance, guest login');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
