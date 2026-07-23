/**
 * 인증(Auth) 관련 API 호출 모음.
 * 스펙: https://api.fishlog.xyz/v3/api-docs (Auth API)
 *
 * ⚠️ 현재 요구사항: **이메일 인증까지만** 실제 연동한다.
 *   - sendEmailCode / verifyEmailCode → 실제 사용
 *   - signup / login → 서버 수정 중이라 함수 시그니처만 준비(호출부는 스텁)
 */
import { ApiError, apiRequest } from '@/lib/api/client';

export type SendCodeResult =
  | { ok: true }
  | { ok: false; reason: 'duplicated' | 'rate_limited' | 'unknown'; message: string };

export type VerifyCodeResult =
  | { ok: true }
  | { ok: false; reason: 'invalid' | 'unknown'; message: string };

/** 이메일 인증코드 발송. POST /api/auth/email/send-code */
export async function sendEmailCode(email: string): Promise<SendCodeResult> {
  try {
    await apiRequest('/api/auth/email/send-code', {
      method: 'POST',
      body: { email },
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 409)
        return { ok: false, reason: 'duplicated', message: '이미 가입된 이메일이에요.' };
      if (e.status === 429)
        return {
          ok: false,
          reason: 'rate_limited',
          message: '잠시 후 다시 시도해 주세요.',
        };
      return { ok: false, reason: 'unknown', message: e.message };
    }
    return { ok: false, reason: 'unknown', message: '네트워크 오류가 발생했어요.' };
  }
}

/** 이메일 인증코드 확인. POST /api/auth/email/verify-code */
export async function verifyEmailCode(
  email: string,
  code: string,
): Promise<VerifyCodeResult> {
  try {
    await apiRequest('/api/auth/email/verify-code', {
      method: 'POST',
      body: { email, code },
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 400)
        return { ok: false, reason: 'invalid', message: '인증번호가 올바르지 않아요.' };
      return { ok: false, reason: 'unknown', message: e.message };
    }
    return { ok: false, reason: 'unknown', message: '네트워크 오류가 발생했어요.' };
  }
}

// ─────────────────────────────────────────────────────────────
// 아래 두 함수는 서버 API 수정 완료 후 연동 예정 (현재 호출부에서 미사용).
// ─────────────────────────────────────────────────────────────

export type SignupInput = { email: string; password: string; nickname: string };

/** 회원가입. POST /api/auth/signup — TODO: 서버 확정 후 연동 */
export async function signup(input: SignupInput): Promise<void> {
  await apiRequest('/api/auth/signup', { method: 'POST', body: input });
}

/** 로그인. POST /api/auth/login — TODO: 토큰 반환 방식 확정 후 연동 */
export async function login(email: string, password: string): Promise<void> {
  await apiRequest('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}
