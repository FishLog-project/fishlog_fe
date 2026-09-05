/**
 * 홈 데이터 인터페이스 + fixture 어댑터.
 * 타입은 BE 응답 DTO를 그대로 따른다 — 서버 구현이 응답을 변환 없이 넘길 수 있게.
 */

/** GET /api/banner/seasonal-fish */
export interface SeasonalFish {
  fishId: number;
  name: string;
  imageUrl: string | null;
}

/** GET /api/spots/popular. 거리는 BE에 없어 FE가 현재 위치로 계산한다 */
export interface PopularSpot {
  id: number;
  name: string;
  lat: number;
  lot: number;
  category: '해양' | '내륙';
  viewCount: number;
  majorFishes: readonly string[];
  distanceMeters?: number;
}

/** GET /api/collections/dex의 집계 필드 (fishes[]는 홈이 쓰지 않는다) */
export interface CollectionProgress {
  totalCount: number;
  caughtCount: number;
}

/** "물고기 인증하기" 카드는 상태와 무관한 정적 진입점이라 여기 없다 */
export interface FishLogDataSource {
  getSeasonalFish(): Promise<readonly SeasonalFish[]>;
  getCollectionProgress(): Promise<CollectionProgress>;
  getPopularSpots(limit: number): Promise<readonly PopularSpot[]>;
}

/** partial-error는 스팟만 1회 실패한다 (오류→재시도 복구 흐름 확인용) */
export type HomeFixtureScenario = 'ready' | 'empty' | 'partial-error';

const seasonalFish: readonly SeasonalFish[] = [
  { fishId: 7, name: '광어', imageUrl: null },
  { fishId: 5, name: '우럭', imageUrl: null },
  { fishId: 6, name: '참돔', imageUrl: null },
];

/** 이름·분류는 Figma 추천 스팟 슬라이드(해양 778:2679 · 내륙 958:2613)의 예시 */
const popularSpots: readonly PopularSpot[] = [
  {
    id: 1,
    name: '인천 영종도 천혜바다낚시터',
    lat: 37.4949,
    lot: 126.4533,
    category: '해양',
    viewCount: 412,
    majorFishes: ['광어', '우럭', '참돔'],
    distanceMeters: 3200,
  },
  {
    id: 2,
    name: '안산 수암저수지 낚시터',
    lat: 37.3399,
    lot: 126.8876,
    category: '내륙',
    viewCount: 287,
    majorFishes: ['붕어', '잉어', '배스'],
    distanceMeters: 8700,
  },
  {
    id: 3,
    name: '통영 미수항',
    lat: 34.8306,
    lot: 128.4153,
    category: '해양',
    viewCount: 173,
    majorFishes: ['갈치', '고등어', '전갱이'],
    distanceMeters: 12400,
  },
];

/** 실제 네트워크처럼 로딩 상태가 잠깐 보이도록 */
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
  let shouldFailPopularSpots = scenario === 'partial-error';

  return {
    getSeasonalFish() {
      return resolveAfter(scenario === 'empty' ? [] : seasonalFish);
    },
    getCollectionProgress() {
      // BE 시드 24종 기준 예시값
      return resolveAfter({
        totalCount: 24,
        caughtCount: scenario === 'empty' ? 0 : 7,
      });
    },
    getPopularSpots(limit) {
      if (shouldFailPopularSpots) {
        shouldFailPopularSpots = false;
        return rejectAfter('추천 낚시 스팟 fixture를 불러오지 못했습니다.');
      }
      const safeLimit = Math.max(0, Math.min(limit, popularSpots.length));
      return resolveAfter(scenario === 'empty' ? [] : popularSpots.slice(0, safeLimit));
    },
  };
}
