/**
 * 지도 관광 시설(음식점·관광지·숙박) 데이터 인터페이스 + fixture 어댑터.
 * BE dev PR #82의 DTO(GET /api/tours/nearby). 운영 배포·지도 UI 연결은 TODO #13 참고.
 */

/** 요청·응답의 type 값. BE가 한글 라벨을 그대로 쓴다 */
export const TOUR_CATEGORIES = ['음식점', '관광지', '숙박'] as const;
export type TourCategory = (typeof TOUR_CATEGORIES)[number];

export interface Coords {
  lat: number;
  lng: number;
}

/** 이미지·상세 주소·좌표가 없는 장소는 null이다 */
export interface TourSpot {
  title: string;
  /** 대표 이미지 */
  firstImage: string | null;
  /** 대표 이미지의 썸네일. 별도 사진이 아니다 */
  firstImage2: string | null;
  addr1: string | null;
  addr2: string | null;
  /** 경도 */
  mapX: number | null;
  /** 위도 */
  mapY: number | null;
}

export interface NearbyTours {
  type: TourCategory;
  page: number;
  numOfRows: number;
  totalCount: number;
  hasNext: boolean;
  /** 거리순 */
  items: readonly TourSpot[];
}

export interface NearbyToursQuery extends Coords {
  type: TourCategory;
}

export interface TourDataSource {
  /** 현재 위치 기준 반경(BE 기본 5km) 안의 시설 첫 페이지 */
  getNearbyTours(query: NearbyToursQuery, signal?: AbortSignal): Promise<NearbyTours>;
}

export type TourFixtureScenario = 'ready' | 'empty' | 'error';

/** [이름, 주소, 위도 차, 경도 차] — 현재 위치 주변에 흩어 놓는다 */
const FIXTURE: Record<TourCategory, readonly (readonly [string, string, number, number])[]> = {
  음식점: [
    ['맥도날드 송도점', '인천 연수구 송도과학로 32', 0.004, 0.003],
    ['해운대암소갈비집', '인천 연수구 컨벤시아대로 165', -0.006, 0.002],
    ['송도 횟집', '인천 연수구 인천타워대로 99', 0.002, -0.008],
    ['바다향 칼국수', '인천 연수구 센트럴로 123', -0.011, -0.005],
  ],
  관광지: [
    ['센트럴파크', '인천 연수구 컨벤시아대로 160', 0.007, -0.002],
    ['송도 해변공원', '인천 연수구 송도동 24-1', -0.009, 0.006],
    ['트라이볼', '인천 연수구 인천타워대로 250', 0.003, 0.009],
  ],
  숙박: [
    ['오크우드 프리미어', '인천 연수구 컨벤시아대로 165', 0.005, 0.005],
    ['송도 게스트하우스', '인천 연수구 송도동 30-2', -0.004, -0.004],
  ],
};

const FIXTURE_DELAY_MS = 400;

export function createFixtureTourDataSource(
  scenario: TourFixtureScenario = 'ready',
): TourDataSource {
  return {
    getNearbyTours({ type, lat, lng }, signal) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (signal?.aborted) return reject(new Error('aborted'));
          if (scenario === 'error') return reject(new Error('관광 시설 fixture를 불러오지 못했습니다.'));
          const items =
            scenario === 'empty'
              ? []
              : FIXTURE[type].map(([title, addr1, dLat, dLng]) => ({
                  title,
                  firstImage: null,
                  firstImage2: null,
                  addr1,
                  addr2: null,
                  mapX: lng + dLng,
                  mapY: lat + dLat,
                }));
          resolve({ type, page: 1, numOfRows: 30, totalCount: items.length, hasNext: false, items });
        }, FIXTURE_DELAY_MS);
      });
    },
  };
}
