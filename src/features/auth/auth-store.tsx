import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { ApiError, installApiSessionResolver } from '@/lib/api/client';

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
  /** 로컬 세션을 먼저 지우고 서버 로그아웃도 시도한다 */
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

type Session = {
  tokens: AuthTokens;
  // 같은 세션의 기존 dataSource가 캡처한 토큰도 회전 후에는 최신 토큰으로 보낸다.
  accessTokens: Set<string>;
  refreshing?: Promise<string | null>;
};

// 진행 중인 SecureStore 쓰기는 취소할 수 없으므로 새 세션 쓰기가 반드시 뒤에 오게 한다.
let storageWrites = Promise.resolve();

function persistSession(tokens: AuthTokens | null, guest = false): Promise<void> {
  storageWrites = storageWrites.then(async () => {
    await Promise.allSettled([
      Promise.resolve().then(() => tokens
        ? SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(tokens))
        : SecureStore.deleteItemAsync(SESSION_KEY)),
      Promise.resolve().then(() => guest
        ? SecureStore.setItemAsync(GUEST_KEY, '1')
        : SecureStore.deleteItemAsync(GUEST_KEY)),
    ]);
  });
  return storageWrites;
}

/**
 * 앱 전역 로그인 세션을 관리한다.
 * 토큰은 expo-secure-store(키체인/키스토어)에 JSON으로 안전 저장한다.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const session = useRef<Session | null>(null);
  const revision = useRef(0);

  const changeSession = useCallback((next: AuthTokens | null, guest = false) => {
    revision.current += 1;
    session.current = next ? { tokens: next, accessTokens: new Set([next.accessToken]) } : null;
    setTokens(next);
    setIsGuest(guest);
  }, []);

  useEffect(() => {
    let active = true;
    const startupRevision = revision.current;
    const uninstall = installApiSessionResolver((accessToken) => {
      const current = session.current;
      if (!current || !current.accessTokens.has(accessToken)) return null;
      const isCurrent = () => active && session.current === current;
      const expire = (rejectedToken: string) => {
        if (!isCurrent() || current.tokens.accessToken !== rejectedToken) return;
        changeSession(null);
        void persistSession(null);
      };
      return {
        token: current.tokens.accessToken,
        isCurrent,
        expire,
        refresh: async (rejectedToken) => {
          if (!isCurrent()) return null;
          if (current.tokens.accessToken !== rejectedToken) return current.tokens.accessToken;
          const refreshToken = current.tokens.refreshToken;
          if (!refreshToken) {
            expire(rejectedToken);
            return null;
          }
          current.refreshing ??= (async () => {
            const result = await authApi.refresh(refreshToken);
            if (!isCurrent()) return null;
            if (!result.ok) {
              if (result.reason === 'invalid') {
                expire(rejectedToken);
                return null;
              }
              // 오프라인/5xx는 만료 증거가 아니다. 세션을 보존하고 사용자가 재시도할 수 있게 한다.
              throw new ApiError(503, result.message);
            }
            current.tokens = result.tokens;
            current.accessTokens.add(result.tokens.accessToken);
            setTokens(result.tokens);
            await persistSession(result.tokens);
            return isCurrent() ? result.tokens.accessToken : null;
          })().finally(() => { current.refreshing = undefined; });
          return current.refreshing;
        },
      };
    });

    (async () => {
      try {
        await storageWrites;
        const [stored, guest] = await Promise.all([
          SecureStore.getItemAsync(SESSION_KEY),
          SecureStore.getItemAsync(GUEST_KEY),
        ]);

        if (!active || startupRevision !== revision.current) return;
        if (stored === LEGACY_GUEST_TOKEN) {
          changeSession(null, true);
          await persistSession(null, true);
          return;
        }

        const restored = parseStoredTokens(stored);
        changeSession(restored, !restored && guest === '1');
        // 매 시작마다 회전시키지 않는다. 보호 API의 실제 401에서만 단일 갱신한다.
      } catch {
        // 저장소 접근 실패 시 비로그인으로 취급
      } finally {
        if (active) setIsReady(true);
      }
    })();

    return () => {
      active = false;
      revision.current += 1;
      session.current = null;
      uninstall();
    };
  }, [changeSession]);

  const signIn = useCallback(async (next: AuthTokens) => {
    changeSession(next);
    await persistSession(next);
  }, [changeSession]);

  const continueAsGuest = useCallback(async () => {
    changeSession(null, true);
    await persistSession(null, true);
  }, [changeSession]);

  const signOut = useCallback(async () => {
    const accessToken = session.current?.tokens.accessToken ?? null;
    changeSession(null);
    // 대기 중인 응답을 즉시 무효화한다. await 뒤에 새 로그인 상태를 다시 지우지 않는다.
    await Promise.all([persistSession(null), authApi.logout(accessToken)]);
  }, [changeSession]);

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
      typeof (parsed as AuthTokens).accessToken === 'string' &&
      (parsed as AuthTokens).accessToken.trim() !== ''
    ) {
      const t = parsed as AuthTokens;
      return { accessToken: t.accessToken, refreshToken: typeof t.refreshToken === 'string' && t.refreshToken.trim() ? t.refreshToken : null };
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
