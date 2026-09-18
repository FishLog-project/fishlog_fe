/* global __dirname */
// Run: node scripts/check-native-map.cjs — controlled camera intents and real native prop routing.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { load, host, flush } = require('./check-dex-data.cjs');
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };

async function main() {
  const hooks = host();
  const quick = deferred();
  const fresh = deferred();
  const pressed = [];
  const centers = [];
  const { FishlogKakaoMap } = load('src/features/map/kakao-map.tsx', {
    react: { ...hooks.react, useLayoutEffect: hooks.react.useEffect },
    '@react-native-kakao/map': { KakaoMap: { initializeKakaoMapSDK: async () => {} }, KakaoMapView: 'NativeMap' },
    'expo-constants': { __esModule: true, default: { expoConfig: { extra: { kakaoNativeAppKey: 'controlled-test-key' } } } },
    'react-native': { ActivityIndicator: 'ActivityIndicator', StyleSheet: { create: (styles) => styles }, Text: 'Text', View: 'View' },
    '@/constants/theme': { Brand: {}, Typography: {} },
    '@/features/map/geo': load('src/features/map/geo.ts'),
    '@/features/map/location-store': { getQuickLocation: () => quick.promise, requestFreshLocation: () => fresh.promise },
  });
  let props = {
    recenterSignal: 0,
    spots: [{ id: 7, name: '낚시터', lat: 33, lng: 126 }],
    tourPlaces: [{ id: '7', name: '관광지', lat: 33.1, lng: 126.1 }],
    onSpotPress: (id) => pressed.push(['spot', id]),
    onTourPress: (id) => pressed.push(['tour', id]),
    onMapPress: () => pressed.push(['map']),
    onCameraIdle: (center) => centers.push(center),
  };
  const render = () => { hooks.render(FishlogKakaoMap, props); return hooks.render(FishlogKakaoMap, props); };
  render();
  await flush();
  let map = render();
  assert.deepEqual(map.props.spots.map(({ id }) => id), ['spot:7', 'tour:7']);
  map.props.onSpotPress({ nativeEvent: { id: 'spot:7' } });
  map.props.onSpotPress({ nativeEvent: { id: 'tour:7' } });
  map.props.onSpotPress({ nativeEvent: { id: 'spot:NaN' } });
  assert.deepEqual(pressed, [['spot', 7], ['tour', '7']]);
  map.props.onMapPress({ nativeEvent: {} });
  assert.deepEqual(pressed.at(-1), ['map']);

  // JS mocks cannot execute the SDK. Guard both native routes in the committed installation patch.
  const patch = fs.readFileSync(path.join(__dirname, '../patches/@react-native-kakao+map+2.2.7.patch'), 'utf8');
  assert.match(patch, /setOnTerrainClickListener[^\n]+emitMapPress/);
  assert.match(patch, /terrainDidTappedWithKakaoMap:[^\n]+\n\+\s+\[self\.target terrainDidTappedWithKakaoMap:map position:position\]/);
  assert.match(patch, /terrainDidTappedWithKakaoMap:[^\n]+\n\+\s+if \(_eventEmitter\)[^\n]+onMapPress\(\{\}\)/);

  // Search wins even when both the cached lookup and fresh GPS resolve after selection.
  props = { ...props, focus: { lat: 35, lng: 129, nonce: 1 } };
  render();
  quick.resolve({ lat: 33, lng: 126 });
  await flush();
  fresh.resolve({ lat: 34, lng: 127 });
  await flush();
  map = render();
  assert.deepEqual(map.props.camera, { lat: 35, lng: 129, zoomLevel: 15, nonce: 1 });
  assert.deepEqual(map.props.currentLocation, { lat: 34, lng: 127 }, 'GPS still updates location dot');

  // Panning is owned by the SDK. Facility updates and sheet rerenders must not send a new camera intent.
  const searchCamera = map.props.camera;
  const panned = { lat: 36, lng: 128, zoomLevel: 16 };
  map.props.onCameraIdle({ nativeEvent: panned });
  props = { ...props, tourPlaces: [{ id: '8', name: '새 관광지', lat: 36, lng: 128 }] };
  map = render();
  assert.deepEqual(centers, [panned]);
  assert.equal(map.props.camera, searchCamera, 'new facility markers must not recenter the panned map');
  const facilityMarkers = map.props.spots;
  props = { ...props, onTourPress: (id) => pressed.push(['tour', id]) };
  map = render();
  assert.equal(map.props.spots, facilityMarkers, 'sheet selection must not rebuild native markers');
  assert.equal(map.props.camera, searchCamera, 'sheet selection must not interrupt native map gestures');

  // A subsequent explicit recenter wins over the old search; repeating coordinates still changes nonce.
  props = { ...props, recenterSignal: 1 };
  render();
  await flush();
  map = render();
  assert.deepEqual(map.props.camera, { lat: 34, lng: 127, zoomLevel: 9, nonce: -4 });
  props = { ...props, recenterSignal: 2, tourPlaces: [] };
  render();
  await flush();
  map = render();
  assert.equal(map.props.camera.nonce, -6);
  assert.deepEqual(map.props.spots.map(({ id }) => id), ['spot:7']);
  hooks.unmount();
  console.log('Native map checks passed: GPS/search/recenter order, same-position nonce, marker namespaces and removal');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
