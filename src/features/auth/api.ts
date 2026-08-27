/**
 * 인증(Auth) · 사용자(User) API 호출 모음.
 * 스펙: https://api.fishlog.xyz/v3/api-docs
 *
 * 모든 함수는 성공/실패를 예외가 아니라 결과 객체로 돌려준다.
 * 화면이 상태코드를 몰라도 되게 하려는 것이고, 문구도 여기서 확정한다.
 */
import { apiRequest } from '@/lib/api/client';
import { type Fail, type Ok, toFail } from '@/lib/api/result';
import { File } from 'expo-file-system';

export type { Fail, Ok } from '@/lib/api/result';

// ─────────────────────────────────────────────────────────────
// 이메일 인증 (회원가입용)
// ─────────────────────────────────────────────────────────────

export type SendCodeResult = Ok | Fail<'duplicated' | 'rate_limited'>;

/** 이메일 인증코드 발송. POST /api/auth/email/send-code */
export async function sendEmailCode(email: string): Promise<SendCodeResult> {
  try {
    await apiRequest('/api/auth/email/send-code', { method: 'POST', body: { email } });
    return { ok: true };
  } catch (e) {
    return toFail(e, {
      409: { reason: 'duplicated', message: '이미 가입된 이메일이에요.' },
      429: { reason: 'rate_limited', message: '잠시 후 다시 시도해 주세요.' },
    });
  }
}

export type VerifyCodeResult = Ok | Fail<'invalid'>;

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
    return toFail(e, {
      400: { reason: 'invalid', message: '인증번호가 올바르지 않아요.' },
    });
  }
}

// ─────────────────────────────────────────────────────────────
// 회원가입 · 로그인
// ─────────────────────────────────────────────────────────────

export type SignupInput = { email: string; password: string; nickname: string };

/** 로그인·회원가입·재발급이 돌려주는 토큰 쌍 */
export type AuthTokens = { accessToken: string; refreshToken: string | null };

export type SignupResult = (Ok & { tokens: AuthTokens | null }) | Fail<'duplicated'>;

/** 회원가입. POST /api/auth/signup (이메일 인증 완료 후 호출) */
export async function signup(input: SignupInput): Promise<SignupResult> {
  try {
    const data = await apiRequest('/api/auth/signup', { method: 'POST', body: input });
    // 서버가 회원가입 응답에서 바로 토큰을 주는 경우에는 재로그인 없이 사용한다.
    return { ok: true, tokens: toTokens(data) };
  } catch (e) {
    return toFail(e, {
      409: { reason: 'duplicated', message: '이미 사용 중인 이메일 또는 닉네임이에요.' },
    });
  }
}

/**
 * 서버가 주는 토큰 응답을 앱 타입으로 정규화한다.
 *
 * ⚠️ Swagger에 로그인 응답 스키마가 정의돼 있지 않아(`data`가 문서화되지 않음)
 *    필드명을 확정하지 못했다. 흔한 표기를 모두 받아들이도록 열어 두었으니,
 *    백엔드에서 실제 필드명이 확인되면 이 함수만 좁히면 된다.
 */
function toTokens(data: unknown): AuthTokens | null {
  if (typeof data === 'string') return { accessToken: data, refreshToken: null };
  if (typeof data !== 'object' || data === null) return null;
  const d = data as Record<string, unknown>;
  const access = d.accessToken ?? d.access_token ?? d.token ?? d.jwt;
  const refresh = d.refreshToken ?? d.refresh_token ?? null;
  if (typeof access !== 'string') return null;
  return {
    accessToken: access,
    refreshToken: typeof refresh === 'string' ? refresh : null,
  };
}

export type LoginResult = (Ok & { tokens: AuthTokens }) | Fail<'invalid' | 'malformed'>;

/** 로그인. POST /api/auth/login */
export async function login(email: string, password: string): Promise<LoginResult> {
  try {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    const tokens = toTokens(data);
    if (!tokens) {
      return {
        ok: false,
        reason: 'malformed',
        message: '로그인 응답을 해석하지 못했어요. 잠시 후 다시 시도해 주세요.',
      };
    }
    return { ok: true, tokens };
  } catch (e) {
    return toFail(e, {
      401: { reason: 'invalid', message: '이메일 또는 비밀번호가 올바르지 않아요.' },
    });
  }
}

/** 토큰 재발급(회전). POST /api/auth/refresh */
export async function refresh(refreshToken: string): Promise<AuthTokens | null> {
  try {
    return toTokens(
      await apiRequest('/api/auth/refresh', {
        method: 'POST',
        body: { refreshToken },
      }),
    );
  } catch {
    return null;
  }
}

/**
 * 로그아웃. POST /api/auth/logout
 *
 * 서버 호출이 실패해도 앱은 로그아웃 처리를 진행해야 하므로 결과를 던지지 않는다.
 * (토큰이 이미 만료됐을 때 로그아웃이 막히면 사용자가 빠져나갈 방법이 없다)
 */
