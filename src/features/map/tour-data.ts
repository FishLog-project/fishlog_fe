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

/** 관광지 집중률 기반 당일 혼잡도 등급 */
export const CONGESTION_LEVELS = ['여유', '보통', '혼잡'] as const;
export type CongestionLevel = (typeof CONGESTION_LEVELS)[number];

/**
 * 당일 예상 혼잡도 (한국관광공사 관광지 집중률).
 *
 * rate 는 0~100 지수이지 퍼센트가 아니다 — 화면에 %로 보여 주면 안 된다.
 * 관광지 이름이 두 데이터셋에서 달라(서울 롯데월드 / 잠실 롯데월드) 서버가 이름이
 * 일치하는 곳만 채운다. 관광지 중 절반 정도만 값이 있다.
 */
export interface TourCongestion {
  rate: number;
  level: CongestionLevel;
  /** 예측 기준일 "YYYY-MM-DD" (조회 당일) */
  baseDate: string;
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
  /**
   * 당일 혼잡도. 숙박·음식점, 집중률 자료에 없는 장소, 자료가 없는 지역(전남),
   * 집중률 API 장애 때는 null 이다. 이 경우 화면은 혼잡도를 숨긴다.
   */
  congestion?: TourCongestion | null;
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

/** 관광지 fixture 의 혼잡도. 서버처럼 일부 장소는 비워 둔다 */
const FIXTURE_CONGESTION: Readonly<Record<string, Omit<TourCongestion, 'baseDate'>>> = {
  센트럴파크: { rate: 72.4, level: '혼잡' },
  '송도 해변공원': { rate: 39.6, level: '여유' },
};

function fixtureToday(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

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
                  congestion: FIXTURE_CONGESTION[title]
                    ? { ...FIXTURE_CONGESTION[title], baseDate: fixtureToday() }
                    : null,
                }));
          resolve({ type, page: 1, numOfRows: 30, totalCount: items.length, hasNext: false, items });
        }, FIXTURE_DELAY_MS);
      });
    },
  };
}
