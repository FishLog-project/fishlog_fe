import { useEffect, useMemo, useState } from 'react';

import { distanceMeters, formatDistance, isValidCoords } from '@/features/map/geo';
import {
  CONGESTION_LEVELS,
  type CongestionLevel,
  type Coords,
  type TourCategory,
  type TourCongestion,
  type TourDataSource,
  type TourSpot,
} from '@/features/map/tour-data';

export interface TourCongestionViewModel {
  level: CongestionLevel;
  /** "오늘" 또는 기준일이 오늘이 아니면 "9/19" */
  dayLabel: string;
}

export interface TourPlaceViewModel {
  /** BE에 id가 없어 요청 키와 순번으로 만든다. 오래된 마커 이벤트는 새 결과를 고르지 못한다 */
  id: string;
  name: string;
  address: string | null;
  /** "1.2km". 좌표가 없으면 null */
  distanceLabel: string | null;
  /** 목록 썸네일 — 작은 이미지를 우선 쓴다 */
  thumbnailUrl: string | null;
  photos: readonly string[];
  coords: Coords | null;
  /** 당일 예상 혼잡도. 없으면 화면에서 숨긴다 */
  congestion: TourCongestionViewModel | null;
}

export type NearbyToursState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error' }
  | { status: 'ready'; places: readonly TourPlaceViewModel[] };

function imageUrl(value: string | null): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    // 관광공사 사진은 같은 경로의 HTTPS를 지원한다. 다른 호스트는 변경하지 않는다.
    if (url.protocol === 'http:' && url.hostname === 'tong.visitkorea.or.kr' && !url.port) {
      url.protocol = 'https:';
    }
    return url.href;
  } catch {
    return null;
  }
}

function localDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * 서버 혼잡도를 화면용으로 바꾼다. 모르는 등급이나 깨진 날짜는 숨긴다 —
 * 틀린 등급을 보여 주느니 안 보여 주는 편이 낫다.
 */
export function toCongestion(
  value: TourCongestion | null | undefined,
  today: Date = new Date(),
): TourCongestionViewModel | null {
  if (!value || !CONGESTION_LEVELS.includes(value.level)) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.baseDate ?? '');
  if (!match) return null;
  const dayLabel =
    value.baseDate === localDate(today) ? '오늘' : `${Number(match[2])}/${Number(match[3])}`;
  return { level: value.level, dayLabel };
}

function toPlace(spot: TourSpot, index: number, origin: Coords, requestKey: string): TourPlaceViewModel {
  const position = { lat: spot.mapY, lng: spot.mapX };
  const coords = isValidCoords(position) ? position : null;
  const thumbnail = imageUrl(spot.firstImage2);
  const image = imageUrl(spot.firstImage) || thumbnail;

  return {
    id: `${requestKey}:${index}-${spot.title}`,
    name: spot.title,
    address: [spot.addr1, spot.addr2].filter(Boolean).join(' ') || null,
    distanceLabel: coords ? formatDistance(distanceMeters(origin, coords)) : null,
    thumbnailUrl: thumbnail || image,
    photos: image ? [image] : [],
    coords,
    congestion: toCongestion(spot.congestion),
  };
}

/** 같은 분류로 돌아와도 이전 응답을 재사용하지 않도록 요청의 참조를 구분한다. */
type Loaded = {
  request: { source: TourDataSource; key: string | null };
  state: NearbyToursState;
};

/**
 * 선택한 분류·현재 위치로 주변 시설을 받는다.
 * 분류나 위치가 바뀌면 이전 요청은 중단하고, 지금 키의 응답만 화면에 반영한다.
 */
export function useNearbyTours(
  dataSource: TourDataSource,
  category: TourCategory | null,
  origin: Coords | null,
) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const lat = origin?.lat;
  const lng = origin?.lng;

  const key = category && isValidCoords(origin)
    ? `${category}#${lat},${lng}#${attempt}` : null;
  const request = useMemo(() => ({ source: dataSource, key }), [dataSource, key]);

  useEffect(() => {
    if (!request.key || !category || lat === undefined || lng === undefined) return;

    const controller = new AbortController();
    const coords = { lat, lng };
    request.source
      .getNearbyTours({ type: category, ...coords }, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        const places = res.items.map((spot, i) => toPlace(spot, i, coords, request.key!));
        setLoaded({
          request,
          state: places.length === 0 ? { status: 'empty' } : { status: 'ready', places },
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoaded({ request, state: { status: 'error' } });
        }
      });

    return () => controller.abort();
  }, [request, category, lat, lng]);

  const state: NearbyToursState = !key
    ? { status: 'idle' }
    : loaded?.request === request
      ? loaded.state
      : { status: 'loading' };

  const retry = () => setAttempt((n) => n + 1);

  return [state, retry] as const;
}
