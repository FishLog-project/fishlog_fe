/**
 * 도감 데이터 인터페이스 + fixture 어댑터.
 *
 * 홈(`home-data.ts`)과 같은 방식이다. 화면은 DexDataSource만 알고,
 * `GET /api/fish`가 나오면 이 인터페이스의 서버 구현으로 갈아끼운다.
 * fixture 값은 Figma 도감2안(103:173)의 "13/50종"을 따른다.
 */

export interface DexSpecies {
  id: string;
  name: string;
  /** 주요 서식지 — 검색이 어종명과 함께 훑는 대상 ("어종 또는 지역 검색") */
  habitat: string;
  /** 아직 못 잡은 어종. 화면에서 잠금 카드로 그린다 */
  collected: boolean;
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

const species: readonly DexSpecies[] = SPECIES.map(([name, habitat], index) => ({
  id: `species-${index + 1}`,
  name,
  habitat,
  collected: index < COLLECTED_COUNT,
}));

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
