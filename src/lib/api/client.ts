/**
 * Fishlog API 클라이언트.
 * baseURL + JSON 직렬화 + 에러 정규화를 담당하는 얇은 fetch 래퍼.
 * (토큰이 필요한 요청은 추후 Authorization 헤더를 붙이도록 확장)
 */

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
 * 공통 요청 함수. 응답 본문이 비어있으면(204/빈 200) undefined를 반환한다.
 * 2xx가 아니면 ApiError를 throw 한다.
 */
export async function apiRequest<T = unknown>(
  path: string,
  { method = 'GET', body, token, signal }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  const text = await res.text();
  const data = text ? safeJsonParse(text) : undefined;

  if (!res.ok) {
    const message =
      (isRecord(data) && typeof data.message === 'string' && data.message) ||
      `요청에 실패했어요 (${res.status})`;
    throw new ApiError(res.status, message, data);
  }

  return data as T;
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
