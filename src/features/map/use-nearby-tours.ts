import { useEffect, useState } from 'react';

import { distanceMeters, formatDistance } from '@/features/map/geo';
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

function toPlace(spot: TourSpot, index: number, origin: Coords): TourPlaceViewModel {
  const coords =
    typeof spot.mapX === 'number' && Number.isFinite(spot.mapX) && Math.abs(spot.mapX) <= 180 &&
    typeof spot.mapY === 'number' && Number.isFinite(spot.mapY) && Math.abs(spot.mapY) <= 90
      ? { lat: spot.mapY, lng: spot.mapX }
      : null;
  const image = spot.firstImage?.trim() || spot.firstImage2?.trim() || null;

  return {
    id: `${index}-${spot.title}`,
    name: spot.title,
    address: [spot.addr1, spot.addr2].filter(Boolean).join(' ') || null,
    distanceLabel: coords ? formatDistance(distanceMeters(origin, coords)) : null,
    thumbnailUrl: spot.firstImage2?.trim() || image,
    photos: image ? [image] : [],
    coords,
  };
}

/** 어떤 요청의 응답인지 함께 들고 있어야 로딩 여부를 상태 없이 알 수 있다 */
type Loaded = { source: TourDataSource; key: string; state: NearbyToursState };

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

  const key = category && lat !== undefined && lng !== undefined
    ? `${category}#${lat},${lng}#${attempt}` : null;

  useEffect(() => {
    if (!key || !category || lat === undefined || lng === undefined) return;

    const controller = new AbortController();
    const coords = { lat, lng };
    dataSource
      .getNearbyTours({ type: category, ...coords }, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        const places = res.items.map((spot, i) => toPlace(spot, i, coords));
        setLoaded({
          source: dataSource,
          key,
          state: places.length === 0 ? { status: 'empty' } : { status: 'ready', places },
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoaded({ source: dataSource, key, state: { status: 'error' } });
        }
      });

    return () => controller.abort();
  }, [key, category, lat, lng, dataSource]);

  const state: NearbyToursState = !key
    ? { status: 'idle' }
    : loaded?.source === dataSource && loaded.key === key
      ? loaded.state
      : { status: 'loading' };

  const retry = () => setAttempt((n) => n + 1);

  return [state, retry] as const;
}
