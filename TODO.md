# TODO

지금 당장 못 하거나 일부러 미룬 작업 목록. 막힌 이유와 풀렸을 때 할 일을 같이 적는다.

---

## 1. 디자인 대기

### 1-1. 회원가입 유효성 안내·오류 문구 (요청 완료)

현재 회원가입 화면은 **빈 상태와 입력된 상태만** 디자인돼 있고, 입력 규칙 안내나 오류 문구가 들어갈 자리가 없다.
디자인이 나올 때까지 **검증 로직도 현재 상태 그대로 둔다** (기능은 동작하되 서버 규칙과는 일부 어긋난 채).

| 항목 | 서버 규칙 (`/v3/api-docs`) | 현재 앱 동작 | 결과 |
|---|---|---|---|
| 비밀번호 | 8자 이상 **+ 영문·숫자 조합** <br>`^(?=.*[A-Za-z])(?=.*\d).{8,}$` | 8자 이상만 검사 | `12345678`이 통과 → **서버 400** |
| 닉네임 | **2~10자**, 유니크 | 1자부터 통과, `maxLength={20}` | 1자·11자 이상이 통과 → **서버 400** |
| 인증코드 | 6자리 숫자 `\d{6}` | 6자리 숫자 ✅ | 일치 |

해당 위치
- `src/app/auth/signup/password.tsx` — `MIN_LENGTH = 8`만 검사
- `src/app/auth/signup/nickname.tsx` — `trim().length > 0`, `maxLength={20}`
- `src/app/auth/password/reset.tsx` — 같은 비밀번호 규칙을 써야 함 (현재 8자 이상만)

디자인 나오면 할 일
- [ ] 비밀번호 규칙 안내 문구 + 규칙 미충족 오류 상태
- [ ] **비밀번호 확인 입력란** (회원가입에는 아예 없음 — 오타 가입 시 복구 수단이 비밀번호 찾기뿐)
- [ ] 닉네임 글자수 안내 + 길이 위반 / **중복(409)** 오류 상태
- [ ] 이메일 **중복(409)** / 형식 오류 상태
- [ ] 인증번호 **불일치·만료(400)** 오류 상태, 재전송 직후 안내
- [ ] 네트워크 오류 표시 방식, 오류 문구 공통 스타일(위치·색·타이포)
- [ ] "시작하기" 로딩 상태 (실제 가입 요청이 나감)
- [ ] 위 규칙에 맞춰 검증 로직 수정 + `Components`에 오류 문구 토큰 추가

### 1-2. 마이페이지

`src/app/(tabs)/profile/index.tsx`는 **임시 화면**이다. 디자인 근거가 없는 레이아웃이므로 다른 화면의 참고 대상으로 삼지 말 것.
개발 편의를 위해 로그아웃 / 회원탈퇴만 넣어 뒀다.

- [ ] 디자인 확정 후 파일 통째로 교체
- [ ] 회원탈퇴 확인 UI — 지금은 iOS `Alert.prompt`, 안드로이드는 인라인 입력으로 분기해 둠


### 1-3. 도감 어종 상세

최종 Figma의 상세 카드(665:3472), 인증샷 뷰어(1019:2928),
미획득 카드(978:3089)를 반영했다. 획득 카드만 상세를 열고,
미획득 카드는 실루엣 + "???"로 표시한다.

- [x] 기본 24종 + 기타어종 이미지: 서버 `imageUrl` 표시, 미제공·로드 실패만 기본 그림 (`fish-art.tsx`, 인증 후보·도감·홈 공용)
- [ ] 최대 크기: 서버 필드가 없어 값이 제공될 때만 표시

---

## 2. 백엔드 확인 필요

### 2-1. 로그인 응답의 토큰 필드명 ⚠️

Swagger에 `LoginResponse` 스키마가 **정의돼 있지 않다** (`POST /api/auth/login`의 200 응답 `data`가 미문서화).
이메일 인증이 선행돼야 해서 테스트 계정으로 확인도 불가능했다.

현재 `src/features/auth/api.ts`의 `toTokens()`가 `accessToken` / `access_token` / `token` / `jwt`를 모두 받아들이도록 열려 있고,
해석 실패 시 사용자에게 명시적 오류를 띄운다.

- [ ] 백엔드에 실제 필드명 확인 → `toTokens()` 좁히기
- [ ] `refreshToken` 반환 여부 확인 (`POST /api/auth/refresh`는 `refreshToken`을 요구함)
- [ ] 확인되면 Swagger에 응답 스키마 추가 요청

### 2-2. 토큰 만료 처리

`/api/auth/refresh`가 있지만 아직 자동 재발급을 붙이지 않았다.

- [ ] 401 응답 시 refresh 후 원요청 재시도하는 인터셉터 (`src/lib/api/client.ts`)

---

## 3. 에셋 대기

