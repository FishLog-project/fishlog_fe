import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  InlandDetail,
  SpotCategory,
  SpotDataSource,
  SpotDetail,
  SpotFish,
  SpotForecast,
  SpotSummary,
} from '@/features/map/spot-data';
import { lookupAddress } from '@/features/map/kakao-address';
import { useSection } from '@/lib/use-section';

/** 지도에 찍는 마커 한 개. 서버의 `lot` 을 지도가 쓰는 `lng` 로 바꿔 둔다 */
export interface SpotMarkerViewModel {
  id: number;
  name: string;
  lat: number;
  lng: number;
  category: SpotCategory;
  isFavorite: boolean;
}

export interface SpotLabelValue {
  label: string;
  value: string;
}

/** 낚시 지수 카드 (Figma 634:1537 · 1125:2937) */
export interface FishingIndexViewModel {
  /** "낚시지수 나쁨" */
  label: string;
  /** 등급 점·글자 색 */
  color: string;
  /** 등급별 안내 문구 */
  description: string;
}

/** 물때 배지 (Figma 1176:3063) */
export interface TideViewModel {
  name: string;
  /** "(조류의 흐름 약함)". 모르는 물때면 빈 문자열 */
  description: string;
}

export interface SpotDetailViewModel {
  id: number;
  name: string;
  /**
   * 시안(634:1537)의 "서울 00시 00구 000" 자리.
   * ⚠️ GET /api/spots/{spotId} 응답에 주소 필드가 없어 항상 null 이다.
   */
  addressLabel: string | null;
  categoryLabel: string;
  /** 낚시 금지 구역이면 화면이 경고를 띄운다 */
  prohibited: boolean;
  viewCountLabel: string;
  /** 시안은 4칸까지 보여준다. 서버가 사진 URL 도 준다 */
  majorFishes: readonly SpotFish[];
  /** "9월 10일 목요일". 예보가 없으면 null */
  forecastDateLabel: string | null;
  /** "오전" / "오후" — 서버가 현재 시각 기준 1건만 주므로 표시 전용 배지다 */
  noonLabel: string | null;
  /** 해양 스팟만 */
  fishingIndex: FishingIndexViewModel | null;
  tide: TideViewModel | null;
  /** 해양 환경 5행 (파고·풍속·수온·유속·기온). 내륙이면 null */
  marineRows: readonly SpotLabelValue[] | null;
  /** 담수 환경 6행. 조사에서 빠진 항목은 행 자체를 만들지 않는다 */
  inlandRows: readonly SpotLabelValue[] | null;
}

function loadSpots(dataSource: SpotDataSource) {
  return dataSource.getSpots();
}

function toMarkers(spots: readonly SpotSummary[]): readonly SpotMarkerViewModel[] | null {
  if (spots.length === 0) return null;

  return spots.map((spot) => ({
    id: spot.id,
    name: spot.name,
    lat: spot.lat,
    lng: spot.lot,
    category: spot.category,
    isFavorite: spot.isFavorite,
  }));
}

/**
 * 지도에 뿌릴 스팟 목록.
 *
 * 검색은 이미 받아 둔 목록을 걸러 내기만 한다 (서버 왕복 없음).
 * 서버가 전체 목록(92건)을 한 번에 주는 계약이라 클라이언트 필터로 충분하다.
 *
 * `markers`는 검색이 걸린 결과라 지도에 뿌릴 용도다. 선택한 스팟을 다시 찾을 때는
 * 검색어에 따라 사라지지 않도록 `allSpots`를 봐야 한다.
 */
export function useSpotsViewModel(dataSource: SpotDataSource) {
  const [state, retry] = useSection(dataSource, loadSpots, toMarkers);
  const [query, setQuery] = useState('');

  const trimmedQuery = query.trim();
  const allSpots = state.status === 'ready' ? state.data : null;

  const markers = useMemo(() => {
    if (allSpots === null) return null;
    if (trimmedQuery === '') return allSpots;

    return allSpots.filter((spot) => spot.name.includes(trimmedQuery));
  }, [allSpots, trimmedQuery]);

  return { state, markers, allSpots, query, setQuery, retry };
}

/**
 * 저장 목록 — 찜한 낚시터만 (Figma 826:2288).
 *
 * ⚠️ 찜 목록 전용 엔드포인트가 없다 (전체 31개 중 찜은 POST/DELETE 뿐).
 *    GET /api/spots 가 로그인 토큰을 받으면 isFavorite 을 채워 주므로 그걸 걸러 쓴다.
 */
function toSavedSpots(spots: readonly SpotSummary[]): readonly SpotMarkerViewModel[] | null {
  const saved = spots.filter((spot) => spot.isFavorite);
  return saved.length === 0 ? null : (toMarkers(saved) ?? null);
}

