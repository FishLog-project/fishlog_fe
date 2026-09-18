# 최신 통합 QA

[2026-09-18 스토어 QA 후속 수정](docs/qa/store-followup.md)에 #35·#36·#39·#42의 최신 검증과 기존 #33–#40·#28의 이력을 정리했다.
아래는 각 브랜치에서 당시 수행한 검증 이력이다.

---

# 인증 분석 영상 화질 개선 (2026-09-15)

`dev`의 `3f5d7c2`를 기준으로 한 `fix/catch-analysis-quality`다. 영상 교체는 지도·출시 준비 패치와 독립적이다.

- `assets/videos/catch-analysis.mp4`를 사용자 제공 `인증.gif` 원본(1440×2560)에서 다시 인코딩했다.
- 기존 406×720 / 1,260,586 bytes → 1080×1920 / 4,486,881 bytes. H.264 `yuv420p`, 24fps, 124프레임, 약 5.17초다.
- 무음 재생에 불필요한 오디오 트랙을 제거했다. 원화·동작과 기존 반복 재생, 첫 프레임/오류 대체 이미지, 동작 줄이기 처리는 유지한다.
- GIF 원본의 미세한 디더링은 남는다. 낮은 해상도의 MP4를 확대하지 않고 고해상도 원본을 사용했다.

원본 GIF SHA-256: `f401ea85a02c1226ccb1b3f85208678624d5cb75aae0cc9c2b9700c8f47c968b`

```sh
ffmpeg -i 인증.gif -vf 'scale=1080:1920:flags=lanczos,fps=24' \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -an \
  -movflags +faststart assets/videos/catch-analysis.mp4
```

- [x] 동일 영상과 재생 컴포넌트를 사용하는 기존 최신 개발 빌드에서 iPhone 17 Pro / iOS 26.5 교체 전후 화면 및 서로 다른 재생 프레임 확인
- [x] `slow` fixture로 분석 화면 재생 확인; 확인 후 `USE_FIXTURE=false` 복원
- [x] `dev` 기준 `scripts/check-*.cjs` 6개, 타입 검사, 린트, `git diff --check`
- [x] `dev` 기준 iOS·Android·웹 production export 및 MP4 전체 프레임 디코딩 검사


---

# PR #24 기준 수정 QA (2026-09-14)