### 3-1. SUITE 폰트 — 로드 완료 ✅, 적용 범위는 남음

- [x] `assets/fonts/`에 SUITE static 5종 추가 (공식 저장소 `sun-typeface/SUITE`, SIL OFL)
- [x] `src/app/_layout.tsx`에서 `useFonts(FontAssets)` 로드, 로드 전 스플래시 유지
- [x] 로드 실패 시 시스템 폰트 폴백 (앱은 뜨도록)

가변(Variable) 폰트는 쓸 수 없다. RN에 `fontVariationSettings`가 없어 `fontWeight`가 `wght` 축을 못 움직이고,
실제로 SUIT Variable로 시도했을 때 안드로이드에서 전부 Thin(100)으로 렌더됐다. 반드시 굵기별 static 파일을 쓸 것.

**남은 일 — 폰트가 아직 전 화면에 적용되지 않았다.**
현재 `fontFamily`를 지정한 곳은 `Typography.header` / `Typography.heading` / `ScreenHeader`의 brand 뿐이고,
나머지 텍스트는 `fontWeight`만 있어 시스템 폰트로 렌더된다.

- [ ] `Typography` 스케일을 Figma 정의대로 확장하고 각 화면 텍스트가 토큰을 참조하도록 정리
      (리뷰어가 지적한 "Typography 항목 1개" 문제와 같은 작업이다. 4번 화면 정합성 작업과 함께 처리하는 게 효율적)

### 3-2. 홈 히어로 캐러셀 인디케이터 — 해결 ✅

점이 구워져 있던 `hero-card.png`는 지웠다. 히어로는 콘텐츠 슬라이드 3종(`hero-carousel.tsx`)이고
글로우는 그라데이션으로 근사, 인디케이터는 View로 그려 페이지와 연동된다.

---

## 4. Figma 정합성 남은 노드

홈(`72:1104`)과 탭바(`72:1576`)는 반영 완료. 비밀번호 찾기는 `314:672` 기준으로만 구현했다.

- [ ] 스플래시 `130:211`
- [ ] 회원가입 이메일 `130:350` `130:377`
- [ ] 회원가입 인증번호 `130:393` `147:1168`
- [ ] 회원가입 비밀번호 `130:409` `130:425`
- [ ] 회원가입 닉네임 `147:1230` `147:1252`
- [ ] 회원가입 완료 `147:1325`
- [ ] 비밀번호 찾기 `318:767` `318:858` `318:886` `318:920` `318:944` `318:975`

확인 필요
- [ ] 비밀번호 찾기 디자인의 좌우 여백이 **28pt**로 보인다 (회원가입·홈은 20pt = `Layout.screenPadding`). 디자이너 확인 후 통일 여부 결정
- [ ] **폰트가 화면마다 다르다.** 디자인에 세 종류가 섞여 있다.

  | 폰트 | 사용처 |
  |---|---|
  | SUITE (Light~ExtraBold) | 홈 화면 전반, 헤더 타이틀 |
  | Pretendard | 비밀번호 찾기 안내문구·placeholder·버튼 라벨 (`314:690`, `314:693`, `147:1131`) |
  | Google Sans | "Fishlog" 로고 (`72:1116`) |

  홈의 Pretendard는 부모 문단에만 걸려 있고 자식이 전부 SUITE로 덮어써서 실제로는 렌더되지 않는 잔재로 보인다.
  하지만 비밀번호 찾기는 자식 override가 없어 진짜 Pretendard다.
  현재 앱은 **전부 SUITE로 통일**해 두었으니, 의도된 혼용인지 확인 후 결정할 것.
  (혼용이 맞다면 Pretendard도 받아서 `Fonts`에 추가해야 한다)

---

## 5. 확인이 필요한 디자인 불일치

- [ ] **홈 도감 진행바** — Figma는 막대를 62.8%(137 중 86) 채워 뒀는데 텍스트는 "34/150종"(23%)이다. 디자인 자체가 안 맞는 상태.
      현재는 API 값(caughtCount/totalCount)에서 폭을 유도한다 (`use-home-view-model.ts`)
- [ ] **탭바 높이** — Figma 52pt를 정확히 따르고 있으나, iPhone은 아래에 홈 인디케이터 34pt가 더 있어 여유로워 보인다.
      안드로이드 제스처 바는 24dp라 10dp 낮게 끝난다. 필요하면 `paddingBottom: Math.max(insets.bottom, 34)` 검토
- [ ] **탭바 그림자** — 디자인엔 없으나 콘텐츠가 스크롤로 지나갈 때 경계가 필요해 `elevation: 8` 유지 중

---

## 6. 저장소 설정

### 6-1. `.gitattributes` 부재 — 줄바꿈 충돌 위험

리포에 `.gitattributes`가 없어서 줄바꿈 처리가 **각자 로컬 설정에 의존**하고 있다.

