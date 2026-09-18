# 스토어 QA 후속 수정 — 2026-09-18

## 9/18 남은 QA 통합

PR #41 (`fix/store-qa-followup` → `dev`)에 #35·#36·#39와 새 #42를 함께 반영한다.
9/17 합의대로 낚시 금지구역 폴리곤은 이번 범위에서 제외한다.
`feature/kakao-map@573aaba`의 APK 용량 최적화도 통합했으며, 기존 아이콘 inset 설정을 유지한다.

| 이슈 | 확인한 원인과 반영 | 검증 |
| --- | --- | --- |
| #39 어종명 `???` | 공개 도감은 만료 토큰에도 익명 `200/caught=false`를 반환한다. 병렬 보호 조회가 토큰을 갱신해도 이미 받은 미획득 결과가 합쳐지는 경로를 수정했다. 보호 조회 완료 후 일반 도감을 조회하고 홈 진행도도 같은 데이터소스를 사용한다. | 실제 API client와 통제 응답으로 획득 13종이 0종으로 바뀌는 이전 코드 실패를 재현. 도감·홈 갱신 성공/실패, 게스트, 계정 전환 검사 통과. 원 APK 제보와 같은 원인인지는 실제 등록 계정에서 확인 필요. |
| #42 인기 스팟 이동 | 숨겨진 탭에서 먼저 소비한 목적지를 복귀 초기화가 지우고, 다시 선택할 때 카메라 nonce도 재사용했다. 하나의 focus callback에서 초기화 후 선택하고 nonce는 계속 증가시킨다. | 설치된 Expo의 실제 `useFocusEffect`로 렌더/이벤트 순서 양쪽, 목록 지연, 반복 선택, 좌표 검증, 오래된 URL 재열림 방지 검사. 브라우저에서 배너·추천행→상세, 가거도 재선택→곡릉천 전환·일반 탭 복귀 통과. |
| #35 시트 닫은 뒤 관광 마커 유지 | 기존 PR #41의 시트 표시/조회 결과 분리를 유지한다. | X·드래그·지도 탭과 함께 Android 뒤로가기 상세→목록→숨김, 마커 재선택, 숨김 후 back 이벤트 해제 검사. |
| #36 관광 마커 표시 후 지도 조작 | 기존 PR #41의 딤 터치 통과, 시트 내부 제스처 범위, Android/iOS terrain 이벤트를 유지한다. | 지도 이동 뒤 시설 응답·시트 렌더가 카메라를 되돌리거나 마커를 재생성하지 않는지 검사. 깨끗한 npm map 2.2.7에 patch 적용 후 17개 파일이 설치본과 일치함을 확인. |

### 이번 검증

- `scripts/check-*.cjs` 11개, TypeScript, ESLint, `git diff --check` 통과.
- iOS·Android·웹 production export 통과. 네이티브 APK/IPA 생성과는 구분한다.
- Android prebuild 후 ARM ABI·minify/shrink·Kakao keep rules 및 아이콘 inset 검사 통과.
- 공개 GET 확인: 인기 스팟 3건 모두 지도 목록 92건에 존재한다.
- 웹 390×844에서 최신 번들을 확인한 뒤 위 이동 흐름을 검증했다. 로컬 8157 포트는 서버 CORS 허용 대상이 아니므로 Playwright에서 **실제 공개 GET 응답을 로컬 QA용으로 전달**했다. 서버 설정·데이터 변경이나 인증된 등록 요청은 하지 않았다.
- [인기 스팟 배너에서 연 가거도 상세](store-followup/popular-spot-web-20260918.png). 웹의 지도 대체 화면이며 실제 Kakao 타일·카메라·손가락 제스처 증거는 아니다.

### 새 앱으로 이어서 확인

1. 출시 환경의 `KAKAO_NATIVE_APP_KEY`와 필요한 `KAKAO_REST_API_KEY`를 적용하고 새 네이티브 앱을 빌드한다. 이 작업 환경에는 `.env/.env.local`과 Android SDK가 없어 실키 지도 및 APK 설치 검증은 하지 않았다.
2. 홈 인기 스팟 선택→카메라/상세 확인→홈 복귀→같은 스팟 및 다른 스팟 재선택.
3. 관광지 조회→지도 드래그/핀치→시트 아래로 숨김→마커 유지·재선택, Android 뒤로가기 확인.
4. 등록 이력이 있는 계정에서 토큰 만료 후 도감에 다시 진입해 획득 이름과 홈 진행도가 유지되는지 확인.

PR 병합·스토어 제출은 별도다. 기존 #28 실행 중 글씨 크기 변경 및 #33 제출 답변/서버 운영 확인의 경계는 아래 9/15 기록과 [제출 안내](../store-review-notes.md)에 남긴다.

