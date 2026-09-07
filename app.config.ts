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
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          '현재 위치를 기준으로 주변 낚시터를 보여드리기 위해 위치 권한이 필요합니다.',
      },
    ],
    './plugins/with-kakao-maven',
  ],
  extra: {
    ...config.extra,
    kakaoNativeAppKey: process.env.KAKAO_NATIVE_APP_KEY,
  },
});
