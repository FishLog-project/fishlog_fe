// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const TOKEN_RULE_MESSAGE =
  'Palette/Derived는 constants 안에서만 씁니다. 화면에서는 Brand 또는 Components를 쓰고, 맞는 토큰이 없으면 colors.ts에 추가하세요.';

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // 색상은 의미 토큰(Brand/Components)으로만 참조한다.
    // Palette는 Figma 컬렉션 이름이라 역할을 설명하지 못하고(`font.white`를 배경에 쓰는 식),
    // Derived는 아직 팔레트에 없는 임시 값이라 화면이 직접 의존하면 안 된다.
    // 두 토큰의 소비자는 src/constants/ 안쪽으로 한정한다.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/constants/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          // `paths`는 정확히 일치하는 모듈만 막아서 상대경로(`../../constants/colors`)로
          // 우회된다. 실제로 뚫리는 걸 확인했으므로 경로 패턴으로도 함께 막는다.
          paths: [
            {
              name: '@/constants/theme',
              importNames: ['Palette', 'Derived'],
              message: TOKEN_RULE_MESSAGE,
            },
            {
              name: '@/constants/colors',
              importNames: ['Palette', 'Derived'],
              message: TOKEN_RULE_MESSAGE,
            },
          ],
          patterns: [
            {
              group: ['**/constants/colors', '**/constants/theme'],
              importNames: ['Palette', 'Derived'],
              message: TOKEN_RULE_MESSAGE,
            },
          ],
        },
      ],
    },
  },
]);