export function useSavedSpotsViewModel(dataSource: SpotDataSource) {
  return useSection(dataSource, loadSpots, toSavedSpots);
}

/**
 * 저장 목록 한 줄에 채워 넣을 나머지 정보.
 *
 * 목록 응답에는 이름·좌표·분류뿐이라 시안(837:2502)의 주소와 어종 태그를 따로 구한다.
 * - 주소: 좌표를 카카오 Local API 로 변환한다 (바다 위면 결과가 없어 null 이다)
 * - 어종: 스팟 상세의 majorFishes 를 쓴다
 *
 * ⚠️ 상세 조회는 viewCount 를 올린다 (사용자/IP 별 1일 1회). 저장 목록을 열면
 *    찜한 스팟들의 조회수가 함께 오른다는 뜻이라, 찜 목록 전용 엔드포인트가
 *    생기면 이 호출은 걷어내는 편이 좋다.
 *
 * 둘 다 실패해도 행은 그대로 그린다 — 목록 자체가 막히면 안 된다.
 */
export function useSavedSpotExtras(dataSource: SpotDataSource, spot: SpotMarkerViewModel) {
  const [address, setAddress] = useState<string | null>(null);
  const [fishes, setFishes] = useState<readonly SpotFish[]>([]);

  useEffect(() => {
    let alive = true;

    lookupAddress(spot.lat, spot.lng)
      .then((value) => {
        if (alive) setAddress(value);
      })
      .catch(() => undefined);

    dataSource
      .getSpot(spot.id)
      .then((detail) => {
        if (alive) setFishes(detail.majorFishes);
      })
      .catch(() => undefined);

    return () => {
      alive = false;
    };
  }, [dataSource, spot.id, spot.lat, spot.lng]);

  return { address, fishes };
}

interface DetailSource {
  dataSource: SpotDataSource;
  spotId: number;
}