---

# 9/15 검증 이력

대상 브랜치: `fix/store-qa-followup` → `dev`. 최신 `feature/kakao-map`의 `f3150a5`와 영상 개선 `865a021`을 포함한다.
`dev`의 `3f5d7c2` 이후 변경을 모았으므로 PR diff에는 기존 PR #30·#31의 패치도 포함된다.

## 이슈별 결과

| 이슈 | 반영 내용 | 검증·경계 |
| --- | --- | --- |
| #33 위치정보 | 조회 좌표의 출처·전송 대상, 실제 기능에 맞는 제출 안내 작성 | [제출 안내](../store-review-notes.md). 서버 로그·Kakao SDK 내부 통신·콘솔 답변 변경은 별도 확인 |
| #34 갤러리 | 촬영 화면에 상시 사진 선택 버튼, 연타 방지, 취소·실패 후 재진입 | 카메라 권한별 분기·iOS 팝업 순서·선택 취소 자동 검사 |
| #35 관광 마커 | 시트 표시와 조회 결과 수명 분리. 숨겨도 마커 유지·재선택 가능 | 숨기기·재열기·필터 해제·응답 교체 검사 |
| #36 지도 조작 | 상세 딤의 터치 통과, 시트 안으로 제스처 범위 제한. iOS·Android terrain 탭 연결 | 지도 상태 검사, 실제 SDK 헤더/AAR 계약 확인. 실키 지도 제스처 실행은 별도 |
| #37 태블릿 / #28 폰트·배너 | 본문 최대 800pt, 지도·촬영 전체 폭, 도감 열 수·그림 비율·진행률 높이·배너 큰 글씨 대응, iPad 세로·가로 지원 | 단일 열 RN invariant, 그림 최대 높이, 진행률 15/54/100%와 글씨 배율 1/3.12 경계 검사 |
| #38 Android 아이콘 | 원화 유지, 전경·단색 아이콘에 네이티브 14.25% inset | 실제 prebuild XML·멱등성·원화의 모든 유효 픽셀이 66/108 중앙 안전 원 안에 들어가는지 검사. Android 설치 QA는 미실행 |
| #39 이름 `???` | 등록 후 도감 focus 재조회·계정 전환 검사 보강 | 현재 제보 조건 미재현. 아래 조사 결과 참고 |
| #40 분석 영상 | 1080×1920 H.264 영상과 최소 노출 시간 패치 통합 | 3개 플랫폼 export, 영상 전체 디코딩·파일 해시 일치 |

## 어종명 조사 결과

- `???`를 생성하는 곳은 도감의 미획득 분기다. `caught=true`면 응답의 `name`을 표시한다.
- 후보의 `name` → 선택한 물고기 이름 → 인증 응답의 `fishName` → 완료 상세 이름을 추적했고 공개 API 문서의 필드명과 일치한다.
- 공유된 검증 계정으로 로그인 1회와 일반·수기 도감 GET만 실행했다. 일반 도감 24건 중 획득 0건, 수기 도감 0건이었다. 이름·획득 여부 타입 및 집계에는 불일치가 없었다.
- 실제 등록 이력이 없어 ‘등록 후에도 이름이 잠김’ 조건은 재현하지 못했다. 서버 데이터 생성·수정은 하지 않았다.
- 통제 검사에서는 도감의 실제 focus callback을 거쳐 `caught=false` → `true` 후 이름 표시, 로그아웃 중 늦은 응답 차단, 재로그인 후 이름 복구를 확인했다.
- #39는 재현 자료가 필요한 상태로 남긴다. 미획득 어종 이름을 모두 공개하는 정책 변경은 하지 않았다.

## 자동 검증

- 새 작업 폴더에서 `npm ci --no-audit --no-fund`: 915 packages, Kakao core/map 2.2.7 패치 적용 성공.
- 최종 지도 패치는 깨끗한 npm 패키지 `@react-native-kakao/map@2.2.7`에 적용·역적용 검사까지 별도로 성공.
- `scripts/check-*.cjs` 11개, `npx tsc --noEmit`, `npm run lint`, `git diff --check`.
- `expo prebuild --platform android --no-install` 후 일반·round·monochrome 리소스 확인.
- `expo export --platform all --max-workers 2`: iOS·Android·웹 번들 및 29개 정적 경로 생성.
- MP4 1080×1920, 24fps, 5.166667초, 4,486,881 bytes. `ffmpeg -v error -i … -f null -` 성공.
- 영상 SHA-256: `1cb1fb989979abb625950811de882ec7ec6c2e83e2f82b7a65bb633ab007c4f7`. export 에셋과 원본 해시 일치.

