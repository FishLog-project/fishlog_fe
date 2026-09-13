import { useEffect, useMemo, useState } from 'react';

import { canLookupAddress, lookupAddress } from '@/features/map/kakao-address';
import type { SpotMarkerViewModel } from '@/features/map/use-spot-view-model';

export interface SpotSearchResult {
  spot: SpotMarkerViewModel;
  /** 좌표가 바다 위면 주소가 없다 */
  addressLabel: string | null;
}

/** 한 번에 던지는 주소 변환 요청 수. 92건을 한꺼번에 보내지 않으려고 나눈다 */
const LOOKUP_BATCH = 8;

/** 띄어쓰기를 무시하고 비교한다 — "안흥항 서측"으로 "안흥항서측"을 찾을 수 있도록 */
function normalize(text: string): string {
  return text.replace(/\s+/g, '');
}

/**
 * 스팟 주소를 미리 받아 둔다.
 *
 * 서버가 주소를 주지 않아 지역으로 찾으려면 좌표를 변환해야 한다.
 * 결과는 kakao-address 모듈이 세션 동안 캐시하므로 화면을 다시 열어도 다시 부르지 않는다.
 *
 * ⚠️ REST 키가 없으면 아무것도 하지 않는다 (그때는 이름으로만 검색된다).
 */
function useSpotAddresses(spots: readonly SpotMarkerViewModel[] | null) {
  const [addresses, setAddresses] = useState<ReadonlyMap<number, string>>(new Map());
  const [completedSpots, setCompletedSpots] = useState<typeof spots>(null);

  useEffect(() => {
    if (spots === null || !canLookupAddress()) return;

    let alive = true;

    const run = async () => {
      for (let index = 0; index < spots.length; index += LOOKUP_BATCH) {
        if (!alive) return;

        const batch = spots.slice(index, index + LOOKUP_BATCH);
        const found = await Promise.all(
          batch.map(async (spot) => [spot.id, await lookupAddress(spot.lat, spot.lng).catch(() => null)] as const),
        );
        if (!alive) return;

        const filled = found.filter((entry): entry is readonly [number, string] => entry[1] !== null);
        if (filled.length === 0) continue;

        setAddresses((current) => {
          const next = new Map(current);
          for (const [id, address] of filled) next.set(id, address);
          return next;
        });
      }
    };

    run().finally(() => {
      if (alive) setCompletedSpots(spots);
    }).catch(() => undefined);

    return () => {
      alive = false;
    };
  }, [spots]);

  return { addresses, loading: spots !== null && canLookupAddress() && completedSpots !== spots };
}

/**
 * 낚시터 검색 — 이름과 지역(주소)을 함께 본다.
 *
 * 서버에 검색 API 가 없어 이미 받아 둔 목록(GET /api/spots, 92건)을 클라이언트에서 거른다.
 * 이름만으로는 지역을 못 찾는 스팟이 많아(가거도·신지도 등) 주소도 같이 비교한다.
 *
 * ⚠️ 주소가 나오는 스팟은 92건 중 56건(61%)이다. 나머지는 좌표가 바다 위라 주소가 없어
 *    이름으로만 걸린다. 지역 검색을 온전히 하려면 BE 가 지역·주소를 내려줘야 한다.
 */
export function useSpotSearch(spots: readonly SpotMarkerViewModel[] | null, query: string) {
  const { addresses, loading } = useSpotAddresses(spots);

  const results = useMemo(() => {
    if (spots === null) return null;

    const keyword = normalize(query);
    if (keyword === '') return [];

    const results: SpotSearchResult[] = [];
    for (const spot of spots) {
      const addressLabel = addresses.get(spot.id) ?? null;
      const matched =
        normalize(spot.name).includes(keyword) ||
        (addressLabel !== null && normalize(addressLabel).includes(keyword));

      if (matched) results.push({ spot, addressLabel });
    }

    return results;
  }, [spots, addresses, query]);
  return { results, loading };
}
