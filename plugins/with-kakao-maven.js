const { withProjectBuildGradle } = require('expo/config-plugins');

const KAKAO_REPOSITORIES = [
  "maven { url 'https://devrepo.kakao.com/nexus/content/groups/public/' }",
  "maven { url 'https://devrepo.kakao.com/nexus/repository/kakaomap-releases/' }",
];

module.exports = function withKakaoMaven(config) {
  return withProjectBuildGradle(config, (projectConfig) => {
    const { modResults } = projectConfig;
    const missingRepositories = KAKAO_REPOSITORIES.filter(
      (repository) => !modResults.contents.includes(repository),
    );

    if (missingRepositories.length === 0) return projectConfig;

    const anchor = "    maven { url 'https://www.jitpack.io' }";
    if (!modResults.contents.includes(anchor)) {
      throw new Error('Android Maven repository block was not found.');
    }

    modResults.contents = modResults.contents.replace(
      anchor,
      `${anchor}\n    ${missingRepositories.join('\n    ')}`,
    );
    return projectConfig;
  });
};
