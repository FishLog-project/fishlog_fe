/**
 * 도감 데이터 인터페이스 + fixture 어댑터.
 *
 * 일반 도감과 수기 등록 도감을 합치되 ID와 완성도 집계는 구분한다.
 */

import { Asset } from 'expo-asset';

export type Rarity = 'LOW' | 'USUALLY' | 'HIGH';

export interface DexEntry {
  id: number;
  /** customFishId는 일반 fishId와 겹칠 수 있다. */
  custom?: boolean;
  name: string;
  imageUrl: string | null;
  rarity: Rarity;
  habitat: string | null;
  caught: boolean;
}

export interface MyDex {
  totalCount: number;
  caughtCount: number;
  fishes: readonly DexEntry[];
}

export interface FishDetail {
  id: number;
  name: string;
  description: string;
  habitat: string | null;
  imageUrl: string | null;
  rarity: Rarity;
  /** 서버에 없는 값이라 아는 어종만 채운다 */
  maxSizeCm?: number;
}

export interface RecentCatch {
  catchRecordId: number;
  imageUrl: string;
  /** cm */
  size: number;
  location: string | null;
  /** ISO */
  verifiedAt: string;
}

/** recentCatches는 서버가 최신순 최대 4건으로 잘라 준다 */
export interface CatchRecord {
  habitat: string | null;
  catchCount: number;
  recentCatches: readonly RecentCatch[];
}

export interface CustomCatchRecord extends CatchRecord {
  customFishId: number;
  name: string;
  /** custom/dex의 기본 일러스트. 업로드 사진과 구분한다. */
  imageUrl?: string | null;
  /** 이 사용자의 최대 기록. 어종 자체의 최대 크기와는 다르다. */
  maxSize: number;
}

export interface DexDataSource {
  getMyDex(): Promise<MyDex>;
  getFish(id: number): Promise<FishDetail>;
  getCatchRecord(fishId: number): Promise<CatchRecord>;
  getCustomFish(customFishId: number): Promise<CustomCatchRecord>;
}

/** detail-error는 상세 첫 요청만 실패한다 (재시도 흐름 확인용) */
export type DexFixtureScenario = 'ready' | 'empty' | 'error' | 'detail-error';

/**
 * BE 시드 24종. [이름, 서식지, 희귀도, 설명, 잡은 횟수, 최대 크기(cm)?]
 * 잡은 횟수는 내 기록이라 시드에 없다 — 미획득·1회·여러 회가 다 보이도록 흩어 두었다.
 */
