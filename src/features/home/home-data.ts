/**
 * 홈 화면 데이터 인터페이스 + fixture 어댑터.
 *
 * 화면은 FishLogDataSource 인터페이스만 알고, 홈 API가 나오면
 * 이 인터페이스의 서버 구현으로 갈아끼운다 (화면 코드는 그대로).
 * fixture 값은 Figma 홈(72:1104)의 문구·수치를 따른다.
 */

export interface FishSpecies {
  id: string;
  name: string;
  /** 히어로 타이틀 — "광어 잡기 좋은 날!" */
  seasonalHeadline: string;
}

export interface FishingSpot {
  id: string;
  name: string;
  distanceMeters: number;
  /** 잡히는 어종 — 디자인의 "광어, 멸치, 개복치" 줄 */
  species: readonly string[];
}

export interface CollectionProgress {
  collectedSpeciesCount: number;
  totalSpeciesCount: number;
}

/**
 * 홈이 서버에서 받아야 하는 데이터 전부.
 *
 * "물고기 인증하기" 카드는 여기 없다 — 내용이 상태와 무관하게 항상 같은
 * 정적 진입점이라 데이터 섹션이 아니다.
 */
export interface FishLogDataSource {
  getFeaturedSpecies(): Promise<FishSpecies | null>;
  getCollectionProgress(): Promise<CollectionProgress>;
  getRecommendedSpots(limit: number): Promise<readonly FishingSpot[]>;
}

/**
 * fixture 시나리오.
 * - ready: 정상 데이터
 * - empty: 추천 어종 없음 · 도감 0종 · 스팟 없음
 * - partial-error: 스팟 요청만 1회 실패 (재시도하면 성공 — 오류→복구 흐름 확인용)
 */
export type HomeFixtureScenario = 'ready' | 'empty' | 'partial-error';

const featuredSpecies: FishSpecies = {
  id: 'species-flatfish',
  name: '광어',
  seasonalHeadline: '광어 잡기 좋은 날!',
};

const recommendedSpots: readonly FishingSpot[] = [
  {
    id: 'spot-gimnyeong',
    name: '제주 김녕항',
    distanceMeters: 3200,
    species: ['광어', '멸치', '개복치'],
  },
  {
    id: 'spot-dadaepo',
    name: '부산 다대포',
    distanceMeters: 8700,
    species: ['우럭', '참돔'],
  },
  {
    id: 'spot-misu',
    name: '통영 미수항',
    distanceMeters: 12400,
    species: ['갈치', '고등어', '전갱이'],
  },
];

/** 실제 네트워크처럼 로딩 상태가 잠깐 보이도록 지연을 준다 */
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

export function createFixtureFishLogDataSource(
  scenario: HomeFixtureScenario = 'ready',
): FishLogDataSource {
  let shouldFailRecommendedSpots = scenario === 'partial-error';

  return {
    getFeaturedSpecies() {
      return resolveAfter(scenario === 'empty' ? null : featuredSpecies);
    },
    getCollectionProgress() {
      // Figma 홈의 "34/150종"
      return resolveAfter({
        collectedSpeciesCount: scenario === 'empty' ? 0 : 34,
        totalSpeciesCount: 150,
      });
    },
    getRecommendedSpots(limit) {
      if (shouldFailRecommendedSpots) {
        shouldFailRecommendedSpots = false;
        return rejectAfter('추천 낚시 스팟 fixture를 불러오지 못했습니다.');
      }
      const safeLimit = Math.max(0, Math.min(limit, recommendedSpots.length));
      return resolveAfter(
        scenario === 'empty' ? [] : recommendedSpots.slice(0, safeLimit),
      );
    },
  };
}
