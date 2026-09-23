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

import { fetch as expoFetch } from 'expo/fetch';

export const API_BASE_URL = 'https://api.fishlog.xyz';
const REQUEST_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 120_000;

/** 한 로그인 세션에 묶인 요청. 토큰 회전은 허용하지만 계정 전환은 허용하지 않는다. */
export type ApiSession = {
  token: string;
  isCurrent: () => boolean;
  refresh: (rejectedToken: string) => Promise<string | null>;
  expire: (rejectedToken: string) => void;
};

let resolveSession: ((token: string) => ApiSession | null) | null = null;

export function installApiSessionResolver(resolver: (token: string) => ApiSession | null) {
  resolveSession = resolver;
  return () => {
    // 이전 Provider 정리가 새 Provider의 세션 연결을 지우지 않게 한다.
    if (resolveSession === resolver) resolveSession = () => null;
  };
}

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
  /** 로그아웃은 로컬 세션을 지운 뒤 캡처한 이전 토큰으로 보내며 재발급하지 않는다. */
  skipSession?: boolean;
};

/**
 * 공통 요청 함수.
 *
 * 2xx가 아니거나 봉투의 success가 false면 ApiError를 throw 한다.
 * (HTTP는 200인데 success:false로 내려오는 경우까지 잡기 위해 둘 다 본다)
 */
export async function apiRequest<T = unknown>(
  path: string,
  { method = 'GET', body, token, signal, skipSession = false }: RequestOptions = {},
): Promise<T> {
  const session = token && !skipSession ? resolveSession?.(token) : null;
  if (token && !skipSession && resolveSession && !session) {
    throw new ApiError(401, '로그인이 필요해요.');
  }
  const multipart = typeof FormData !== 'undefined' && body instanceof FormData;
  const requestBody = body === undefined ? undefined : multipart ? body : JSON.stringify(body);
  const request = multipart ? expoFetch : globalThis.fetch;
  let accessToken = session?.token ?? token;

  for (let attempt = 0; ; attempt++) {
    throwIfAborted(signal);
    if (session && !session.isCurrent()) throw new ApiError(401, '로그인이 필요해요.');
    const headers: Record<string, string> = { Accept: 'application/json' };
    // FormData는 재시도 때도 fetch가 새 boundary를 생성하도록 그대로 넘긴다.
    if (body !== undefined && !multipart) headers['Content-Type'] = 'application/json';
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, multipart ? UPLOAD_TIMEOUT_MS : REQUEST_TIMEOUT_MS);
    let res: { ok: boolean; status: number };
    let parsed: unknown;
    try {
      const response = await request(`${API_BASE_URL}${path}`, {
        method, headers, body: requestBody, signal: controller.signal,
      });
      const text = await response.text();
      parsed = text ? safeJsonParse(text) : undefined;
      res = response;
      if (controller.signal.aborted) {
        throwIfAborted(signal);
        throw new ApiError(408, '서버 응답이 늦어지고 있어요. 다시 시도해 주세요.');
      }
    } catch (error) {
      throwIfAborted(signal);
      if (controller.signal.aborted) {
        throw new ApiError(408, '서버 응답이 늦어지고 있어요. 다시 시도해 주세요.');
      }
      throw error;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
    throwIfAborted(signal);
    if (session && !session.isCurrent()) throw new ApiError(401, '로그인이 필요해요.');

    if (res.status === 401 && session && accessToken) {
      if (attempt === 0) {
        const refreshed = await session.refresh(accessToken);
        throwIfAborted(signal);
        if (refreshed && session.isCurrent()) {
          accessToken = refreshed;
          continue;
        }
      } else {
        session.expire(accessToken);
      }
    }
    const envelope = isEnvelope(parsed) ? parsed : null;
    if (!res.ok || envelope?.success === false) {
      const message =
        (isRecord(parsed) && typeof parsed.message === 'string' && parsed.message) ||
        `요청에 실패했어요 (${res.status})`;
      throw new ApiError(res.status, message, parsed);
    }
    // 네트워크/5xx/본문 오류는 저장 여부가 불명확하므로 POST를 자동 재전송하지 않는다.
    return (envelope ? envelope.data : parsed) as T;
  }
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw Object.assign(new Error('요청이 취소되었어요.'), { name: 'AbortError' });
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