const SEED: readonly (readonly [string, string, Rarity, string, number, number?])[] = [
  ['감성돔', '바다', 'USUALLY', '연안 암초와 방파제 주변에 서식하는 돔류로, 경계심이 강해 찌낚시 인기 대상어다. 가을~봄이 시즌이며 30~50cm급이 흔하다.', 3],
  ['농어', '바다', 'USUALLY', '연안과 하구 기수역을 오가는 대형 육식어로, 미노우 등 루어낚시의 대표 대상이다. 봄~가을에 활발하며 최대 90cm에 이른다.', 1, 90],
  ['돌돔', '바다', 'HIGH', '외해 암초와 갯바위에 서식하는 힘 좋은 고급 어종으로, 단단한 이빨로 조개·성게를 부숴 먹는다. 잡기 까다로운 여름~가을 대상어다.', 0],
  ['벵에돔', '바다', 'USUALLY', '갯바위와 암초대에 무리 지어 사는 잡식성 돔류로, 밑밥을 활용한 찌낚시로 노린다. 여름부터 겨울까지 시즌이 이어진다.', 2],
  ['우럭', '바다', 'LOW', '연안 암초와 인공어초에 붙어 사는 우리나라 대표 선상낚시 어종이다. 초보자도 쉽게 잡을 수 있어 사철 인기가 높다.', 5],
  ['참돔', '바다', 'USUALLY', '중·외해 바닥층에 서식하는 붉은빛의 고급 돔류로, 타이라바 채비로 즐겨 낚는다. 봄과 가을에 40~70cm급이 올라온다.', 1],
  ['광어', '바다', 'LOW', '모래·펄 바닥에 몸을 붙이고 사는 저서성 육식어로, 다운샷·지깅으로 노린다. 겨울 광어가 별미이며 40~80cm급이 흔하다.', 4],
  ['볼락', '바다', 'LOW', '야행성으로 연안 암초대에 무리 지어 사는 소형 어종이다. 겨울~봄에 라이트 루어(볼락 게임)로 즐겨 낚는다.', 2],
  ['갈치', '바다', 'USUALLY', '은백색 띠 모양의 표·중층 회유 육식어로, 여름~가을 선상 배낚시의 인기 대상이다. 큰 것은 1m를 넘는다.', 0, 100],
  ['고등어', '바다', 'LOW', '표층을 떼 지어 회유하는 등푸른 생선으로, 카고낚시나 서비끼로 쉽게 낚인다. 여름~가을에 잘 잡힌다.', 3],
  ['삼치', '바다', 'USUALLY', '빠른 유영 능력을 지닌 대형 회유 육식어로, 가을~초겨울 캐스팅 루어와 트롤링으로 노린다. 50~90cm급이 올라온다.', 0],
  ['방어', '바다', 'USUALLY', '회유성 대형 육식어로, 겨울철 1m가 넘는 대방어가 인기다. 지깅과 생미끼 선상낚시로 노린다.', 0, 100],
  ['전갱이', '바다', 'LOW', '옆줄에 방패비늘이 있는 연안 무리 어종으로, 아징(라이트 루어)의 대표 대상이다. 여름~가을에 잘 잡힌다.', 1],
  ['숭어', '바다', 'LOW', '하구와 연안 기수역에 사는 잡식성 어종으로, 찌낚시·던질낚시로 노린다. 겨울 숭어가 맛으로 유명하다.', 0],
  ['붕어', '저수지', 'LOW', '저수지와 강에 폭넓게 서식하는 잡식성 어종으로, 우리나라 민물낚시의 대표 대상어다. 봄 산란기와 가을이 시즌이다.', 2],
  ['잉어', '강', 'USUALLY', '강과 저수지 바닥에 사는 대형 잉어과 어종으로, 1m 가까이 자라며 힘이 세다. 봄~가을에 릴찌낚시로 노린다.', 0, 100],
  ['쏘가리', '강', 'HIGH', '맑은 강 여울에 사는 육식 게임피시로, 미노우·스푼 루어로 노리는 고급 어종이다. 5/1~6/10 금어기가 있다.', 0],
  ['배스', '저수지', 'LOW', '저수지와 강에 서식하는 외래 육식어로, 웜·크랭크 등 루어낚시의 대표 대상이다. 생태계교란 생물로 방생 금지 지역이 있다.', 6],
  ['블루길', '저수지', 'LOW', '저수지와 강에 흔한 외래 소형 어종으로 초보도 쉽게 낚는다. 생태계교란 생물로 방생이 제한된다.', 1],
  ['가물치', '저수지', 'USUALLY', '수초대에 서식하는 강한 육식어로, 여름철 프로그 루어(탑워터)로 노린다. 폭발적인 입질이 매력이다.', 0],
  ['메기', '강', 'LOW', '강과 저수지 바닥에 사는 야행성 육식어로, 여름 밤낚시에서 잘 잡힌다. 30~60cm급이 흔하다.', 0],
  ['송어', '하천', 'USUALLY', '송어는 양식·유료터에서, 산천어는 찬 계류에서 낚이는 냉수성 어종이다. 겨울 축제 시즌에 플라이·루어로 즐긴다.', 1],
  ['피라미', '하천', 'LOW', '여울과 하천에 매우 흔한 소형 잡어로, 소형 미끼낚시나 플라이로 쉽게 낚인다. 초보 입문용으로 좋다.', 0],
  ['동자개', '강', 'LOW', '강 바닥에 사는 야행성 어종으로, 여름 밤낚시에서 잘 잡힌다. 지느러미 가시에 주의해야 한다.', 0],
];

/** 인증 사진은 사용자가 올린 S3 URL이다. fixture는 번들 에셋 경로로 대신한다 */
const SAMPLE_PHOTO = require('@/assets/images/dex/species-card.png');

const fishes: readonly FishDetail[] = SEED.map(
  ([name, habitat, rarity, description, , maxSizeCm], index) => ({
    id: index + 1,
    name,
    description,
    habitat,
    imageUrl: null,
    rarity,
    maxSizeCm,
  }),
);

let records: ReadonlyMap<number, CatchRecord> | null = null;
const customRecords = new Map<number, CustomCatchRecord>();