- 윈도우: `core.autocrlf=true`가 기본 → 체크아웃 시 CRLF, 저장은 LF
- 맥/리눅스: `core.autocrlf=false`가 기본 → LF 그대로

지금은 저장소 안이 LF로 통일돼 있어 겉으로 문제가 없지만, 설정이 다른 사람이 파일을 건드리면
**줄바꿈만 바뀐 수천 줄짜리 diff**가 생길 수 있다. 현재 팀에 맥 사용자가 있어 실제 위험이 있다.

지금 PR에 넣지 않은 이유: 이번 diff가 이미 크고, 줄바꿈 정규화가 섞이면 리뷰가 더 어려워진다.

- [ ] **별도 PR로** 아래 내용의 `.gitattributes` 추가 후 `git add --renormalize .`

  ```
  * text=auto eol=lf

  *.png binary
  *.jpg binary
  *.ttf binary
  *.otf binary
  ```

---

## 7. 미착수 기능

Swagger에 있으나 아직 화면/연동이 없는 API.

- [x] `GET /api/collections?fishId=` 내 어종 인증 조회 → 상세 카드·인증샷 뷰어
- [x] `GET /api/collections/dex` 내 도감 조회 → 홈 "도감 진행도" (`home-api.ts`)
- [x] `GET /api/collections/dex` → 도감 목록·진행도 연결
- [x] `GET /api/fish/{id}` → 어종 상세 카드 연결
- [x] `POST /api/collections/custom`, `GET /api/collections/custom/dex`, `GET /api/collections/custom?customFishId=` → 수기 등록·도감 목록·상세 연결 (검증 경계는 9번)
- [ ] `GET /api/banner/popular-spots` 해양·내륙 각 1곳 → 홈 히어로 추천 스팟 슬라이드 (2026-09-09 배포. 현재는 `/api/spots/popular` 1위만 사용)
- [ ] `GET /api/collections/records` 내 인증 기록 전체 → 기록 목록 화면 (화면 미정)
- [ ] `GET /api/rankings/completion`, `GET /api/rankings/size` 랭킹 탭
- [x] `GET /api/spots/popular` → 홈 "추천 낚시 스팟 Top 3", `GET /api/banner/seasonal-fish` → 히어로 (`home-api.ts`)
- [ ] `PATCH /api/users/me/nickname`, `PATCH /api/users/me/password` 마이페이지 편집

현재 목데이터 위치
- `src/features/home/home-data.ts` — 홈 fixture (`USE_FIXTURE`로 전환)
- `src/features/dex/dex-data.ts` — 도감 fixture (`createFixtureDexDataSource`, 기본 화면은 API 사용)
- `src/app/(tabs)/ranking` — `PlaceholderScreen` (임시 컴포넌트, 실제 화면 들어오면 삭제)

---

## 8. #13 관광 시설 API — 현재 위치 기반 목록·상세 연결

