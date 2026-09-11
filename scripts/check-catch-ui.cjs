// Run with: node scripts/check-catch-ui.cjs
const assert = require('node:assert/strict');
const { load, host, nodes } = require('./check-dex-data.cjs');

globalThis.__DEV__ = false;
const screenHost = host();
const videoHost = host();
let step = 'analyzing';
let reducedMotion = false;
let status = 'loading';
const player = { play() { this.played = true; } };
const screen = load('src/app/catch.tsx', {
  react: { ...screenHost.react, useState: videoHost.react.useState },
  expo: { useEvent: () => ({ status }) },
  'expo-asset': {},
  'expo-camera': {},
  'expo-image': { Image: 'Image' },
  'expo-image-picker': {},
  'expo-router': { useRouter: () => ({}), useLocalSearchParams: () => ({}) },
  'expo-router/react-navigation': { usePreventRemove() {} },
  'expo-video': {
    VideoView: 'VideoView',
    useVideoPlayer(source, setup) {
      assert.match(source, /catch-analysis\.mp4$/);
      return videoHost.react.useMemo(() => { setup(player); return player; }, []);
    },
  },
  'react-native': {
    View: 'View', Text: 'Text', StyleSheet: { create: (styles) => styles, absoluteFill: {} },
  },
  'react-native-reanimated': { useReducedMotion: () => reducedMotion },
  '@/components/common': { Screen: 'Screen', ScreenHeader: 'ScreenHeader' },
  '@/constants/theme': { Brand: {}, Components: { catch: {}, dex: { detail: {} } }, Typography: {} },
  '@/features/auth': { useAuth: () => ({ token: 'qa' }) },
  '@/features/catch/catch-api': { createApiCatchDataSource: () => ({}) },
  '@/features/catch/catch-data': { CATCH_FIXTURE_SCENARIOS: [] },
  '@/features/catch/use-catch-flow': { useCatchFlow: () => ({ state: { step, reason: 'empty' }, registering: false }) },
  '@/features/dex/components/species-detail-dialog': {},
  '@/features/dex/fish-art': {},
  '@/lib/data-source-mode': { USE_FIXTURE: false },
}).default;

function analysis() {
  const element = nodes(screenHost.render(screen)).find((node) => node.type?.name === 'AnalyzingStep');
  return element.type(element.props);
}
const animation = nodes(analysis()).find((node) => node.type?.name === 'AnalysisAnimation');
assert.ok(animation, 'analysis must mount the video');
let tree = videoHost.render(animation.type);
assert.ok(player.loop && player.muted && player.played, 'analysis must autoplay silently and loop');
const video = nodes(tree).find((node) => node.type === 'VideoView');
assert.equal(video.props.nativeControls, false);
assert.ok(nodes(tree).some((node) => node.type === 'Image'), 'keep the illustration until a frame renders');
status = 'readyToPlay';
video.props.onFirstFrameRender();
tree = videoHost.render(animation.type);
assert.ok(!nodes(tree).some((node) => node.type === 'Image'), 'reveal the playing video');
status = 'error';
tree = videoHost.render(animation.type);
assert.ok(nodes(tree).some((node) => node.type === 'Image'), 'media failure must restore the illustration');
for (const mode of ['reduced-motion', 'analysis-error']) {
  reducedMotion = mode === 'reduced-motion';
  step = mode === 'analysis-error' ? 'error' : 'analyzing';
  assert.ok(!nodes(analysis()).some((node) => node.type?.name === 'AnalysisAnimation'), `${mode}: do not mount a player`);
}
console.log('catch UI checks passed: analysis video, first-frame/error fallback, reduced motion and failed-analysis stop');
