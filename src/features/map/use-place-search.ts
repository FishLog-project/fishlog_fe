import { useEffect, useState } from 'react';

import { canLookupPlaceUrl, searchPlaces, type PlaceSearchResult } from '@/features/map/kakao-place';
import type { Coords, TourCategory } from '@/features/map/tour-data';

/** 입력이 멈춘 뒤 이만큼 기다렸다 부른다. 글자마다 카카오를 부르지 않기 위해서다 */
const SEARCH_DELAY_MS = 300;

export type PlaceSearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'error' }
  | { status: 'ready'; results: readonly PlaceSearchResult[] };

/**
 * 관광지·음식점·숙박을 이름으로 찾는다 (카카오 키워드 검색).
 *
 * 낚시터 검색과 달리 미리 받아 둔 목록이 없어 입력마다 서버에 묻는다.
 * 분류나 검색어가 바뀌면 이전 요청은 중단하고, 지금 요청의 응답만 반영한다.
 */
export function usePlaceSearch(
  keyword: string,
  category: TourCategory | null,
  near: Coords | null,
): PlaceSearchState {
  const trimmed = keyword.trim();
  const requestKey = category && trimmed ? `${category}:${trimmed}` : null;
  const [loaded, setLoaded] = useState<{ key: string; state: PlaceSearchState } | null>(null);
  // 기준 좌표는 거리 표시에만 쓴다. 좌표가 조금 바뀌었다고 다시 부르지 않도록 키에서 뺀다.
  const nearLat = near?.lat ?? null;
  const nearLng = near?.lng ?? null;

  useEffect(() => {
    if (!requestKey || !category || !canLookupPlaceUrl()) return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      const origin = nearLat !== null && nearLng !== null ? { lat: nearLat, lng: nearLng } : null;
      searchPlaces(trimmed, category, origin, controller.signal)
        .then((results) => setLoaded({ key: requestKey, state: { status: 'ready', results } }))
        .catch(() => {
          if (!controller.signal.aborted) setLoaded({ key: requestKey, state: { status: 'error' } });
        });
    }, SEARCH_DELAY_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [requestKey, category, trimmed, nearLat, nearLng]);

  if (!requestKey) return { status: 'idle' };
  // REST 키가 없으면 시설 검색을 할 수 없다. 낚시터 검색은 그대로 된다.
  if (!canLookupPlaceUrl()) return { status: 'unavailable' };
  return loaded?.key === requestKey ? loaded.state : { status: 'loading' };
}
