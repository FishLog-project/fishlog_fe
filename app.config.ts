import type { ConfigContext, ExpoConfig } from 'expo/config';

import appJson from './app.json';

const staticConfig = appJson.expo as ExpoConfig;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  ...staticConfig,
  ios: {
    ...staticConfig.ios,
    bundleIdentifier: 'xyz.fishlog.app',
  },
  plugins: [
    ...(staticConfig.plugins ?? []),
    './plugins/with-kakao-maven',
    './plugins/with-spot-marker-drawable',
    './plugins/with-release-signing',
    './plugins/with-adaptive-icon-inset',
  ],
  extra: {
    ...config.extra,
    kakaoNativeAppKey: process.env.KAKAO_NATIVE_APP_KEY,
    /**
     * 좌표 → 주소 변환(카카오 Local REST API)에 쓴다.
     *
     * 네이티브 앱 키로는 이 API 를 부를 수 없다. KA 헤더의 origin(키 해시)까지
     * 요구하는데 그 값은 네이티브에서만 구할 수 있기 때문이다.
     * 키가 없으면 주소를 비워 둘 뿐 화면은 그대로 동작한다.
     */
    kakaoRestApiKey: process.env.KAKAO_REST_API_KEY,
  },
});
