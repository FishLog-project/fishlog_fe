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
    let active = true;

    (async () => {
      try {
        const [stored, guest] = await Promise.all([
          SecureStore.getItemAsync(SESSION_KEY),
          SecureStore.getItemAsync(GUEST_KEY),
        ]);

        // 예전 빌드는 게스트도 토큰 자리에 넣었다. 그대로 두면 게스트가
        // 로그인 사용자로 보이므로 로드 시점에 플래그로 옮긴다.
        if (stored === LEGACY_GUEST_TOKEN) {
          await SecureStore.deleteItemAsync(SESSION_KEY);
          await SecureStore.setItemAsync(GUEST_KEY, '1');
          if (active) setIsGuest(true);
          return;
        }

        const restored = parseStoredTokens(stored);
        if (!active) return;

        // 저장된 세션을 먼저 복원해 앱 시작을 네트워크 요청으로 막지 않는다.
        setTokens(restored);
        setIsGuest(!restored && guest === '1');

        // 회전 refresh 토큰이 있으면 홈 진입 뒤 백그라운드에서 최신 토큰으로 교체한다.
        if (restored?.refreshToken) {
          void authApi.refresh(restored.refreshToken).then(async (refreshed) => {
            if (!active) return;
            if (!refreshed) {
              // refresh 토큰까지 만료되면 낡은 access 토큰을 유지하지 않는다.
              // 서버 로그아웃은 이미 만료된 토큰으로 실패할 수 있으므로 로컬 세션을 직접 정리한다.
              setTokens(null);
              setIsGuest(false);
              await clearStoredSession();
              return;
            }
            setTokens(refreshed);
            try {
              await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(refreshed));
            } catch {
              // 메모리 세션은 유지하고 다음 앱 시작 때 다시 갱신한다.
            }
          });
        }
      } catch {
        // 저장소 접근 실패 시 비로그인으로 취급
      } finally {
        if (active) setIsReady(true);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (next: AuthTokens) => {
    // 보호 라우트가 홈 진입을 비로그인으로 오인하지 않도록 메모리 세션을 먼저 갱신한다.
    setTokens(next);
    setIsGuest(false);

    try {
      await Promise.all([
        SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(next)),
      // 게스트로 둘러보다 로그인하면 게스트 상태는 끝난다.
        SecureStore.deleteItemAsync(GUEST_KEY),
      ]);
    } catch (error) {
      // 저장 실패 시 메모리 상태도 원래대로 되돌려 세션 상태가 엇갈리지 않게 한다.
      setTokens(null);
      throw error;
    }
  }, []);

  const continueAsGuest = useCallback(async () => {
    setIsGuest(true);
    await SecureStore.setItemAsync(GUEST_KEY, '1');
  }, []);

  const signOut = useCallback(async () => {
    // 서버 로그아웃이 실패해도(토큰 만료 등) 로컬 세션은 반드시 지운다.
    await authApi.logout(tokens?.accessToken ?? null);
    await SecureStore.deleteItemAsync(SESSION_KEY);
    await SecureStore.deleteItemAsync(GUEST_KEY);
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

async function clearStoredSession() {
  await Promise.allSettled([
    SecureStore.deleteItemAsync(SESSION_KEY),
    SecureStore.deleteItemAsync(GUEST_KEY),
  ]);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
