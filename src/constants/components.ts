/**
 * 공통 컴포넌트 디자인 토큰 (Common/Button, SearchBar, Map/FAB/Filter).
 * 색상은 colors.ts의 토큰을 조합해서만 만든다.
 */

import { Derived, Palette } from './colors';

export const Components = {
  button: {
    /** Primary 버튼 그라데이션 (default) */
    gradient: Derived.buttonGradient,
    /** disabled 배경 */
    disabled: Palette.line.disabled,
    radius: 12,
    height: 56,
    label: Palette.font.white,
    /**
     * outline 변형 — 로그인 화면의 "로그인 없이 둘러보기" (Figma I634:2561;313:668).
     * 같은 크기·라운드에 채움만 흰 배경 + 남색 테두리로 바뀐다.
     */
    outlineBg: Palette.font.white,
    outlineBorder: Palette.bluegray[400],
    outlineLabel: Palette.bluegray[400],
    outlineWidth: 1,
  },
  /** 낚시 인증 플로우 (Figma UI 634:3106 ~ 634:3158) */
  catch: {
    /** 카메라 미리보기·결과 사진 자리표시 배경 (Figma 634:3122 / 664:3414) */
    previewBg: Derived.neutral,
    /** 셔터 버튼 지름 (Figma 634:3123) */
    shutterSize: 68,
    /** 하단 버튼 사이 간격 (Figma 670 → 734) */
    actionGap: 8,
  },
  searchBar: {
    bg: Palette.bluegray[100],
    radius: 50,
    height: 44,
    /** 검색 전 placeholder */
    placeholder: Palette.bluegray[200],
    /** 검색 중 입력 텍스트 & 아이콘 */
    active: Palette.bluegray[300],
  },
  chip: {
    bgDefault: Palette.font.white,
    bgSelected: Palette.blue[100],
    textDefault: Palette.font.black,
    textSelected: Palette.bluegray[500],
    /** 관광지/음식점 아이콘 — 팔레트에 없는 카테고리 색 */
    food: '#FF6A45',
    /** 화장실/주차장 아이콘 — 팔레트에 없는 카테고리 색 */
    parking: '#00AD76',
    height: 40,
  },
  /** 인증 화면 입력 요소 (로그인 박스형 / 회원가입 언더라인형) */
  authInput: {
    /** 로그인 화면의 박스형 입력 배경 */
    boxBg: Palette.line.regular,
    boxRadius: 12,
    boxHeight: 56,
    /** 입력창 안쪽 텍스트 여백 (화면 여백과는 별개) */
    boxPaddingX: 20,
    /** placeholder 텍스트 */
    placeholder: Palette.font.gray,
    /** 입력 텍스트 */
    text: Palette.font.black,
    /** 언더라인 기본(비활성) */
    underline: Derived.underline,
    /** 언더라인 활성 */
    underlineActive: Palette.blue[200],
    /** clear(X) 버튼 원형 배경 */
    clearBg: Palette.line.disabled,
    /** clear(X) 버튼 지름 (Figma 634:2650) */
    clearSize: 24,
    /**
     * 언더라인형 placeholder. 박스형(#767676)보다 한 단계 연하다.
     * (Figma 634:2586 = font/05_gray_disabled)
     */
    underlinePlaceholder: Palette.font.grayDisabled,
    /** 언더라인 안쪽 좌우 여백 — 언더라인 x28, 텍스트 x32라 4가 남는다 */
    inset: 4,
    /** 입력 한 줄 높이 (Figma leading 32) */
    lineHeight: 32,
    /** 텍스트 아래 ~ 언더라인 사이 간격 (Figma 텍스트 y340, 언더라인 y380) */
    underlineGap: 8,
    /** 언더라인 두께 */
    underlineWidth: 2,
    /** 읽기 전용 필드(인증 화면에서 다시 보여주는 이메일) 테두리 */
    readonlyBorder: Palette.blue[200],
  },
  /**
   * 아이콘 크기.
   * 화면마다 size={20} 같은 숫자를 흩뿌리지 않도록 여기 모은다.
   */
  icon: {
    /** 오류 문구 앞 경고 아이콘 */
    error: 14,
    /** 입력 clear(X) 버튼 안의 X */
    clear: 16,
    /** 박스 필드 우측 아이콘 (인증 화면의 메일 등) */
    fieldTrailing: 20,
    /** 프로필 기본 아바타 안의 사람 글리프 */
    avatar: 72,
  },
  /**
   * 로그인 화면 세로 리듬 (Figma 634:2544).
   *
   * 값은 시안의 y좌표 차이를 그대로 옮긴 것이고, 화면은 이 값을 부모 컨테이너의
   * gap/padding으로만 쓴다 (자식에 marginTop을 붙이지 않는다).
   */
  authLogin: {
    /** safe-area 상단 ~ 로고 (y151 - 상태바 44, 늘린 줄 높이만큼 보정) */
    logoTop: 102,
    /** 로고 ~ 입력 묶음 (y325) */
    formTop: 136,
    /** 입력 사이 */
    fieldGap: 16,
    /** 입력 묶음 ~ 버튼 ~ 링크 (y481, y565) */
    blockGap: 28,
    /** 오류 문구 ~ 버튼 */
    errorGap: 12,
    /** "비밀번호 찾기 | 회원가입" 사이 */
    linksGap: 48,
    /** 링크 사이 세로 구분선 */
    dividerHeight: 14,
  },
  /**
   * 회원가입·비밀번호찾기 스텝 세로 리듬 (Figma 634:2568).
   *
   * typing은 키보드가 올라왔을 때 값이다. 시안의 여백은 키보드가 없는
   * 프레임 기준이라, 그대로 두면 오류 문구까지 화면 밖으로 밀린다.
   */
  authStep: {
    /** 헤더 아래 ~ 안내 문구 (y232) */
    headingTop: 132,
    /** 안내 문구 블록 높이 — 문구가 몇 줄이든 입력은 y340에서 시작한다 */
    headingBlock: 108,
    /** 입력이 2개 이상인 화면에서 키보드가 열렸을 때만 쓰는 완만한 상단 여백 */
    headingTopTyping: 80,
    headingBlockTyping: 80,
    /** 입력 사이 (비밀번호 / 비밀번호 확인, 이메일 / 인증번호) */
    fieldGap: 32,
    /** 하단 고정 영역 안에서 문구·버튼·링크 사이 */
    footerGap: 12,
  },
  /** 확인용 모달 (계정 탈퇴 등) */
  dialog: {
    scrim: Derived.scrim,
    radius: 20,
    /** 모달 안 요소 사이 */
    gap: 16,
    /** 제목 ~ 본문, 버튼 ~ 버튼 */
    tightGap: 8,
  },
  /**
   * ⚠️ 가입 완료 화면 — Figma 시안이 없어 임시로 잡은 값.
   * 시안이 나오면 여기 값을 바꾸고 이 주석을 지운다.
   */
  signupComplete: {
    illustration: { width: 240, height: 300, radius: 150 },
    /** 안내 문구 ~ 일러스트 */
    figureGap: 60,
    /** 일러스트 ~ 오류 문구 */
    messageGap: 16,
  },
  /**
   * 이메일 인증번호 입력 (Figma 634:2674~2679).
   * 6칸이 폭 326 안에서 44 + 간격 13으로 떨어진다.
   */
  otp: {
    length: 6,
    cellHeight: 40,
    gap: 13,
  },
  /** 마이페이지 (Figma 634:3019) */
  profile: {
    avatarSize: 140,
    /** 헤더 아래 ~ 아바타 (y128) */
    avatarTop: 28,
    /** 아바타 ~ 닉네임 (y288) */
    nameGap: 20,
    /** 닉네임 ~ 이메일 (y320) */
    emailGap: 4,
    /** 프로필 묶음 ~ 바로가기 카드 (y376) */
    quickGap: 36,
    /** 섹션 사이 (카드 ~ "기타", "기타" ~ "설정") */
    sectionGap: 28,
    /** 구분 라벨 ~ 첫 항목 */
    listGap: 8,
    /** 바로가기 카드 3개 — 내 도감 / 내 랭킹 / 저장 목록 */
    quickCard: {
      size: 90,
      radius: 12,
      iconSize: 38,
      /** 아이콘 위 여백. 아이콘은 카드 안에서 가로 가운데다 */
      paddingTop: 14,
      /** 아이콘 ~ 라벨 사이 */
      gap: 2,
      label: Palette.blue[300],
      /** 카드 안쪽 은은한 발광 — Figma의 inset shadow */
      innerGlow: Derived.cardInnerGlow,
    },
    /** 설정 목록 한 줄 (Figma 566:1246) */
    listItem: {
      paddingY: 10,
      chevronSize: 20,
    },
  },
  /** 홈 통계 카드 (도감 진행도 / 물고기 인증하기) */
  statCard: {
    height: 140,
    radius: 16,
    padding: 16,
    /** 카드 안쪽 은은한 발광 — Figma의 inset shadow */
    innerGlow: Derived.cardInnerGlow,
  },
  /** 도감 진행바 */
  progress: {
    height: 12,
    radius: 12,
    track: Palette.font.white,
    trackBorder: Derived.progressTrackBorder,
    trackBorderWidth: 1.5,
    fill: Derived.progressGradient,
  },
  /** 추천 스팟 리스트 행 */
  spotRow: {
    bg: Palette.blue[100],
    radius: 43,
    paddingX: 16,
    paddingY: 12,
    /** 행과 행 사이 간격 (리스트가 쓴다). Figma 72:1213/1224/1235 기준 8 */
    rowGap: 8,
    /** 핀·텍스트·화살표 사이 간격 */
    contentGap: 12,
    pinSize: 40,
    chevronSize: 28,
  },
  /**
   * 둥근 프로필 이미지 (Common/Avatar).
   * 크기는 쓰는 쪽이 정하고, 사진이 없을 때의 대체 표시만 여기서 맞춘다.
   */
  avatar: {
    fallbackBg: Palette.bluegray[100],
    fallbackIcon: Palette.line.disabled,
    /** 지름 대비 대체 아이콘 비율 */
    fallbackIconRatio: 0.55,
  },
  /**
   * 두 칸짜리 세그먼트 컨트롤 (Figma Ranking/SegmentControl 323:1020).
   * 트랙 안에서 선택된 칸만 흰 알약으로 떠오른다.
   */
  segment: {
    height: 48,
    radius: 8,
    /** 트랙과 알약 사이 여백 */
    padding: 6,
    track: Palette.bluegray[100],
    thumb: Palette.font.white,
    thumbRadius: 5,
    thumbShadow: Derived.segmentShadow,
    thumbShadowBlur: 4.5,
    labelActive: Palette.font.black,
    labelIdle: Palette.bluegray[200],
  },
  /** 랭킹 화면 (Figma 634:2270 / 634:2305) */
  ranking: {
    /**
     * 세그먼트는 화면 여백(20)에 맞추고 본문은 4만큼 더 안으로 들어간다.
     * 두 값을 따로 두지 않고 섹션 컨테이너에만 이 여백을 준다.
     */
    contentInset: 4,
    /** 세그먼트 ~ 첫 섹션 */
    segmentGap: 20,
    /** 섹션과 섹션 사이 */
    sectionGap: 28,
    /** 섹션 제목 ~ 내용 */
    titleGap: 16,
    /** 순위 행 사이 */
    rowGap: 20,
    /** 순위 뱃지(메달/숫자) 자리 ~ 행 내용 */
    badgeGap: 20,
    badge: {
      width: 30,
      height: 42,
    },
    /**
     * 메달 이미지는 한 장에 두 개가 가로로 붙은 스프라이트다.
     * 슬롯 안에서 한 칸만 보이도록 잘라 쓴다 (Figma 323:794 / 323:785 / 323:787).
     */
    medal: {
      /** 스프라이트 한 장에 든 메달 개수 */
      frames: 2,
      /** 슬롯 안에서 메달이 차지하는 크기 */
      size: 28.5,
      clipHeight: 37.5,
      /** 정사각 스프라이트에서 메달이 아래로 치우쳐 있어 위로 끌어올린다 */
      offsetYRatio: -0.17,
    },
    row: {
      avatarSize: 40,
      /** 프로필 사진 ~ 닉네임 */
      nameGap: 12,
    },
    /** "나의 순위" 카드 */
    myCard: {
      height: 84,
      radius: 16,
      paddingY: 16,
      paddingX: 24,
      /** 순위 숫자 ~ 프로필 묶음 */
      gap: 24,
      avatarSize: 52,
      nameGap: 12,
    },
  },
  /** 홈 화면에서 반복되는 섹션 배치 값 */
  home: {
    heroHeight: 168,
    heroRadius: 16,
    heroPadding: 24,
    labelGap: 2,
    blockGap: 20,
    cardGap: 12,
    sectionTitleGap: 6,
    sectionBottom: 12,
  },
  /** 실제 지도 SDK 연결 전후에 공통으로 유지되는 지도 오버레이 배치 값 */
  map: {
    searchHeight: 60,
    searchTop: 4,
    overlayInset: 20,
    actionGap: 16,
    actionSize: 40,
    actionIconSize: 24,
    markerLabelGap: 2,
  },
  /**
   * 도감 화면 (Figma 도감2안 103:173).
   * 화면 전체가 "수조" 은유다 — 뚜껑(에셋) + 테두리 띠 + 안쪽 물색 배경.
   */
  dex: {
    /** 수조 윗면 테두리 띠 높이 (Figma 186 → 192) */
    rimHeight: 6,
    rim: Derived.tankRim,
    /** 수조 안쪽 물색 */
    water: Palette.blue[100],
    shade: Derived.tankShade,

    /** 완성도 카드 */
    summaryBg: Derived.dexSummary,
    summaryHeight: 73,
    summaryRadius: 12,

    /** 완성도 막대 — 트랙이 진한 남색이고 채움이 밝다 (홈 진행바와 반대) */
    barHeight: 22,
    barRadius: 17,
    barTrack: Palette.bluegray[300],
    /** 트랙 안쪽에서 채움이 물러나는 여백 (Figma 249→252) */
    barInset: 3,
    barFill: Derived.dexBarGradient,
    /** 트랙을 물색 카드에서 떼어 놓는 흰 테두리 */
    barBorder: Palette.line.white,

    /** 어종 카드 */
    cardHeight: 142,
    cardRadius: 10,
    cardBg: Palette.bluegray[100],
    cardShadow: Derived.dexCardShadow,
    /** 카드 안쪽 그림 칸 (정사각). 카드 좌우에서 tileInset만큼 물러난다 */
    tileSize: 88,
    tileInset: 10,
    tileRadius: 4,
    tileBorder: Derived.dexTileBorder,
    tileFill: Derived.dexTileGradient,
    /** 그림 칸 안 어종 일러스트 */
    artWidth: 59,
    artHeight: 55,
    /** 미획득 카드의 그림 칸 배경 (Figma에 없는 상태 — 중립 회색으로 둔다) */
    lockedTile: Palette.line.regular,

    columnGap: 12,
    rowGap: 16,

    /** 어종 상세 카드 (Figma 106:454 — 240x340 기준을 화면 폭에 맞춰 키운다) */
    detail: {
      maxWidth: 300,
      radius: 20,
      padding: 16,
      /** 그림 칸 가로:세로 (Figma 208x120) */
      tileRatio: 208 / 120,
      tileRadius: 8,
      tileBorderWidth: 2,
      tileBorder: Derived.dexDetailTileBorder,
      /** 칩 */
      chipHeight: 24,
      chipRadius: 22,
      habitatChip: Derived.dexHabitatChip,
      catchChip: Derived.dexCatchChip,
      chipText: Palette.bluegray[400],
      /** 인증샷 4칸 */
      photoCount: 4,
      photoGap: 8,
      photoRadius: 4,
      photoBg: Derived.neutral,
      /** 카드를 띄우는 발광 + 뒤를 덮는 막 */
      glow: Derived.dexDetailGlow,
      glowOuter: Derived.dexDetailGlowOuter,
      scrim: Derived.scrim,
    },
  },
  /** 로딩·빈 화면·오류를 표시하는 ScreenState 카드 */
  state: {
    surface: Palette.font.white,
    border: '#E3EAF0',
    /** 빈 화면 심볼 배경 */
    soft: '#E8F7FF',
    error: '#C93B3B',
    /** 오류 심볼 배경 */
    errorSoft: '#FDECEC',
    radius: 20,
  },
} as const;
