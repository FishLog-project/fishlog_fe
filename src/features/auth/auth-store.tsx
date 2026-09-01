import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import * as authApi from './api';
import type { AuthTokens } from './api';

const SESSION_KEY = 'fishlog.session';
const GUEST_KEY = 'fishlog.guest';

/** 예전 빌드가 게스트를 토큰처럼 저장하던 값. 로드 시 플래그로 옮긴다. */
const LEGACY_GUEST_TOKEN = 'guest';

type AuthState = {
  /** API 호출에 붙일 access 토큰 (없으면 비로그인) */
  token: string | null;
  /** 로그인 없이 둘러보는 중인지 */
  isGuest: boolean;
  /** 토큰이든 게스트든 앱 본문에 들어갈 수 있는 상태인지 */
  canEnterApp: boolean;
  /** SecureStore 초기 로드 완료 여부 */
  isReady: boolean;
  signIn: (tokens: AuthTokens) => Promise<void>;
  /** 로그인 없이 둘러보기 */
  continueAsGuest: () => Promise<void>;
  /** 서버 로그아웃까지 시도한 뒤 로컬 세션을 지운다 */
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

/**
 * 앱 전역 로그인 세션을 관리한다.
 * 토큰은 expo-secure-store(키체인/키스토어)에 JSON으로 안전 저장한다.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(SESSION_KEY);

        // 예전 빌드는 게스트도 토큰 자리에 넣었다. 그대로 두면 게스트가
        // 로그인 사용자로 보이므로 로드 시점에 플래그로 옮긴다.
        if (stored === LEGACY_GUEST_TOKEN) {
          await SecureStore.deleteItemAsync(SESSION_KEY);
          await SecureStore.setItemAsync(GUEST_KEY, '1');
          setIsGuest(true);
          return;
        }

        setTokens(parseStoredTokens(stored));
        setIsGuest((await SecureStore.getItemAsync(GUEST_KEY)) === '1');
      } catch {
        // 저장소 접근 실패 시 비로그인으로 취급
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const signIn = useCallback(async (next: AuthTokens) => {
    try {
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(next));
      // 게스트로 둘러보다 로그인하면 게스트 상태는 끝난다.
      await SecureStore.deleteItemAsync(GUEST_KEY);
    } catch {
      // 웹 미리보기: SecureStore 웹 구현이 빈 스텁이라 저장이 불가능하다.
      // 저장 실패로 로그인 자체를 막지 않는다 — 상태는 메모리로 유지되고
      // (새로고침하면 풀림) 네이티브에서는 정상 저장된다.
    }
    setTokens(next);
    setIsGuest(false);
  }, []);

  const continueAsGuest = useCallback(async () => {
    try {
      await SecureStore.setItemAsync(GUEST_KEY, '1');
    } catch {
      // 웹 미리보기 — 위 signIn 주석 참고
    }
    setIsGuest(true);
  }, []);

  const signOut = useCallback(async () => {
    // 서버 로그아웃이 실패해도(토큰 만료 등) 로컬 세션은 반드시 지운다.
    await authApi.logout(tokens?.accessToken ?? null);
    try {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      await SecureStore.deleteItemAsync(GUEST_KEY);
    } catch {
      // 웹 미리보기 — 위 signIn 주석 참고
    }
    setTokens(null);
    setIsGuest(false);
  }, [tokens]);

  const token = tokens?.accessToken ?? null;

  const value = useMemo(
    () => ({
      token,
      isGuest,
      canEnterApp: token !== null || isGuest,
      isReady,
      signIn,
      continueAsGuest,
      signOut,
    }),
    [token, isGuest, isReady, signIn, continueAsGuest, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** 저장된 세션 문자열을 토큰 쌍으로 되돌린다. 형식이 깨졌으면 비로그인 취급. */
function parseStoredTokens(stored: string | null): AuthTokens | null {
  if (!stored) return null;
  try {
    const parsed: unknown = JSON.parse(stored);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as AuthTokens).accessToken === 'string'
    ) {
      const t = parsed as AuthTokens;
      return { accessToken: t.accessToken, refreshToken: t.refreshToken ?? null };
    }
  } catch {
    // JSON이 아니면 아래로 흘려보낸다
  }
  return null;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