기준은 `dev`의 `f224112`(PR #24 head)이며 수정 브랜치는 `fix/pr24-qa`다.
아래 2026-09-11 기록은 당시 통합본의 이력으로 보존한다.
수정 PR의 대상은 **dev**다. PR #24(dev → main)는 별도 PR이며 이번 작업에서는 병합하지 않는다.
회원가입 완료 이미지 수정은 팀원이 완료했다고 알려 이번 범위에서 제외했다.

## 수정 범위와 재현 검사

| 이슈 | 수정 | 검증 |
| --- | --- | --- |
| [#25](https://github.com/FishLog-project/fishlog_fe/issues/25) | 잠금 파일에서 빠진 `@emnapi/core`·`@emnapi/runtime` 복구, 버전 업그레이드 없음 | 별도 빈 설치 폴더에서 `npm ci` 및 카카오 core/map postinstall 패치 성공 |
| [#26](https://github.com/FishLog-project/fishlog_fe/issues/26) | iOS 낚시터·관광 시설·현재 위치 마커와 터치/카메라 이벤트, 검색 뒤 늦은 GPS 카메라 이동 무효화 | `check-native-map`: GPS/검색/재중앙화 순서, 동일 좌표 nonce, 마커 종류별 ID·제거 검사; 네이티브 빌드 결과는 아래 참고 |
| [#27](https://github.com/FishLog-project/fishlog_fe/issues/27) | 관광 마커·목록·상세의 상태 공유, 축소/확장 시트와 고정 딤, 지도·저장 목록 찜 공유, 누락된 낚시지수 | `check-map-state`, `check-tour-data`: 오래된 요청·계정 전환·연타·실패 복구·분류 변경·상세 복귀·예보 등급 검사 |
| [#28](https://github.com/FishLog-project/fishlog_fe/issues/28) | SUITE 굵기별 파일 네이티브 등록과 중복 weight 제거, 배너/카드/입력/버튼의 작은 화면·큰 글씨 대응 | `check-typography`: 실제 TTF PostScript 이름·번들 목록·Android 별칭 확인; `check-home-data` 및 웹 화면 QA |
| [#29](https://github.com/FishLog-project/fishlog_fe/issues/29) | 비회원 기록 로그인 CTA, 카메라 권한 팝업·사진 선택 대안, 필수 크기 안내 | `check-catch-access`: 권한 상태·iOS 팝업 닫힘 뒤 보관함 열기·중복 이벤트·크기 입력·로그인 이동 검사 |

찜은 성공한 변경을 기존 공유 스팟 캐시에 반영한다. 화면별 덮어쓰기 상태를 제거하고 요청 중에만 낙관적으로 표시한다.
관광 시설은 별도 상세 Modal을 제거해 마커·목록·상세가 같은 조회 결과를 쓴다. 새 의존성을 추가하지 않았다.
별도 담당자가 인증 흐름과 배너·폰트·공통 입력 변경을 교차 리뷰했으며, 확인된 추가 차단 회귀는 없었다.

## 완료한 자동 검증

- [x] 별도 설치 폴더의 `npm ci --no-audit --no-fund` (915 packages), 두 카카오 패치 적용
- [x] 아래 10개 `.cjs` 회귀 검사 전체
- [x] `npx tsc --noEmit`, `npm run lint`, `git diff --check`
- [x] iOS·Android·웹 production export (`/tmp/fishlog-pr24-fix-export`)
- [x] iOS `RNCKakaoMapView.mm` 실제 Kakao SDK 2.10.4·RN 0.86 헤더 대상 컴파일 (오류·경고 0); Fabric 비교 연산자 조건부 누락 수정 후 재검사
- [x] iOS 전체 개발 빌드 (`xcodebuild`, arm64 iOS Simulator Debug): `BUILD SUCCEEDED`; simulator ad-hoc 서명 재빌드·설치·실행도 성공

```sh
npm ci
for script in scripts/check-*.cjs; do node "$script" || exit 1; done
npx tsc --noEmit
npm run lint
git diff --check
npx expo export --platform all --max-workers 2 --output-dir /tmp/fishlog-pr24-fix-export
```

`check-use-section.js`는 브라우저 콘솔용이므로 Node 회귀 검사 목록에 넣지 않는다.

## 개발 빌드로 실행

현재 dev는 `RNCKakaoMap` 네이티브 모듈을 포함하므로 Expo Go로 열 수 없다.
기존 개발 빌드도 이번 폰트·지도 패치를 포함하도록 다시 빌드해야 한다.
지도 QA용 키는 `.env.local`의 `KAKAO_NATIVE_APP_KEY`에 설정한다. 키를 저장소에 커밋하지 않는다.

```sh
npm ci
npx expo run:ios --device
```

Xcode에서는 prebuild로 생성된 `ios/fishlogfe.xcworkspace`를 열고 `fishlogfe` scheme과 iPhone 시뮬레이터를 선택한다.
Android SDK가 있는 환경에서는 `npx expo run:android`로 개발 빌드를 만든다.

## 화면 QA와 한계

- Figma 홈 `634:1177` / 히어로 `778:2648`, 인증 `634:3106`·`634:3140`, 관광 시설 `634:1711`·`634:1576`의 실제 이미지를 확인했다.
- 웹 390px·320px 화면에서 배너 원본 이미지 표시와 텍스트/CTA 배치를 확인했다. 원본 PNG는 손상이 없었고, 작은 폭·큰 글씨에서 고정 높이와 절대 배치로 겹치는 부분을 수정했다. 폭 변경 시 캐러셀 오프셋 문제는 추가 측정에서 재현되지 않았다.
- 웹 320×568에서 글자 크기·줄높이를 200%로 키운 스트레스 검사: 공통 권한 팝업을 끝까지 스크롤해 버튼을 누를 수 있었다. 이 검사는 iOS Dynamic Type/Android 시스템 글자 크기 검증을 대신하지 않는다.
- iPhone 17 Pro의 ad-hoc 서명한 실제 개발 앱 실행 후 권한 안내 팝업에서 기본 `large`와 `accessibility-extra-large` 설정의 SUITE 확대·줄바꿈을 확인했다. 설정은 `large`로 원복·재조회했다. 네이티브 손가락 스크롤/하단 버튼 터치와 홈 배너까지 확인한 것은 아니다.
- 비회원 인증 기록의 로그인 CTA → 로그인 화면 이동을 실제 웹 UI에서 확인했다.
- 웹 390×844 통제 GPS/API: 관광 목록 → 같은 시트 상세 → 목록 복귀 → 펼치기 → 분류 변경 → 닫기 통과. 웹은 카카오 지도 대체 화면이므로 네이티브 마커 표시 성공을 뜻하지 않는다.
- 같은 통제 응답 세션에서 권한 팝업 → 사진 보관함 → 분류 → 크기 미입력 안내/등록 비활성 → 25cm 입력 → 안내 제거/등록 활성 확인. 등록 요청은 보내지 않았다.

화면 증거: [320px 배너](docs/qa/pr24/banner-320.png), [긴 제목](docs/qa/pr24/banner-long-title.png),
[200% 팝업 스크롤](docs/qa/pr24/dialog-200-scroll.png), [관광 목록](docs/qa/pr24/tour-list.png),
[같은 시트 상세](docs/qa/pr24/tour-detail.png), [크기 미입력](docs/qa/pr24/size-required.png),
[크기 입력 후](docs/qa/pr24/size-valid.png), [iOS 기본 글씨](docs/qa/pr24/ios-font-normal.png),
[iOS 접근성 큰 글씨](docs/qa/pr24/ios-font-accessibility.png). 관광명·분류 결과는 통제 응답이며 실제 관광 데이터나 서버 등록 증거가 아니다.

네이티브 카카오 앱 키가 작업 폴더에 없어 인증된 지도 렌더링/실제 핀 터치는 확인하지 못했다.
Android SDK도 이 환경에 없어 Android 네이티브 컴파일·실기기 렌더링은 미검증이다. export는 JS와 에셋 묶음 검사다.
운영 계정 생성·사진 등록·찜 변경 요청을 보내지 않았으며 아래 항목은 QA 계정과 개발 빌드에서 별도 수행한다.

| 남은 기기 QA | 통과 기준 |
| --- | --- |
| iOS·Android 카카오 지도 진입 | 낚시터/관광지/현재 위치 핀 표시, 핀 터치가 해당 상세만 열기, 이동 완료 후 지도 중심으로 관광 재조회 |
| GPS 지연 중 스팟 검색 → 현재 위치 버튼 | 검색 위치를 늦은 GPS가 덮지 않고, 현재 위치 버튼은 같은 좌표에서도 다시 이동 |
| 지도 찜 → 저장 목록 해제 → 지도 상세 재진입 | 동일한 하트 상태와 서버 응답 확인; 실패하면 원래 상태 복구 |
| 카메라 거부/영구 거부 → 사진 선택/허용 | 팝업 대안 제공, iOS 팝업 닫힘 뒤 보관함 한 번 표시, 실제 촬영·업로드 성공 |
| 작은 폰·시스템 큰 글자 | SUITE 렌더링, 배너/OTP/버튼/시설 시트가 겹치지 않고 모든 액션 접근 가능 |
| 실제 어종 등록 | 크기 없는 응답에 입력 안내, 유효한 크기 입력 후 저장·도감·홈 반영 |

---

# 이전 기록: PR #19 · #20 · #21 통합 QA

2026-09-11 기준 로컬 브랜치 `qa/pr19-20-21`.
`origin/dev`의 `eface54` 위에 아래 순서로 병합했다. Figma 최종 수정도 원본 PR 브랜치에서 커밋한 뒤 통합했다. 원격 dev는 변경하지 않았다.

| 순서 | PR | 검증한 커밋 |
| --- | --- | --- |
| 1 | #20 인증 세션·로그인 UI | `3f6531c` |
| 2 | #21 도감·인증·홈 | `e677551` |
| 3 | #19 관광 시설 | `b9a8d55` |

코드 충돌은 없었다. `TODO.md` 충돌은 8번 관광 시설과 9번 인증·도감 기록을 모두 보존해 해결했다.
PR을 dev에 각각 병합할 때도 이 문서 충돌을 같은 방식으로 해결해야 한다.
실제 카카오 지도 SDK가 있는 `feature/kakao-map`은 이 통합본에 포함하지 않았다.

## 실행

의존성은 `npm ci`로 별도 설치했다. 원래 작업 폴더와 node_modules를 공유하지 않는다.
현재 실행 중인 서버가 있으면 그대로 사용하고, 종료한 뒤에는 다음 명령으로 다시 연다.

```sh
cd /Users/parkjaeu/Code/projects/fishlog_fe-qa
npx expo start --lan --port 8140
```

- 같은 Wi-Fi의 휴대폰에서 SDK 57을 지원하는 Expo Go로 터미널 QR을 스캔한다.
- iOS 시뮬레이터는 터미널에서 `i`, Android 에뮬레이터는 `a`로 연다.
- 웹은 http://localhost:8140 에서 열리지만 운영 API가 localhost Origin을 거부하므로 실서버 QA는 휴대폰을 우선한다.
- `USE_FIXTURE=false`, API 주소는 `https://api.fishlog.xyz`다. 실기기에서 등록하면 실제 서버에 저장되므로 QA용 계정을 사용한다.
- Expo Go로 기능을 확인한 뒤, 앱 자체의 권한 문구·설정은 개발 빌드에서 확인한다.

실행 방법: https://docs.expo.dev/get-started/start-developing/

## 통합본에서 완료한 검사

- [x] 아래 6개 검사 스크립트, 타입 검사, 린트, `git diff --check`
- [x] iOS · Android · 웹 export (`/tmp/fishlog-export-final-figma-ready-20260911`)
- [x] 브라우저 통제 응답: 로그인 → 사진 선택·분류 → 크기 입력 → 등록 요청 401 → refresh 1회 → 재요청 성공
- [x] 같은 브라우저 세션에서 도감 획득 수 `1/24`, 홈 진행도 `1/24` 갱신
- [x] 같은 브라우저 세션에서 관광 시설 목록 → 상세 조회 (통제 좌표·응답)

위 브라우저 검사는 실제 앱 코드와 API 어댑터를 실행하되 요청을 가로챘다. 운영 서버에 테스트 계정을 만들거나 사진을 등록하지 않았다.
실제 계정의 저장·복원, 휴대폰 카메라·GPS 성공을 의미하지 않는다.

```sh
node scripts/check-auth-session.cjs
node scripts/check-catch-flow.cjs
node scripts/check-catch-ui.cjs
node scripts/check-dex-data.cjs
node scripts/check-home-data.cjs
node scripts/check-tour-data.cjs
npx tsc --noEmit
npm run lint
git diff --check
npx expo export --platform all --output-dir /tmp/fishlog-qa-export
```

최초 타입 검사 전에 Expo 서버를 한 번 실행해야 무시된 `expo-env.d.ts`와 라우트 타입이 생성된다.
`scripts/check-use-section.js`는 Node용이 아니라 Expo 웹 개발 서버의 브라우저 콘솔용이다.

## 2026-09-11 Figma 최종 대조

기준 파일: https://www.figma.com/design/INwO5bCiYYEvIRkfAL2QEZ?node-id=634-1176

| 화면 | 노드 | 결과 |
| --- | --- | --- |
| 로그인 | `634:2544` | 최신 SVG 로고, 환영 문구, 세로 간격 반영 (#20) |
| 홈 | `634:1177`, `634:1188` | 최신 SVG 로고 반영 (#21) |
| 인증 촬영·분석·후보·결과·완료 | `634:3106`, `634:3124`, `689:2264`, `634:3140`, `634:3158`, `978:2934` | 제공된 MP4를 분석 중 무음 반복 재생, 기타어종 완료 카드 간격 반영 (#21) |
| 도감·기타어종 상세 | `634:1294`, `978:3311` | 기존 그리드·기본 어종 이미지·인증 사진 표시 유지 |
| 관광 시설 필터·상세 | `634:1651`, `634:1711`, `966:2635` | 기존 #19 유지. 아래 API 차이 확인 |

- 웹 390×844·375×667, iPhone 17 Pro에서 로그인 로고·환영 문구 확인.
- 웹에서 영상 재생 시간 증가·무음·반복·컨트롤 숨김, 뒤로가기/분석 완료/실패 시 영상 제거 확인. 정상·직접 입력 등록 완료 화면도 fixture로 확인.
- iOS Expo Go에서 영상의 서로 다른 두 프레임과 분석 후 후보 3종 전환 확인. 카메라 대신 임시 자동 촬영 fixture를 사용했으며 검증 후 자동 촬영 코드·지연·`USE_FIXTURE`를 모두 원복했다.
- `check-catch-ui.cjs`는 첫 프레임 전/재생 실패 시 정지 이미지, 동작 줄이기 설정과 분석 실패에서 영상 미생성을 확인한다. 실제 하드웨어의 카메라·음소거 검증을 대신하지 않는다.
- 영상 길이만큼 API 결과를 지연시키지 않는다. 크기를 제공하지 않는 분류 응답은 기존처럼 직접 입력한다.
- 운영 OpenAPI를 다시 확인했다. `TourSpotResponse`에는 대표 사진·썸네일만 있고 추가 사진, 네이버 플레이스 ID/URL, 카카오 장소 URL이 없다. 따라서 Figma의 사진 3장·정확한 외부 장소 링크는 아직 미반영이다.

## 병합 전 실기기 체크

| 확인 | 수행할 흐름 | 통과 기준 |
| --- | --- | --- |
| [ ] | 비회원 → 도감 | 그림자 24종, 획득 0/24, 잠금 카드 상세 진입 불가 |
| [ ] | 로그인 → 앱 종료 → 다시 실행 | 같은 계정 유지, 다른 계정 기록 노출 없음 |
| [ ] | 카메라/보관함 → 일반 어종 등록 → 도감 → 홈 | 서버 저장 1회, 해당 어종 컬러·횟수·진행도 갱신 |
| [ ] | 후보에 없는 어종 → 직접 입력 → 등록 → 검색·상세 | 기타어종과 사진 표시, 일반 도감 완성도는 증가하지 않음 |
| [ ] | 네트워크 끊기 → 요청 실패 → 연결 복구 → 재시도 | 세션·입력 보존, 성공한 저장을 자동 중복 전송하지 않음 |
| [ ] | 위치 권한 거부 → 허용 → 시설 재조회 | 권한 안내에서 복구, 실제 위치 기준 목록·상세 표시 |
| [ ] | 음식점/관광지/숙박 전환·GPS 재조회 | 이전 목록·상세가 새 결과를 덮지 않음 |
| [ ] | 로그아웃 → 다른 계정 로그인 | 이전 계정의 도감·사진·완료 화면이 남지 않음 |

토큰 만료·동시 요청·느린 응답은 자동 검사와 통제 응답으로 재현한다. 서버 저장 결과는 실기기 QA에서 별도 대조한다.
위 체크가 끝나면 #20 → #21 → #19 순서로 dev에 병합한다. PR 커밋이나 dev가 바뀌면 통합본을 갱신해 다시 검증한다.
카카오 지도 브랜치가 들어오면 지도 화면·패키지·에셋 사전 로딩 변경을 합친 뒤 지도 QA를 한 번 더 수행한다.
