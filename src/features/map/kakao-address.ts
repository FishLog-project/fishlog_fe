import Constants from 'expo-constants';

/**
 * 좌표 → 주소 변환 (카카오 Local REST API).
 *
 * 서버 스팟 응답에 주소가 없어 시안(826:2288)의 주소 줄을 채우려면 좌표를 바꿔야 한다.
 *
 * ⚠️ 네이티브 앱 키로는 부를 수 없다. 이 API 는 KA 헤더의 origin(키 해시)까지 요구하고
 *    검증하는데, 키 해시는 네이티브에서만 구할 수 있는 값이다. 그래서 REST API 키를 쓴다.
 *    (.env.local 의 KAKAO_REST_API_KEY → app.config.ts → extra.kakaoRestApiKey)
 *
 * ⚠️ 좌표가 바다 위면 주소가 없다. 실제로 해양 스팟 상당수가 그렇다
 *    (강릉항 북동(2km)·거제도 등은 빈 응답). 그때는 null 이고 화면이 대체 문구를 쓴다.
 */
const ENDPOINT = 'https://dapi.kakao.com/v2/local/geo/coord2address.json';

interface Coord2AddressResponse {
  documents?: readonly {
    address?: { address_name?: string } | null;
    road_address?: { address_name?: string } | null;
  }[];
}

/** 같은 좌표를 여러 화면에서 다시 묻지 않도록 세션 동안 기억한다 */
const cache = new Map<string, string | null>();

function restApiKey(): string | null {
  const key = Constants.expoConfig?.extra?.kakaoRestApiKey;
  return typeof key === 'string' && key.length > 0 ? key : null;
}

/**
 * 주소 변환을 쓸 수 있는 상태인지.
 *
 * 키가 없으면 92개 스팟을 훑어 봐야 전부 null 이라, 아예 시도하지 않기 위해 쓴다.
 */
export function canLookupAddress(): boolean {
  return restApiKey() !== null;
}

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

/**
 * 지번 주소를 우선 쓴다 — 시안의 "경기도 가평군 청평면 22"가 지번 형식이고,
 * 낚시터 좌표는 도로명이 없는 경우가 많다.
 */
export async function lookupAddress(lat: number, lng: number): Promise<string | null> {
  const key = cacheKey(lat, lng);
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const apiKey = restApiKey();
  if (!apiKey) return null;

  try {
    const response = await fetch(`${ENDPOINT}?x=${lng}&y=${lat}`, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
    });
    if (!response.ok) {
      cache.set(key, null);
      return null;
    }

    const body = (await response.json()) as Coord2AddressResponse;
    const first = body.documents?.[0];
    const address =
      first?.address?.address_name ?? first?.road_address?.address_name ?? null;

    cache.set(key, address);
    return address;
  } catch {
    // 네트워크 실패는 주소만 비우고 넘어간다 — 목록 자체는 보여야 한다
    return null;
  }
}
