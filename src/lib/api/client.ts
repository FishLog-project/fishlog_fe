/**
 * Fishlog API 클라이언트.
 * baseURL + JSON 직렬화 + 응답 봉투 해제 + 에러 정규화를 담당하는 얇은 fetch 래퍼.
 *
 * 서버는 모든 응답을 아래 봉투로 감싼다.
 *   { "success": true,  "code": 200, "message": "...", "data": <실제 값> }
 *   { "success": false, "code": 401, "message": "이메일 또는 비밀번호가 올바르지 않습니다.", "data": null }
 *
 * Swagger의 응답 스키마는 이 봉투가 아니라 `data` 안쪽만 기술하고 있으므로
 * (예: /api/users/me → { userId, email, nickname })
 * 여기서 봉투를 벗겨 `data`만 돌려준다. 호출부가 매번 `.data`를 파고들지 않게 하기 위함이다.
 */

import { fetch } from 'expo/fetch';

export const API_BASE_URL = 'https://api.fishlog.xyz';

/** 서버가 상태코드로 구분하는 에러를 앱에서 다루기 쉽게 감싼 타입 */
export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Authorization 토큰 (있으면 Bearer 헤더로 부착) */
  token?: string | null;
  signal?: AbortSignal;
};

/**
 * 공통 요청 함수.
 *
 * 2xx가 아니거나 봉투의 success가 false면 ApiError를 throw 한다.
 * (HTTP는 200인데 success:false로 내려오는 경우까지 잡기 위해 둘 다 본다)
 */
export async function apiRequest<T = unknown>(
  path: string,
  { method = 'GET', body, token, signal }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const multipart = typeof FormData !== 'undefined' && body instanceof FormData;
  // FormData의 Content-Type에는 fetch가 생성하는 boundary가 필요하므로 직접 지정하지 않는다.
  if (body !== undefined && !multipart) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? (multipart ? body : JSON.stringify(body)) : undefined,
    signal,
  });

  const text = await res.text();
  const parsed = text ? safeJsonParse(text) : undefined;
  const enveloped = isEnvelope(parsed);

  if (!res.ok || (enveloped && parsed.success === false)) {
    const message =
      (isRecord(parsed) && typeof parsed.message === 'string' && parsed.message) ||
      `요청에 실패했어요 (${res.status})`;
    throw new ApiError(res.status, message, parsed);
  }

  // 봉투면 data만, 아니면(혹시 서버가 봉투 없이 주면) 본문 그대로.
  return (enveloped ? parsed.data : parsed) as T;
}

type Envelope = { success: boolean; code?: number; message?: string; data?: unknown };

function isEnvelope(v: unknown): v is Envelope {
  return isRecord(v) && typeof v.success === 'boolean' && 'data' in v;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}