function loadDetail({ dataSource, spotId }: DetailSource) {
  return dataSource.getSpot(spotId);
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

/**
 * "2026-09-10" → "9월 10일 목요일".
 *
 * 실제 응답은 하이픈이 있는 형식이지만 Swagger 예시는 YYYYMMDD 라 둘 다 받는다.
 * 형식이 어긋나면 null 이고, 화면은 그 줄을 그리지 않는다.
 */
function toDateLabel(predcYmd: string): string | null {
  const matched = /^(\d{4})-?(\d{2})-?(\d{2})$/.exec(predcYmd);
  if (!matched) return null;

  const [, year, month, day] = matched;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (Number.isNaN(date.getTime())) return null;

  return `${Number(month)}월 ${Number(day)}일 ${WEEKDAYS[date.getDay()]}요일`;
}

/**
 * 낚시 지수 등급별 색과 안내 문구.
 *
 * ⚠️ 안내 문구는 서버 계약에 없어 등급별로 직접 쓴 카피다 (시안 1176:3105 문구 기준).
 * ⚠️ 시안은 등급 글자가 세로 그라데이션이지만, 마스킹 라이브러리가 package.json 에
 *    선언돼 있지 않아 그라데이션 중간값 단색으로 대신한다.
 */
const FISHING_INDEX: Readonly<Record<string, { color: string; description: string }>> = {
  좋음: {
    color: '#0E9F6E',
    description: '파고와 바람이 잔잔해\n나서기 좋은 날입니다.',
  },
  보통: {
    color: '#0079CA',
    description: '물때와 바람을\n한 번 더 확인하세요.',
  },
  나쁨: {
    color: '#FF4312',
    description: '파고와 바람이 높아\n주의가 필요합니다.',
  },
  위험: {
    color: '#C93B3B',
    description: '기상이 거칠어\n출조를 미루세요.',
  },
};

function toFishingIndex(totalIndex: string): FishingIndexViewModel | null {
  const matched = FISHING_INDEX[totalIndex];
  if (!matched) return null;

  return { label: `낚시지수 ${totalIndex}`, ...matched };
}

/** 물때 이름에 붙는 조류 세기 설명. 모르는 이름이면 배지에 이름만 남는다 */
const TIDE_DESCRIPTION: Readonly<Record<string, string>> = {
  대조기: '(조류의 흐름 강함)',
  중조기: '(조류의 흐름 보통)',
  소조기: '(조류의 흐름 약함)',
};

function toTide(tdlvHrCn: string): TideViewModel | null {
  if (tdlvHrCn.trim() === '') return null;
  return { name: tdlvHrCn, description: TIDE_DESCRIPTION[tdlvHrCn] ?? '' };
}

/** "0.3~0.8m". 두 값이 같으면 한쪽만 쓴다 (시안이 파고·수온·기온을 단일값으로 보여준다) */
function range(min: number, max: number, unit: string): string {
  return min === max ? `${min}${unit}` : `${min}~${max}${unit}`;
}

/** 시안 1171:3035 순서 — 파고 · 풍속 · 수온 · 유속 · 기온 */
function toMarineRows(forecast: SpotForecast): readonly SpotLabelValue[] {
  return [
    { label: '파고', value: range(forecast.minWvhgt, forecast.maxWvhgt, 'm') },
    { label: '풍속', value: range(forecast.minWspd, forecast.maxWspd, 'm/s') },
    { label: '수온', value: range(forecast.minWtem, forecast.maxWtem, '℃') },
    { label: '유속', value: range(forecast.minCrsp, forecast.maxCrsp, 'm/s') },
    { label: '기온', value: range(forecast.minArtmp, forecast.maxArtmp, '℃') },
  ];
}

/**
 * 시안 1176:3214 순서 — 하폭 최대/최소 · 유수폭 최대/최소 · 수심 최대/최소.
 *
 * 국립생태원 조사에서 빠진 항목은 개별 null 이라(하폭만 있는 스팟이 있다)
 * 값이 없는 행은 만들지 않는다.
 */
function toInlandRows(inland: InlandDetail): readonly SpotLabelValue[] | null {
  const rows: readonly (readonly [string, number | null])[] = [
    ['하폭 최대', inland.riverWidthMax],
    ['하폭 최소', inland.riverWidthMin],
    ['유수폭 최대', inland.flowWidthMax],
    ['유수폭 최소', inland.flowWidthMin],
    ['수심 최대', inland.depthMax],
    ['수심 최소', inland.depthMin],
  ];

  const filled = rows
    .filter((row): row is readonly [string, number] => row[1] !== null)
    .map(([label, value]) => ({ label, value: `${value}m` }));

  return filled.length === 0 ? null : filled;
}

export function toSpotDetailViewModel(detail: SpotDetail): SpotDetailViewModel {
  const { forecast } = detail;

  return {
    id: detail.spotId,
    name: detail.name,
    addressLabel: null,
    categoryLabel: detail.category,
    prohibited: detail.prohibit,
    viewCountLabel: `조회 ${detail.viewCount.toLocaleString('ko-KR')}회`,
    majorFishes: detail.majorFishes,
    forecastDateLabel: forecast ? toDateLabel(forecast.predcYmd) : null,
    noonLabel: forecast ? forecast.predcNoonSeCd : null,
    fishingIndex: forecast ? toFishingIndex(forecast.totalIndex) : null,
    tide: forecast ? toTide(forecast.tdlvHrCn) : null,
    marineRows: forecast ? toMarineRows(forecast) : null,
    inlandRows: detail.inlandDetail ? toInlandRows(detail.inlandDetail) : null,
  };
}

/** 스팟 상세 — 마커를 누를 때마다 새로 받는다 */
export function useSpotDetailViewModel(dataSource: SpotDataSource, spotId: number) {
  const source = useMemo(() => ({ dataSource, spotId }), [dataSource, spotId]);
  return useSection(source, loadDetail, toSpotDetailViewModel);
}

/**
 * 찜 토글.
 *
 * 서버 응답을 기다리지 않고 하트를 먼저 뒤집고, 실패하면 되돌린다 —
 * 목록 응답(isFavorite)이 초기값이라 화면이 다시 뜨면 서버 값으로 맞춰진다.
 * 양쪽 엔드포인트가 idempotent 라 연타해도 상태가 어긋나지 않는다.
 */
export function useSpotFavorite(
  dataSource: SpotDataSource,
  spotId: number,
  initial: boolean,
  /** 목록 쪽 값이 낡지 않도록 성공했을 때만 알린다 */
  onChange?: (spotId: number, isFavorite: boolean) => void,
) {
  const [isFavorite, setIsFavorite] = useState(initial);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const toggle = useCallback(() => {
    if (pending) return;

    const next = !isFavorite;
    setIsFavorite(next);
    setPending(true);
    setFailure(null);

    const request = next ? dataSource.addFavorite(spotId) : dataSource.removeFavorite(spotId);

    request
      .then(() => onChange?.(spotId, next))
      .catch((e: unknown) => {
        setIsFavorite(!next);
        const message =
          typeof e === 'object' && e !== null && 'message' in e
            ? String((e as { message: unknown }).message)
            : '잠시 후 다시 시도해 주세요.';
        setFailure(message);
      })
      .finally(() => setPending(false));
  }, [dataSource, spotId, isFavorite, pending, onChange]);

  return { isFavorite, pending, failure, toggle };
}
