import { useMemo, useState } from 'react';

import type {
  InlandDetail,
  SpotCategory,
  SpotDataSource,
  SpotDetail,
  SpotForecast,
  SpotSummary,
} from '@/features/map/spot-data';
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

/** 예보 시간대 (Figma 1125:2937 의 오전/오후 전환) */
export type NoonSegment = 'am' | 'pm';

export interface SpotDetailViewModel {
  id: number;
  name: string;
  /**
   * 시안(634:1537)의 "서울 00시 00구 000" 자리.
   * ⚠️ GET /api/spots/{spotId} 응답에 주소 필드가 없어 항상 null 이다.
   *    BE 에 주소가 추가되면 여기만 채우면 된다.
   */
  addressLabel: string | null;
  categoryLabel: string;
  /** 낚시 금지 구역이면 화면이 경고를 띄운다 */
  prohibited: boolean;
  viewCountLabel: string;
  /** 시안은 4칸까지 보여준다 (634:1563~1566) */
  majorFishes: readonly string[];
  /** "9월 9일 수요일" (Figma 1125:2937). 예보가 없으면 null */
  forecastDateLabel: string | null;
  /** 서버 예보가 오전인지 오후인지. 시안의 전환 컨트롤 초기값으로 쓴다 */
  forecastNoon: NoonSegment | null;
  /** 해양 정보 간단요약 한 줄 (Figma 634:1537 "간단요약") */
  seaSummary: string | null;
  /** 해양 스팟의 관측값 행. 내륙이면 null */
  forecastRows: readonly SpotLabelValue[] | null;
  /** 내륙 스팟의 하천 정보 행. 값이 전부 비면 null */
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

interface DetailSource {
  dataSource: SpotDataSource;
  spotId: number;
}

function loadDetail({ dataSource, spotId }: DetailSource) {
  return dataSource.getSpot(spotId);
}

/** "0.3~0.8m". 두 값이 같으면 한쪽만 쓴다 */
function range(min: number, max: number, unit: string): string {
  return min === max ? `${min}${unit}` : `${min}~${max}${unit}`;
}

/** 항목별로 null 이 올 수 있어, 둘 다 없으면 그 행을 만들지 않는다 */
function optionalRange(
  min: number | null,
  max: number | null,
  unit: string,
): string | null {
  if (min === null && max === null) return null;
  if (min === null) return `~${max}${unit}`;
  if (max === null) return `${min}${unit}~`;
  return range(min, max, unit);
}

function toForecastRows(forecast: SpotForecast): readonly SpotLabelValue[] {
  return [
    { label: '파고', value: range(forecast.minWvhgt, forecast.maxWvhgt, 'm') },
    { label: '수온', value: range(forecast.minWtem, forecast.maxWtem, '℃') },
    { label: '기온', value: range(forecast.minArtmp, forecast.maxArtmp, '℃') },
    { label: '유속', value: range(forecast.minCrsp, forecast.maxCrsp, 'cm/s') },
    { label: '풍속', value: range(forecast.minWspd, forecast.maxWspd, 'm/s') },
  ];
}

function toInlandRows(inland: InlandDetail): readonly SpotLabelValue[] | null {
  const rows = [
    { label: '하천 폭', value: optionalRange(inland.riverWidthMin, inland.riverWidthMax, 'm') },
    { label: '유폭', value: optionalRange(inland.flowWidthMin, inland.flowWidthMax, 'm') },
    { label: '수심', value: optionalRange(inland.depthMin, inland.depthMax, 'm') },
  ].filter((row): row is SpotLabelValue => row.value !== null);

  return rows.length === 0 ? null : rows;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** "20260909" → "9월 9일 수요일". 형식이 어긋나면 null 이라 화면이 그 줄을 그리지 않는다 */
function toDateLabel(predcYmd: string): string | null {
  const matched = /^(\d{4})(\d{2})(\d{2})$/.exec(predcYmd);
  if (!matched) return null;

  const [, year, month, day] = matched;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (Number.isNaN(date.getTime())) return null;

  return `${Number(month)}월 ${Number(day)}일 ${WEEKDAYS[date.getDay()]}요일`;
}

/**
 * ⚠️ predcNoonSeCd 의 코드값 의미가 Swagger 에 없다.
 *    관측된 '1'을 오전으로 두고, 나머지는 오후로 본다. BE 확인 후 좁힐 것.
 */
function toNoonSegment(predcNoonSeCd: string): NoonSegment {
  return predcNoonSeCd === '1' ? 'am' : 'pm';
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
    forecastNoon: forecast ? toNoonSegment(forecast.predcNoonSeCd) : null,
    seaSummary: forecast ? `낚시 지수 ${forecast.totalIndex} · 물때 ${forecast.tdlvHrCn}` : null,
    forecastRows: forecast ? toForecastRows(forecast) : null,
    inlandRows: detail.inlandDetail ? toInlandRows(detail.inlandDetail) : null,
  };
}

/** 스팟 상세 — 마커를 누를 때마다 새로 받는다 */
export function useSpotDetailViewModel(dataSource: SpotDataSource, spotId: number) {
  const source = useMemo(() => ({ dataSource, spotId }), [dataSource, spotId]);
  return useSection(source, loadDetail, toSpotDetailViewModel);
}