export async function logout(token: string | null): Promise<void> {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST', token });
  } catch {
    // 무시 — 로컬 세션 삭제는 호출부에서 어차피 수행한다
  }
}

// ─────────────────────────────────────────────────────────────
// 비밀번호 재설정 (로그인 전 · 비밀번호 찾기 플로우)
// ─────────────────────────────────────────────────────────────

export type PasswordSendCodeResult = Ok | Fail<'not_found' | 'rate_limited'>;

/** 비밀번호 재설정 인증코드 발송. POST /api/auth/password/send-code */
export async function sendPasswordCode(email: string): Promise<PasswordSendCodeResult> {
  try {
    await apiRequest('/api/auth/password/send-code', { method: 'POST', body: { email } });
    return { ok: true };
  } catch (e) {
    return toFail(e, {
      404: { reason: 'not_found', message: '가입되지 않은 이메일이에요.' },
      429: { reason: 'rate_limited', message: '잠시 후 다시 시도해 주세요.' },
    });
  }
}

/** 비밀번호 재설정 인증코드 확인. POST /api/auth/password/verify-code */
export async function verifyPasswordCode(
  email: string,
  code: string,
): Promise<VerifyCodeResult> {
  try {
    await apiRequest('/api/auth/password/verify-code', {
      method: 'POST',
      body: { email, code },
    });
    return { ok: true };
  } catch (e) {
    return toFail(e, {
      400: { reason: 'invalid', message: '인증번호가 올바르지 않아요.' },
    });
  }
}

export type PasswordResetResult = Ok | Fail<'not_verified'>;

/** 비밀번호 재설정. POST /api/auth/password/reset (인증코드 확인 후 호출) */
export async function resetPassword(
  email: string,
  newPassword: string,
): Promise<PasswordResetResult> {
  try {
    await apiRequest('/api/auth/password/reset', {
      method: 'POST',
      body: { email, newPassword },
    });
    return { ok: true };
  } catch (e) {
    return toFail(e, {
      400: { reason: 'not_verified', message: '이메일 인증을 먼저 완료해 주세요.' },
    });
  }
}

// ─────────────────────────────────────────────────────────────
// 내 계정 (로그인 후)
// ─────────────────────────────────────────────────────────────

export type MyProfile = {
  userId: number;
  email: string;
  nickname: string;
  profileImageUrl: string | null;
};

/** 내 프로필 조회. GET /api/users/me */
export async function getMyProfile(token: string | null): Promise<MyProfile | null> {
  try {
    return await apiRequest<MyProfile>('/api/users/me', { token });
  } catch {
    return null;
  }
}

export type ProfileImageFile = {
  uri: string;
  name: string;
  mimeType: string;
};

export type UploadProfileImageResult =
  | (Ok & { profileImageUrl: string })
  | Fail<'invalid_file'>;

/** 프로필 이미지 업로드/변경. POST /api/users/me/profile-image (최대 5MB 이미지) */
export async function uploadProfileImage(
  token: string | null,
  file: ProfileImageFile,
): Promise<UploadProfileImageResult> {
  const imageFile = new File(file.uri);
  const form = new FormData();
  form.append('image', imageFile, file.name);

  try {
    const data = await apiRequest<{ profileImageUrl?: unknown }>(
      '/api/users/me/profile-image',
      { method: 'POST', token, body: form },
    );
    if (typeof data?.profileImageUrl !== 'string') {
      return {
        ok: false,
        reason: 'invalid_file',
        message: '업로드된 이미지 주소를 확인하지 못했어요.',
      };
    }
    return { ok: true, profileImageUrl: data.profileImageUrl };
  } catch (e) {
    console.error('[profile-image] upload failed', {
      error: e,
      uri: file.uri,
      name: file.name,
      mimeType: file.mimeType,
    });
    return toFail<'invalid_file'>(e);
  }
}

export type ChangePasswordResult = Ok | Fail<'wrong_password'>;

/**
 * 비밀번호 변경. PATCH /api/users/me/password
 *
 * 새 비밀번호 형식(영문+숫자 8자 이상)은 호출 전에 앱이 이미 검사한다.
 * 그래서 여기 400은 사실상 "현재 비밀번호가 틀렸다"는 뜻이다.
 */
export async function changePassword(
  token: string | null,
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> {
  try {
    await apiRequest('/api/users/me/password', {
      method: 'PATCH',
      token,
      body: { currentPassword, newPassword },
    });
    return { ok: true };
  } catch (e) {
    return toFail(e, {
      400: { reason: 'wrong_password', message: '현재 비밀번호가 올바르지 않아요.' },
    });
  }
}

export type WithdrawResult = Ok | Fail<'wrong_password'>;

/** 회원탈퇴. DELETE /api/users/me */
export async function withdraw(
  token: string | null,
  password: string,
): Promise<WithdrawResult> {
  try {
    await apiRequest('/api/users/me', {
      method: 'DELETE',
      token,
      body: { password },
    });
    return { ok: true };
  } catch (e) {
    return toFail(e, {
      400: { reason: 'wrong_password', message: '비밀번호가 올바르지 않아요.' },
    });
  }
}
