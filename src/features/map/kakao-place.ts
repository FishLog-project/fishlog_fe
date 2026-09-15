import Constants from 'expo-constants';

import { distanceMeters } from '@/features/map/geo';
import type { Coords } from '@/features/map/tour-data';

/**
 * 시설 → 카카오맵 장소 페이지 링크 (카카오 Local 키워드 검색).
 *
 * 관광공사 응답에는 장소 ID 도 상세 링크도 없다(이름·주소·좌표·사진뿐).
 * 그래서 이름과 좌표로 카카오에서 같은 장소를 찾아 place_url(http://place.map.kakao.com/{id})을 쓴다.
 *
 * ⚠️ 네이티브 앱 키로는 부를 수 없다. 좌표→주소 변환과 같은 이유로 REST API 키를 쓴다.
 *    (.env.local 의 KAKAO_REST_API_KEY → app.config.ts → extra.kakaoRestApiKey)
 * ⚠️ 이름이 같은 다른 지점을 잡지 않도록 좌표에서 멀면 버린다. 못 찾으면 null 이고
 *    화면은 링크 버튼을 감춘다.
 */
const ENDPOINT = 'https://dapi.kakao.com/v2/local/search/keyword.json';

/** 이 거리를 넘으면 동명이인(다른 지점)으로 보고 버린다 */
const MAX_MATCH_DISTANCE_M = 300;
/** 좌표를 모르는 시설은 이름만으로 찾되, 결과가 하나로 좁혀질 때만 쓴다 */
const NAME_ONLY_MAX_RESULTS = 1;

interface KeywordDocument {
  id?: string;
  place_name?: string;
  place_url?: string;
  x?: string;
  y?: string;
}

/** 같은 시설을 다시 묻지 않도록 세션 동안 기억한다 (못 찾은 것도 기억한다) */
const cache = new Map<string, string | null>();

function restApiKey(): string | null {
  const key = Constants.expoConfig?.extra?.kakaoRestApiKey;
  return typeof key === 'string' && key.length > 0 ? key : null;
}

/** REST 키가 없으면 어떤 시설도 링크를 못 얻으므로 아예 시도하지 않는다 */
export function canLookupPlaceUrl(): boolean {
  return restApiKey() !== null;
}

function cacheKey(name: string, coords: Coords | null): string {
  return coords ? `${name}@${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}` : name;
}

function toCoords(document: KeywordDocument): Coords | null {
  const lat = Number(document.y);
  const lng = Number(document.x);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

/** 좌표가 있으면 가장 가까운 후보를, 없으면 결과가 하나일 때만 쓴다 */
function pickMatch(
  documents: readonly KeywordDocument[],
  coords: Coords | null,
): KeywordDocument | null {
  const usable = documents.filter((document) => document.place_url);
  if (usable.length === 0) return null;
  if (!coords) return usable.length <= NAME_ONLY_MAX_RESULTS ? usable[0] : null;

  let best: { document: KeywordDocument; distance: number } | null = null;
  for (const document of usable) {
    const found = toCoords(document);
    if (!found) continue;
    const distance = distanceMeters(coords, found);
    if (!best || distance < best.distance) best = { document, distance };
  }
  return best && best.distance <= MAX_MATCH_DISTANCE_M ? best.document : null;
}

/**
 * 시설의 카카오맵 상세 페이지 주소. 못 찾으면 null.
 *
 * 목록 30건을 한꺼번에 조회하지 않고, 상세를 열 때 그 시설만 찾는다.
 */
export async function lookupPlaceUrl(name: string, coords: Coords | null): Promise<string | null> {
  const key = cacheKey(name, coords);
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const apiKey = restApiKey();
  if (!apiKey) return null;

  const query = new URLSearchParams({ query: name, size: '5' });
  if (coords) {
    query.set('x', String(coords.lng));
    query.set('y', String(coords.lat));
    query.set('radius', String(MAX_MATCH_DISTANCE_M));
    query.set('sort', 'distance');
  }

  try {
    const response = await fetch(`${ENDPOINT}?${query.toString()}`, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
    });
    if (!response.ok) {
      cache.set(key, null);
      return null;
    }

    const body = (await response.json()) as { documents?: readonly KeywordDocument[] };
    const matched = pickMatch(body.documents ?? [], coords);
    // 카카오가 http 로 주는 링크를 https 로 올려 인앱 브라우저에서 경고가 뜨지 않게 한다
    const url = matched?.place_url?.replace(/^http:/, 'https:') ?? null;
    cache.set(key, url);
    return url;
  } catch {
    // 네트워크 실패는 링크만 비우고 상세는 그대로 보여 준다
    return null;
  }
}
