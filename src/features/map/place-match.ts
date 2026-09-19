import { distanceMeters } from '@/features/map/geo';
import type { Coords } from '@/features/map/tour-data';
import type { TourPlaceViewModel } from '@/features/map/use-nearby-tours';

/** 이름이 맞을 때 같은 장소로 볼 거리. 카카오와 관광공사 좌표가 입구·중심 차이로 조금 다르다 */
const NAMED_MATCH_DISTANCE_M = 300;

/**
 * 이름이 안 맞을 때 같은 장소로 볼 거리. 사실상 같은 점이어야 한다.
 *
 * 300m 로 두었더니 "롯데월드 어드벤처"를 고르면 225m 떨어진 "서울 삼전도비"가 열렸다.
 * 관광지는 서로 붙어 있는 경우가 많아, 이름 없이 거리만으로는 멀리 잡을 수 없다.
 */
const UNNAMED_MATCH_DISTANCE_M = 50;

function normalizeName(name: string): string {
  return name.replace(/[\s·&()（）\-_.]/g, '').toLowerCase();
}

/**
 * 카카오에서 고른 장소를 관광공사 목록에서 찾는다. 못 찾으면 null — 그때 화면은 목록만 보인다.
 *
 * 이름이 데이터마다 조금씩 달라(롯데월드 어드벤처 / 롯데월드) 이름이 서로 포함되는지를 먼저 본다.
 * 이름이 안 맞으면 거의 같은 지점일 때만 인정한다. 엉뚱한 장소의 상세를 여느니 안 여는 편이 낫다.
 */
export function matchSearchedPlace(
  places: readonly TourPlaceViewModel[],
  target: { name: string; coords: Coords },
): TourPlaceViewModel | null {
  const wanted = normalizeName(target.name);
  const nearby = places
    .flatMap((place) => place.coords
      ? [{ place, distance: distanceMeters(target.coords, place.coords) }]
      : [])
    .sort((a, b) => a.distance - b.distance);
  const named = nearby.find(({ place, distance }) => {
    const name = normalizeName(place.name);
    return distance <= NAMED_MATCH_DISTANCE_M
      && name.length > 0 && wanted.length > 0
      && (name.includes(wanted) || wanted.includes(name));
  });
  if (named) return named.place;
  const closest = nearby[0];
  return closest && closest.distance <= UNNAMED_MATCH_DISTANCE_M ? closest.place : null;
}
