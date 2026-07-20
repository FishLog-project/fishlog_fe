# FishLog

FishLog 프론트엔드 앱입니다. Expo SDK 57과 Expo Router를 사용해 iOS, Android, Web을 지원합니다.

## 요구 사항

- Node.js 22.13 이상
- npm

## 설치 및 실행

```bash
npm ci
npm run start
```

Expo 개발 서버가 실행되면 터미널에서 플랫폼을 선택할 수 있습니다.

```bash
npm run ios
npm run android
npm run web
```

## 주요 경로

| 경로 | 화면 |
| --- | --- |
| `/` | 메인 |
| `/map` | 지도 |
| `/dex` | 도감 |
| `/my` | 마이 |
| `/spot/[spotId]` | 스팟 상세 |
| `/species/[speciesId]` | 어종 상세 |
| `/catch/verify` | 낚시 인증 |
| `/states` | 공통 loading·empty·error·retry 상태 |

## 검사

```bash
npm run typecheck
```

화면 기준은 [관광데이터 공모전 Figma](https://www.figma.com/design/INwO5bCiYYEvIRkfAL2QEZ/%EA%B4%80%EA%B4%91%EB%8D%B0%EC%9D%B4%ED%84%B0-%EA%B3%B5%EB%AA%A8%EC%A0%84?node-id=1-3)를 참고합니다.
