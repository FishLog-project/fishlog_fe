import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const SESSION_KEY = 'fishlog.session';

type AuthState = {
  /** 로그인 세션 토큰 (없으면 비로그인) */
  token: string | null;
  /** SecureStore 초기 로드 완료 여부 */
  isReady: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

/**
 * 앱 전역 로그인 세션을 관리한다.
 * 토큰은 expo-secure-store(키체인/키스토어)에 안전 저장.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setToken(await SecureStore.getItemAsync(SESSION_KEY));
      } catch {
        // 저장소 접근 실패 시 비로그인으로 취급
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const signIn = useCallback(async (next: string) => {
    await SecureStore.setItemAsync(SESSION_KEY, next);
    setToken(next);
  }, []);

  const signOut = useCallback(async () => {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    setToken(null);
  }, []);

  const value = useMemo(
    () => ({ token, isReady, signIn, signOut }),
    [token, isReady, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
