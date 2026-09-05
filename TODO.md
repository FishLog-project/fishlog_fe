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

Figma 도감 섹션(75:1968) 우측에 **러프한 목업만** 있고 정식 프레임이 없다.
(어종명 / 그림 / 설명 한 줄 / "주요 서식지" · "잡은 횟수" 칩 / 인증샷 4장 그리드)
카드를 눌러도 아무 일도 일어나지 않는 상태로 뒀다 — 임의로 만들면 어차피 다시 만든다.

디자인 나오면 할 일
- [ ] 어종 카드 → 상세 진입 (모달/스택 중 무엇인지도 디자인에서 확정)
- [ ] 미획득 어종을 눌렀을 때의 화면 (잠금 상태 자체가 디자인에 없다)

또한 **미획득 어종 카드(잠금 상태)에 디자인이 없다**. 현재는 회색 실루엣 + "???"로
기존 회색 토큰만 써서 최소 구성했다 (`src/features/dex/components/species-card.tsx`).

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

### 3-2. 홈 히어로 캐러셀 인디케이터

`assets/images/home/hero-card.png`(Figma `74:1819` 3배 추출)에 **하단 점 5개가 함께 구워져 있다.**
원본이 `feGaussianBlur`로 glow를 만드는데 expo-image의 SVG 렌더러가 filter를 지원하지 않아 래스터로 대체한 결과다.

- [ ] 캐러셀 구현 시 **인디케이터가 빠진 배경 에셋**을 디자이너에게 요청
- [ ] 점 5개를 실제 View로 되살리고 페이지 연동

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
      현재는 숫자에서 폭을 유도하도록 구현했다 (`src/app/(tabs)/home/index.tsx`의 `DEX_PROGRESS`)
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

- [ ] `GET /api/collections` 내 어종 인증 조회
- [ ] `GET /api/collections/dex` 내 도감 조회 → 홈 "도감 진행도" 실데이터 연결
- [ ] `GET /api/fish` 도감 목록 → `DexDataSource` fixture 자리 교체
- [ ] `GET /api/fish/{id}` 어종 상세 → 상세 화면(디자인 대기, 1-3) 붙일 때
- [ ] `GET /api/rankings/completion`, `GET /api/rankings/size` 랭킹 탭
- [ ] `GET /api/spots` 낚시 스팟 → 홈 "추천 낚시 스팟 Top 3" 실데이터 연결
- [ ] `PATCH /api/users/me/nickname`, `PATCH /api/users/me/password` 마이페이지 편집

현재 목데이터 위치
- `src/app/(tabs)/home/index.tsx` — `DEX_PROGRESS`, `SPOTS`
- `src/features/dex/dex-data.ts` — 도감 어종 50종 fixture (`createFixtureDexDataSource`)
- `src/app/(tabs)/ranking` — `PlaceholderScreen` (임시 컴포넌트, 실제 화면 들어오면 삭제)
