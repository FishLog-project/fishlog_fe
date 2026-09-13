import { useEffect, useMemo, useState } from 'react';

import { distanceMeters, formatDistance, isValidCoords } from '@/features/map/geo';
import type {
  Coords,
  TourCategory,
  TourDataSource,
  TourSpot,
} from '@/features/map/tour-data';

export interface TourPlaceViewModel {
  /** BE에 id가 없어 순번으로 만든다. 같은 응답 안에서만 유일하다 */
  id: string;
  name: string;
  address: string | null;
  /** "1.2km". 좌표가 없으면 null */
  distanceLabel: string | null;
  /** 목록 썸네일 — 작은 이미지를 우선 쓴다 */
  thumbnailUrl: string | null;
  photos: readonly string[];
  coords: Coords | null;
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

function toPlace(spot: TourSpot, index: number, origin: Coords): TourPlaceViewModel {
  const position = { lat: spot.mapY, lng: spot.mapX };
  const coords = isValidCoords(position) ? position : null;
  const thumbnail = imageUrl(spot.firstImage2);
  const image = imageUrl(spot.firstImage) || thumbnail;

  return {
    id: `${index}-${spot.title}`,
    name: spot.title,
    address: [spot.addr1, spot.addr2].filter(Boolean).join(' ') || null,
    distanceLabel: coords ? formatDistance(distanceMeters(origin, coords)) : null,
    thumbnailUrl: thumbnail || image,
    photos: image ? [image] : [],
    coords,
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
        const places = res.items.map((spot, i) => toPlace(spot, i, coords));
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
