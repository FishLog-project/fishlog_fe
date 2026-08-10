import { createContext, useContext, useMemo, useState } from 'react';

/** 비밀번호 찾기 스텝들이 공유하는 입력값 */
type PasswordResetData = {
  email: string;
};

type PasswordResetContextValue = PasswordResetData & {
  setEmail: (v: string) => void;
  reset: () => void;
};

const PasswordResetContext = createContext<PasswordResetContextValue | null>(null);

/**
 * 비밀번호 찾기 스텝(email → verify → reset → complete) 동안 이메일을 공유한다.
 *
 * 새 비밀번호는 여기에 담지 않는다. 마지막 스텝에서 입력받아 그 자리에서 전송하고
 * 버리는 편이, 메모리에 평문 비밀번호가 여러 화면에 걸쳐 남지 않아 안전하다.
 */
export function PasswordResetProvider({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState('');

  const value = useMemo<PasswordResetContextValue>(
    () => ({ email, setEmail, reset: () => setEmail('') }),
    [email],
  );

  return (
    <PasswordResetContext.Provider value={value}>
      {children}
    </PasswordResetContext.Provider>
  );
}

export function usePasswordReset() {
  const ctx = useContext(PasswordResetContext);
  if (!ctx)
    throw new Error('usePasswordReset must be used within <PasswordResetProvider>');
  return ctx;
}