2026-09-06 확인: [BE PR #82](https://github.com/FishLog-project/fishlog_be/pull/82)는 dev에 병합됐다.
`GET /api/tours/nearby`는 공개 API이며 `type=음식점|관광지|숙박`, `lat`, `lng`를 받는다.
`radius` 기본 5km, `page` 기본 1, 페이지당 30건이고 `hasNext`를 반환한다.
2026-09-08 운영 GET은 세 분류 모두 200으로 확인했다.
검증 좌표 `lat=37.4&lng=126.6`의 결과는 음식점 24곳, 관광지 6곳, 숙박 0곳이었다.

- [x] `src/features/map/`에 dev 계약 기반 API·fixture·ViewModel 및 이전 요청 무시 처리 준비
- [x] 대표 이미지와 썸네일을 사진 2장으로 중복 취급하지 않도록 매핑, 누락·잘못된 좌표 폴백
- [x] 지도 → 주변 시설 → 음식점/관광지/숙박 선택 → 현재 위치 `lat`/`lng`를 실제 API에 전달 → 목록·상세 표시
- [x] `expo-location` 권한 문구/config plugin, 위치 거부·실패 안내 및 다시 조회 연결
- [x] 분류·좌표 변경 시 이전 목록·상세 숨김, 로딩·빈 결과·API 오류 재시도, 주소·사진·거리 누락 표시
- [x] 관광공사 사진의 지원되는 HTTPS 주소 사용, 이미지 로드 실패 시 대체 표시
- [x] `node scripts/check-tour-data.cjs`로 실제 어댑터·훅·시설 UI의 쿼리/좌표 검증·요청 전환·상세·재시도 흐름 확인
- [x] 브라우저에서 운영 응답 기반 세 분류·목록·상세, 통제된 API 오류·사진 실패·위치 권한 거부/복구, 새 좌표 재조회 확인
- [x] iOS Expo Go 시뮬레이터에서 실제 API 목록 24곳·상세 사진 렌더링 확인 (시뮬레이션 좌표, 디버거로 컴포넌트 버튼 콜백 실행)
- [ ] 실제 iOS/Android 기기의 위치 권한·터치·GPS 동작 확인 (시뮬레이터/웹 검증과 별도)
- [ ] [#4](https://github.com/FishLog-project/fishlog_fe/issues/4) 지도 SDK 담당 범위: 지도 중심·시설 마커·권한 거부 시 수동 탐색 연결
- [ ] 현재 어댑터는 기본 반경 5km의 첫 30건만 조회한다. #4 조회 흐름 확정 후 `page`/`hasNext`와 지도 영역의 반경 연결

웹에서 운영 API를 직접 호출하면 localhost Origin에 대해 CORS 403이므로 백엔드 허용 Origin 설정이 필요하다.
브라우저 화면 검증만 읽기 전용 중계로 실제 응답을 전달했고, iOS 시뮬레이터는 중계 없이 직접 API를 호출했다.
위치 새로고침은 Expo 웹의 무기한 위치 캐시를 사용하지 않는다.

응답은 `title`, `firstImage`(대표), `firstImage2`(같은 이미지의 썸네일), `addr1`, `addr2`, `mapX`, `mapY`뿐이다.
사진·주소·좌표는 null일 수 있다. 장소 ID, 상세 API, 추가 사진, 네이버 플레이스 ID/URL, 카카오맵 URL은 없다.
Figma의 사진 3장·정확한 외부 장소 상세 링크는 현재 계약으로 채울 수 없어 별도 계약 확인이 필요하다.
시설 UI 기준은 `634:1651`/`634:1711`(필터), `634:1576`(목록), `966:2635`/`1008:2840`(상세)이다.
화면 연결은 로컬 `feat/13-tour-display`에서 구현했으며 dev 병합·PR #17 상태 변경은 하지 않았다.

---

## 9. 인증·도감 QA 후속 수정

2026-09-08 확인: 기타어종·어종 이미지는 [FE PR #16의 후속 항목](https://github.com/FishLog-project/fishlog_fe/pull/16)에 기록되어 있다.
백엔드 [#83](https://github.com/FishLog-project/fishlog_be/issues/83)(기타어종), [#88](https://github.com/FishLog-project/fishlog_be/issues/88)(에셋)는 완료됐다.
등록 후 전부 실루엣인 증상의 별도 FE 버그 이슈는 없고, #3/#5의 일반 완료 조건에만 관련 검증이 있다.

- [x] 일반 도감에서 찾지 못한 어종명은 custom API로 등록. 이름·사진·크기·위치 보존, 중복 저장 방지
- [x] 수기 어종은 기본 그림으로 도감에 표시. 일반 `fishId`와 `customFishId`가 같아도 목록 key·상세 조회 분리
- [x] 수기 어종의 실제 사진·등록 날짜·누적 횟수 조회. 등록 후 상세 실패는 저장 성공 유지, 알 수 없는 횟수는 숨김
- [x] 기본 24종은 서버 `imageUrl`을 인증 후보·도감·홈에서 사용. 미제공·로드 실패 때만 기본 그림으로 대체
- [x] 로딩 중 도감 재조회가 무시되던 공통 훅 수정. 이전 응답·오류가 최신 인증 상태를 덮어쓰지 않음
- [x] 수집 카드의 tint 제거, 미수집 카드의 실루엣 유지. iOS의 같은 마운트 카드에서 잠금→컬러 전환 확인
- [x] 타입·린트·catch/dex/tour 검사·실제 React 갱신 검사·3개 플랫폼 export
- [x] 웹 통제 응답으로 수기 등록→검색→상세·사진, 일반 인증→도감 0/24→1/24→홈 갱신 확인
- [ ] 제보 당시 실계정으로 verify 응답과 같은 세션의 `/dex` `caught` 대조, 실제 서버 저장·실기기 카메라/업로드 검증
- [ ] 새 수정 PR·dev 병합 (현재 로컬 작업만 완료)

수기 어종은 기본 24종과 함께 표시하지만, 백엔드 정책에 따라 일반 도감 완성도·랭킹에는 포함하지 않는다.
2026-09-09 운영 배포 확인: `/api/fish/{id}` 24종과 `/api/banner/seasonal-fish` 모두 `imageUrl`을 내려주고
`https://api.fishlog.xyz/images/fish/*.png`는 인증 없이 200으로 열린다 (512x512 PNG). 앱은 이 주소를 그대로 쓴다.
앱에 남긴 그림은 공용 기본 그림 `assets/images/fish/basic_image.png` 한 장뿐이다.
웹의 등록 요청은 가로채 검증했고 운영 POST·GitHub 이슈 변경은 하지 않았다.