/** 수기 등록은 일반 24종의 획득 여부·완성도를 바꾸지 않는다. */
export function recordFixtureCustomCatch(name: string, photo: RecentCatch): CustomCatchRecord {
  const previous = [...customRecords.values()].find((fish) => fish.name === name);
  const customFishId = previous?.customFishId ?? customRecords.size + 1;
  const record: CustomCatchRecord = {
    customFishId,
    name,
    habitat: null,
    catchCount: (previous?.catchCount ?? 0) + 1,
    maxSize: Math.max(previous?.maxSize ?? 0, photo.size),
    recentCatches: [photo, ...(previous?.recentCatches ?? [])].slice(0, 4),
  };
  customRecords.set(customFishId, record);
  return record;
}

// 에셋 URI는 렌더 환경에서만 풀리므로 모듈 로드 때가 아니라 첫 호출 때 만든다
function getRecords() {
  records ??= new Map(
    SEED.map(([, habitat, , , catchCount], index) => [
      index + 1,
      {
        habitat,
        catchCount,
        recentCatches: Array.from({ length: Math.min(catchCount, 4) }, (_, i) => ({
          catchRecordId: (index + 1) * 100 + i,
          imageUrl: Asset.fromModule(SAMPLE_PHOTO).uri,
          size: 20 + i * 3,
          location: i === 0 ? null : '땡땡저수지',
          verifiedAt: `2026-0${8 - i}-1${i}T14:32:10`,
        })),
      },
    ]),
  );
  return records;
}

/** 인증 fixture도 도감과 같은 기록을 갱신한다. */
export function recordFixtureCatch(fishId: number, photo: RecentCatch) {
  const fish = fishes.find((entry) => entry.id === fishId);
  if (!fish) return null;
  const previous = getRecords().get(fishId);
  const catchCount = (previous?.catchCount ?? 0) + 1;
  records = new Map(getRecords()).set(fishId, {
    habitat: fish.habitat,
    catchCount,
    recentCatches: [photo, ...(previous?.recentCatches ?? [])].slice(0, 4),
  });
  return { name: fish.name, firstCatch: catchCount === 1, catchCount };
}

function getEntries(): readonly DexEntry[] {
  const catches = getRecords();
  return fishes.map((fish) => ({
    id: fish.id,
    name: fish.name,
    imageUrl: fish.imageUrl,
    rarity: fish.rarity,
    habitat: fish.habitat,
    caught: (catches.get(fish.id)?.catchCount ?? 0) > 0,
  }));
}

const FIXTURE_DELAY_MS = 250;

function resolveAfter<T>(value: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), FIXTURE_DELAY_MS);
  });
}

function rejectAfter(message: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), FIXTURE_DELAY_MS);
  });
}

export function createFixtureDexDataSource(
  scenario: DexFixtureScenario = 'ready',
): DexDataSource {
  let shouldFailDetail = scenario === 'detail-error';

  return {
    getMyDex() {
      if (scenario === 'error') return rejectAfter('도감 fixture를 불러오지 못했습니다.');
      const list = scenario === 'empty' ? [] : getEntries();
      return resolveAfter({
        totalCount: list.length,
        caughtCount: list.filter((f) => f.caught).length,
        fishes: [
          ...list,
          ...(scenario === 'empty' ? [] : [...customRecords.values()].map((record) => ({
            id: record.customFishId,
            custom: true,
            name: record.name,
            imageUrl: null,
            rarity: 'LOW' as const,
            habitat: record.habitat,
            caught: true,
          }))),
        ],
      });
    },
    getFish(id) {
      if (scenario === 'error' || shouldFailDetail) {
        shouldFailDetail = false;
        return rejectAfter('어종 정보 fixture를 불러오지 못했습니다.');
      }
      const fish = fishes.find((f) => f.id === id);
      return fish ? resolveAfter(fish) : rejectAfter(`어종을 찾지 못했습니다 (id=${id})`);
    },
    getCatchRecord(fishId) {
      if (scenario === 'error') return rejectAfter('인증 기록 fixture를 불러오지 못했습니다.');
      const record = getRecords().get(fishId);
      return resolveAfter(
        record ?? { habitat: '', catchCount: 0, recentCatches: [] },
      );
    },
    getCustomFish(customFishId) {
      const record = customRecords.get(customFishId);
      return record && scenario !== 'error'
        ? resolveAfter(record)
        : rejectAfter('수기 등록한 어종을 찾지 못했습니다.');
    },
  };
}
