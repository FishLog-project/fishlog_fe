const { withGradleProperties, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * 릴리즈 APK 용량을 줄인다. android/ 는 prebuild 가 다시 만들기 때문에
 * gradle.properties 와 proguard-rules.pro 를 여기서 매번 주입한다.
 */
const PROPERTIES = {
  /**
   * x86 계열은 에뮬레이터 전용이라 실기기에 쓰이지 않는다.
   * 카카오 지도 SDK 도 jni 에 arm64-v8a, armeabi-v7a 만 넣어 주므로
   * x86 빌드에서는 어차피 지도가 뜨지 않는다.
   */
  reactNativeArchitectures: 'armeabi-v7a,arm64-v8a',
  'android.enableMinifyInReleaseBuilds': 'true',
  'android.enableShrinkResourcesInReleaseBuilds': 'true',
};

/**
 * 카카오 지도 SDK 는 AAR 에 consumer proguard 규칙을 넣어 주지 않는다.
 * JNI(libK3fAndroid.so)가 자바 클래스와 메서드를 이름으로 찾기 때문에
 * 난독화하면 지도가 뜨지 않는다. 그래서 통째로 남긴다.
 */
const PROGUARD_RULES = `
# --- fishlog: 릴리즈 난독화 예외 ---

# 카카오 지도 (JNI 가 이름으로 참조한다)
-keep class com.kakao.vectormap.** { *; }
-keep interface com.kakao.vectormap.** { *; }
-keepclassmembers class com.kakao.vectormap.** {
    native <methods>;
}

# 카카오 SDK 공통 (앱 키 인증)
-keep class com.kakao.sdk.** { *; }

# patch-package 로 넣은 지도 네이티브 뷰
-keep class net.mjstudio.rnkakao.** { *; }
`;

module.exports = function withReleaseOptimization(config) {
  config = withGradleProperties(config, (gradleConfig) => {
    for (const [key, value] of Object.entries(PROPERTIES)) {
      const existing = gradleConfig.modResults.find(
        (item) => item.type === 'property' && item.key === key,
      );
      if (existing) existing.value = value;
      else gradleConfig.modResults.push({ type: 'property', key, value });
    }
    return gradleConfig;
  });

  return withDangerousMod(config, [
    'android',
    (dangerousConfig) => {
      const file = path.join(
        dangerousConfig.modRequest.platformProjectRoot,
        'app',
        'proguard-rules.pro',
      );
      const contents = fs.readFileSync(file, 'utf8');
      if (!contents.includes('fishlog: 릴리즈 난독화 예외')) {
        fs.writeFileSync(file, contents + PROGUARD_RULES);
      }
      return dangerousConfig;
    },
  ]);
};
