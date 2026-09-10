/**
 * 낚시 스팟 데이터 인터페이스 + fixture 어댑터.
 *
 * 타입은 서버 응답 모양을 그대로 따른다.
 * GET /api/spots · /api/spots/{spotId} · /api/spots/popular
 *
 * ⚠️ 경도 필드 이름이 `lot` 이다 (`lng`·`lon` 아님). 서버 스키마를 그대로 두고,
 *    지도에 넘길 때만 lng 로 바꾼다.
 */

export type SpotCategory = '해양' | '내륙';

/** GET /api/spots — 지도에 마커로 뿌리는 최소 정보. 로그인 필요 */
export interface SpotSummary {
  id: number;
  name: string;
  lat: number;
  lot: number;
  category: SpotCategory;
  isFavorite: boolean;
}

/**
 * 주요 어종 한 마리.
 *
 * ⚠️ Swagger 는 majorFishes 를 string[] 로 기술하지만 실제 응답은 객체 배열이다.
 *    사진(imageUrl)까지 내려주므로 시안의 어종 사진 칸을 그대로 채울 수 있다.
 */
export interface SpotFish {
  fishId: number;
  name: string;
  imageUrl: string | null;
}

/** 해양 스팟에만 있다. 내륙이면 null */
export interface SpotForecast {
  /** 예보 날짜. 실제 응답은 "2026-09-10" 형식이다 (Swagger 예시와 다름) */
  predcYmd: string;
  /** 실제 응답은 "오전"/"오후" 한글 문자열이다 (Swagger 의 코드값 아님) */
  predcNoonSeCd: string;
  /** 낚시 지수 등급 */
  totalIndex: string;
  /** 물때 */
  tdlvHrCn: string;
  /** 파고 (m) */
  minWvhgt: number;
  maxWvhgt: number;
  /** 수온 (℃) */
  minWtem: number;
  maxWtem: number;
  /** 기온 (℃) */
  minArtmp: number;
  maxArtmp: number;
  /** 유속 (cm/s) */
  minCrsp: number;
  maxCrsp: number;
  /** 풍속 (m/s) */
  minWspd: number;
  maxWspd: number;
}

/** 내륙 스팟에만 있다. 해양이면 null. 항목별로도 null 이 올 수 있다 */
export interface InlandDetail {
  /** 하천 폭 (m) */
  riverWidthMin: number | null;
  riverWidthMax: number | null;
  /** 유폭 (m) */
  flowWidthMin: number | null;
  flowWidthMax: number | null;
  /** 수심 (m) */
  depthMin: number | null;
  depthMax: number | null;
}

/** GET /api/spots/{spotId} */
export interface SpotDetail {
  spotId: number;
  name: string;
  lat: number;
  lot: number;
  /** 낚시 금지 구역 여부 */
  prohibit: boolean;
  category: SpotCategory;
  viewCount: number;
  majorFishes: readonly SpotFish[];
  forecast: SpotForecast | null;
  inlandDetail: InlandDetail | null;
}

export interface SpotDataSource {
  getSpots(): Promise<readonly SpotSummary[]>;
  getSpot(spotId: number): Promise<SpotDetail>;
}

export type SpotFixtureScenario = 'ready' | 'empty' | 'error';

/** [이름, 위도, 경도, 분류, 조회수, 주요어종 이름] — 사진은 fixture 에 없어 null 이다 */
const SEED: readonly (readonly [string, number, number, SpotCategory, number, string[]])[] = [
  ['영흥도 방파제', 37.2415, 126.4869, '해양', 1820, ['우럭', '광어', '농어']],
  ['오이도 선착장', 37.3479, 126.6899, '해양', 940, ['숭어', '전갱이']],
  ['대부도 방아머리', 37.2606, 126.5719, '해양', 1310, ['우럭', '망둥어']],
  ['소양호 선착장', 37.9476, 127.8168, '내륙', 760, ['붕어', '잉어', '쏘가리']],
  ['의암호 서면', 37.8724, 127.6875, '내륙', 520, ['배스', '붕어']],
  ['팔당대교 하류', 37.5453, 127.2364, '내륙', 1150, ['잉어', '메기']],
  ['청평호 상류', 37.7392, 127.4266, '내륙', 430, ['배스', '블루길']],
  ['강화도 동막', 37.5842, 126.4361, '해양', 680, ['숭어', '망둥어']],
];

const spots: readonly SpotSummary[] = SEED.map(([name, lat, lot, category], index) => ({
  id: index + 1,
  name,
  lat,
  lot,
  category,
  isFavorite: index % 3 === 0,
}));

function buildDetail(index: number): SpotDetail {
  const [name, lat, lot, category, viewCount, majorFishes] = SEED[index];
  const marine = category === '해양';

  return {
    spotId: index + 1,
    name,
    lat,
    lot,
    prohibit: index === 3,
    category,
    viewCount,
    majorFishes: majorFishes.map((name, fishIndex) => ({
      fishId: fishIndex + 1,
      name,
      imageUrl: null,
    })),
    forecast: marine
      ? {
          predcYmd: '2026-09-09',
          predcNoonSeCd: '오후',
          totalIndex: '보통',
          tdlvHrCn: '5물',
          minWvhgt: 0.3,
          maxWvhgt: 0.8,
          minWtem: 21.4,
          maxWtem: 24.1,
          minArtmp: 19.0,
          maxArtmp: 27.5,
          minCrsp: 12.0,
          maxCrsp: 38.0,
          minWspd: 2.1,
          maxWspd: 5.4,
        }
      : null,
    inlandDetail: marine
      ? null
      : {
          riverWidthMin: 120,
          riverWidthMax: 240,
          flowWidthMin: 80,
          flowWidthMax: 160,
          depthMin: 1.2,
          depthMax: 4.5,
        },
  };
}

/** 화면을 붙이는 동안 서버 없이 흐름을 확인하기 위한 어댑터 */
export function createFixtureSpotDataSource(
  scenario: SpotFixtureScenario = 'ready',
): SpotDataSource {
  const fail = () => Promise.reject(new Error('fixture: spot error'));

  if (scenario === 'error') {
    return { getSpots: fail, getSpot: fail };
  }

  const empty = scenario === 'empty';

  return {
    getSpots: () => Promise.resolve(empty ? [] : spots),
    getSpot: (spotId) => {
      const index = spotId - 1;
      if (index < 0 || index >= SEED.length) return fail();
      return Promise.resolve(buildDetail(index));
    },
  };
}