`check-use-section.js`는 브라우저 콘솔용이므로 Node 검사에서 제외한다.

## 실제 화면·네이티브 검증

- 웹 375×667, 768×1024, 1024×768에서 홈 3개 배너·로그인·도감·지도 본문 폭 확인. 지도는 웹 대체 화면이며 실제 Kakao 지도 검증과 구분한다.
- 웹 320px에서 CSS로 글씨를 200% 키워 배너를 검사했다. 네이티브 `fontScale` 검증은 아래 iPad 결과다.
- 웹 사진 선택 → 통제된 분석 응답 → 후보 → 크기 입력까지 확인. 후보·결과 CTA가 1024px 화면에서 984px → 760px로 줄고 중앙에 배치됨을 확인. 작은 폰에서는 스크롤해 등록·재촬영에 접근 가능.
- 새 iOS arm64 Simulator Debug 전체 빌드 성공. 첫 패키징은 디스크 부족으로 실패했으며 공간 확보 후 동일 명령의 증분 빌드가 성공했다. ad-hoc 서명, `codesign --verify --deep --strict`, `UIDeviceFamily=[1,2]`, Metro 8155 및 iPad 4방향 설정 확인. 의존성 경고 26건, 수정한 지도 소스 경고 0건.
- iPad (A16), iOS 26.5, 820×1180 및 1180×820: 앱 설치·실행, 세로·가로 전환, 게스트 진입, 홈·도감·인증 후보·결과 배치 확인.
- iPad에서 상시 갤러리 버튼 → 시스템 사진 선택기 → 취소 → 재열기 → 테스트 사진 선택 → 분석 → 후보 → 결과까지 확인. 실서버 등록은 실행하지 않았다.
- iPad의 `accessibility-extra-large`(fontScale 3.12) 설정 후 앱을 새로 실행해 홈 CTA, 도감 2열·정사각 그림·진행률 숫자 전체 표시를 확인했다. 기본 글씨 크기도 확인했다.
- 네이티브 QA에는 기존 fixture를 임시 사용했다. 종료 후 `USE_FIXTURE=false`, 시뮬레이터 글씨 설정 `large`로 복원하고 검증 기기를 종료했다.

대표 화면: [웹 태블릿 홈](store-followup/home-final-1024x768.png), [웹 큰 글씨 배너](store-followup/home-320-css-text200-slide1.png), [웹 태블릿 후보](store-followup/catch-candidates-1024x768.png), [iPad 인증 결과](store-followup/ipad-catch-result.png), [iPad 큰 글씨 홈](store-followup/ipad-home-large-text.png), [iPad 큰 글씨 도감](store-followup/ipad-dex-large-text.png).

## 출시 시 이어서 확인할 항목

- #28: iOS에서 앱 실행 중 시스템 글씨 크기를 바꾼 직후 일부 Text 프레임이 갱신되지 않아 글자가 잘리는 현상이 관찰됐다. 같은 글씨 설정으로 앱을 완전히 종료·재실행하면 정상이며, 실행 중 변경 경로는 별도 조사 대상으로 남긴다.
- 이 환경에는 Kakao 앱 키가 없어 실제 타일·마커를 띄운 상태의 네이티브 드래그 검증은 남아 있다. `.env.local`의 `KAKAO_NATIVE_APP_KEY`와 필요한 `KAKAO_REST_API_KEY`를 출시 빌드 환경에 주입해야 한다.
- Android SDK·에뮬레이터가 없어 APK/AAB 빌드·설치와 런처 실측은 하지 못했다. Android prebuild/번들/아이콘 안전 영역 검사를 APK 설치 완료로 해석하지 않는다.
- 기존 APK는 이번 변경을 포함하지 않는다. 네이티브 지도·폰트·아이콘·권한 설정이 들어가므로 새 앱 빌드로 배포해야 한다.
- 현재 구현은 조회 좌표를 서버로 보낸다. 스토어 제출 답변의 ‘미전송’ 정정과 서버·SDK 운영 범위 확인은 [제출 안내](../store-review-notes.md)에 따라 진행한다.

## 재현 명령

```sh
npm ci
for script in scripts/check-*.cjs; do node "$script" || exit 1; done
npx tsc --noEmit
npm run lint
git diff --check
npx expo prebuild --platform android --no-install
node scripts/check-android-icon.cjs
npx expo export --platform all --max-workers 2 --output-dir /tmp/fishlog-store-qa-export
```

Expo가 생성하는 타입이 없는 새 체크아웃에서는 먼저 Expo를 시작해 `expo-env.d.ts`와 라우트 타입을 생성한다.
