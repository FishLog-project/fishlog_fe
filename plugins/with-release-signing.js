const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * 릴리즈 APK/AAB 서명 설정을 붙인다.
 *
 * expo prebuild 는 android/ 를 통째로 다시 만들기 때문에 build.gradle 을 직접 고쳐두면
 * 다음 prebuild 에서 사라진다. 그래서 플러그인으로 매번 주입한다.
 *
 * 키스토어 경로와 비밀번호는 저장소에 두지 않는다. 빌드하는 PC 의
 * ~/.gradle/gradle.properties 에 아래 네 값을 넣어 두면 릴리즈 빌드가 그 키로 서명한다.
 *
 *   FISHLOG_UPLOAD_STORE_FILE=C:/Users/<사용자>/keystores/fishlog-release.keystore
 *   FISHLOG_UPLOAD_STORE_PASSWORD=...
 *   FISHLOG_UPLOAD_KEY_ALIAS=fishlog
 *   FISHLOG_UPLOAD_KEY_PASSWORD=...
 *
 * 값이 없으면 디버그 키로 되돌아가 로컬 개발 빌드는 그대로 동작한다.
 */
const PROPERTY = 'FISHLOG_UPLOAD_STORE_FILE';

const RELEASE_SIGNING_CONFIG = `        release {
            if (project.hasProperty('${PROPERTY}')) {
                storeFile file(project.property('${PROPERTY}'))
                storePassword project.property('FISHLOG_UPLOAD_STORE_PASSWORD')
                keyAlias project.property('FISHLOG_UPLOAD_KEY_ALIAS')
                keyPassword project.property('FISHLOG_UPLOAD_KEY_PASSWORD')
            }
        }
`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (gradleConfig) => {
    const { modResults } = gradleConfig;
    let contents = modResults.contents;

    if (contents.includes(PROPERTY)) return gradleConfig;

    // 1) signingConfigs 안에 release 블록을 추가한다 (debug 블록 바로 뒤)
    const debugBlock = `        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
`;
    if (!contents.includes(debugBlock)) {
      throw new Error('signingConfigs.debug block was not found in app/build.gradle.');
    }
    contents = contents.replace(debugBlock, debugBlock + RELEASE_SIGNING_CONFIG);

    // 2) release 빌드가 디버그 키 대신 위 설정을 쓰게 한다
    const debugSigning = '            signingConfig signingConfigs.debug\n            def enableShrinkResources';
    if (!contents.includes(debugSigning)) {
      throw new Error('buildTypes.release signingConfig line was not found in app/build.gradle.');
    }
    contents = contents.replace(
      debugSigning,
      `            signingConfig project.hasProperty('${PROPERTY}') ? signingConfigs.release : signingConfigs.debug\n            def enableShrinkResources`,
    );

    modResults.contents = contents;
    return gradleConfig;
  });
};
