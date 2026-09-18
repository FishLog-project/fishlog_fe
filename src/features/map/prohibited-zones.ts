import ZONE_DATA from '@/assets/data/fishing-prohibited-zones.json';
import type { Coords } from '@/features/map/tour-data';

/**
 * 해상 낚시 금지 구역.
 *
 * 출처: 해양수산부 국립해양조사원 낚시금지구역(2025-08-13). 전자해도 기반 SHP 를
 * WGS84 로 변환하고 15m 허용오차로 단순화해 번들에 넣었다 (정점 22,941 -> 1,413).
 * 오픈 API 가 없어 파일로만 제공되는 자료라, 서버를 거치지 않고 앱이 직접 들고 있다.
 *
 * 바다만 다룬다. 저수지·하천 같은 내수면 금지구역은 지자체별로 흩어져 있어 포함하지
 * 않았다. 그래서 구역이 없는 지역에서는 화면에 아무것도 그리지 않는다.
 */
export type ProhibitedZone = {
  id: string;
  name: string;
  /** [남, 서, 북, 동] — 화면 밖 구역을 좌표 비교만으로 걸러내려고 미리 담아 둔다 */
  bbox: [number, number, number, number];
  /** 링별 [위도, 경도] 목록. 첫 링이 바깥 경계다 */
  rings: [number, number][][];
};

/** 네이티브로 넘기는 형태. codegen 이 중첩 배열을 못 다뤄 좌표를 문자열로 엮는다 */
export type ZonePolygonProps = { id: string; name: string; rings: string };

const ZONES = ZONE_DATA.zones as ProhibitedZone[];

/**
 * 전체 구역.
 *
 * 구역을 켜면 카메라를 전국 뷰로 빼기 때문에 화면 단위로 걸러 낼 이유가 없다.
 * 24곳 1,000여 정점이라 한 번에 그려도 지도가 느려지지 않는다. 내수면 자료까지
 * 합쳐 수가 크게 늘면 bbox 로 화면 밖을 걸러 내면 된다 (각 구역에 담아 두었다).
 */
export function allZones(): ProhibitedZone[] {
  return ZONES;
}

export function toZonePolygons(zones: ProhibitedZone[]): ZonePolygonProps[] {
  return zones.map((zone) => ({
    id: zone.id,
    name: zone.name,
    rings: zone.rings
      .map((ring) => ring.map(([lat, lng]) => `${lat},${lng}`).join(' '))
      .join(';'),
  }));
}

/** 자료에 들어 있는 전체 구역 수. 검사와 안내 문구에서 쓴다 */
export const PROHIBITED_ZONE_COUNT = ZONES.length;
