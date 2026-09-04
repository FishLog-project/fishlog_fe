/**
 * API 호출 결과 표현.
 *
 * 모든 API 함수는 성공/실패를 예외가 아니라 결과 객체로 돌려준다.
 * 화면이 상태코드를 몰라도 되게 하려는 것이고, 사용자에게 보일 문구도
 * API 계층에서 확정한다.
 */
import { ApiError } from './client';

export type Ok = { ok: true };

export type Fail<R extends string = 'unknown'> = {
  ok: false;
  /** 화면이 분기해야 할 때 쓰는 사유. 문구만 필요하면 무시해도 된다 */
  reason: R | 'unknown';
  message: string;
};

export const NETWORK_FAIL = {
  ok: false as const,
  reason: 'unknown' as const,
  message: '네트워크 오류가 발생했어요.',
};

/**
 * 공통 에러 변환기.
 * `map`에 없는 상태코드는 서버 메시지를 그대로 보여준다 (서버가 한국어로 내려준다).
 */
export function toFail<R extends string>(
  e: unknown,
  map: Partial<Record<number, { reason: R; message: string }>> = {},
): Fail<R> {
  if (e instanceof ApiError) {
    const hit = map[e.status];
    if (hit) return { ok: false, reason: hit.reason, message: hit.message };
    return { ok: false, reason: 'unknown', message: e.message };
  }
  return NETWORK_FAIL;
}
