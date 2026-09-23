import { apiRequest } from '@/lib/api/client';
import { type Fail, type Ok, toFail } from '@/lib/api/result';

export type ChangePasswordResult = Ok | Fail<'wrong_password'>;

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
  } catch (error) {
    return toFail(error, {
      400: { reason: 'wrong_password', message: '현재 비밀번호가 올바르지 않아요.' },
    });
  }
}

export type WithdrawResult = Ok | Fail<'wrong_password'>;

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
  } catch (error) {
    return toFail(error, {
      400: { reason: 'wrong_password', message: '비밀번호가 올바르지 않아요.' },
    });
  }
}
