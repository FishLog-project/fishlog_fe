/**
 * 도감 데이터 인터페이스 + fixture 어댑터.
 *
 * 홈(`home-data.ts`)과 같은 방식이다. 화면은 DexDataSource만 알고,
 * `GET /api/collections/dex`가 나오면 이 인터페이스의 서버 구현으로 갈아끼운다.
 * fixture 값은 Figma 도감2안(103:173)의 "13/50종"을 따른다.
 */

export interface DexSpecies {
  /** BE DexEntryResponse.id (Long) */
  id: number;
  name: string;
  /** 주요 서식지 — 검색이 어종명과 함께 훑는 대상 ("어종 또는 지역 검색") */
  habitat: string;
  /** 아직 못 잡은 어종. 화면에서 잠금 카드로 그린다 */
  collected: boolean;
  /** 상세 카드 설명문 */
  description: string;
  /** 내가 이 어종을 잡은 횟수. 미획득이면 0 */
  catchCount: number;
}

/**
 * 도감이 서버에서 받아야 하는 데이터 전부.
 *
 * 완성도(13/50)는 따로 받지 않는다 — 목록에서 세면 되고,
 * 그래야 막대와 숫자가 어긋날 수 없다.
 */
export interface DexDataSource {
  getSpecies(): Promise<readonly DexSpecies[]>;
}

/** fixture 시나리오. empty는 어종 목록 자체가 비어 있는 상태(서버 준비 전) */
export type DexFixtureScenario = 'ready' | 'empty' | 'error';

/** [이름, 서식지] — 앞 13종이 획득 상태다 (Figma "13/50종") */
const SPECIES: readonly (readonly [string, string])[] = [
  ['광어', '서해'],
  ['우럭', '서해'],
  ['참돔', '남해'],
  ['갈치', '남해'],
  ['고등어', '남해'],
  ['전갱이', '남해'],
  ['농어', '서해'],
  ['감성돔', '남해'],
  ['볼락', '동해'],
  ['숭어', '서해'],
  ['도다리', '남해'],
  ['가자미', '동해'],
  ['개복치', '동해'],
  ['방어', '동해'],
  ['부시리', '동해'],
  ['삼치', '남해'],
  ['대구', '동해'],
  ['명태', '동해'],
  ['임연수어', '동해'],
  ['쥐노래미', '서해'],
  ['노래미', '서해'],
  ['성대', '서해'],
  ['민어', '서해'],
  ['조기', '서해'],
  ['병어', '서해'],
  ['준치', '서해'],
  ['밴댕이', '서해'],
  ['전어', '남해'],
  ['멸치', '남해'],
  ['정어리', '남해'],
  ['청어', '동해'],
  ['꽁치', '동해'],
  ['학공치', '남해'],
  ['다랑어', '제주'],
  ['만새기', '제주'],
  ['벵에돔', '제주'],
  ['돌돔', '제주'],
  ['자바리', '제주'],
  ['능성어', '제주'],
  ['쏘가리', '강'],
  ['배스', '강'],
  ['붕어', '강'],
  ['잉어', '강'],
  ['향어', '강'],
  ['메기', '강'],
  ['가물치', '강'],
  ['동자개', '강'],
  ['누치', '강'],
  ['모래무지', '강'],
  ['산천어', '계곡'],
];

/** Figma의 "13/50종" */
const COLLECTED_COUNT = 13;

// 낚시 인증이 등록 결과를 반영하므로 fixture 목록은 바뀔 수 있다 (서버였다면 DB)
let species: readonly DexSpecies[] = SPECIES.map(([name, habitat], index) => {
  const collected = index < COLLECTED_COUNT;

  return {
    id: index + 1,
    name,
    habitat,
    collected,
    // 어종별 실제 설명문은 서버(GET /api/fish/{id})가 준다.
    // fixture는 없는 사실을 지어내지 않도록 이름·서식지만 조합한다.
    description: `${name}는 주로 ${habitat}에서 볼 수 있는 어종이에요. 자세한 설명은 준비 중이에요.`,
    // 잡은 횟수도 서버 값이다. 화면에서 1회/여러 회가 다 보이도록 흩어 둔다.
    catchCount: collected ? (index % 4) + 1 : 0,
  };
});

/** 등록으로 목록이 바뀔 때마다 오른다. 도감 화면이 탭에 돌아올 때 다시 읽을지 판단한다 */
let revision = 0;

export function dexFixtureRevision() {
  return revision;
}

/**
 * 낚시 인증 fixture가 등록(verify) 결과를 여기에 반영한다.
 * 첫 획득이면 잠금이 풀리고, 잡은 횟수가 1 오른다. 없는 어종이면 null.
 */
export function recordFixtureCatch(fishId: number) {
  const found = species.find((s) => s.id === fishId);
  if (!found) return null;

  const updated = { ...found, collected: true, catchCount: found.catchCount + 1 };
  species = species.map((s) => (s.id === fishId ? updated : s));
  revision += 1;

  return {
    name: updated.name,
    firstCatch: !found.collected,
    catchCount: updated.catchCount,
  };
}

/** 실제 네트워크처럼 로딩 상태가 잠깐 보이도록 지연을 준다 */
const FIXTURE_DELAY_MS = 250;

export function createFixtureDexDataSource(
  scenario: DexFixtureScenario = 'ready',
): DexDataSource {
  return {
    getSpecies() {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (scenario === 'error') {
            reject(new Error('도감 fixture를 불러오지 못했습니다.'));
            return;
          }
          resolve(scenario === 'empty' ? [] : species);
        }, FIXTURE_DELAY_MS);
      });
    },
  };
}
