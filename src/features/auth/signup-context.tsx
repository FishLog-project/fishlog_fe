import { createContext, useContext, useMemo, useState } from 'react';

/** 회원가입 마법사가 여러 스텝에 걸쳐 모으는 입력값 */
type SignupData = {
  email: string;
  password: string;
  nickname: string;
};

type SignupContextValue = SignupData & {
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  setNickname: (v: string) => void;
  reset: () => void;
};

const SignupContext = createContext<SignupContextValue | null>(null);

/**
 * 회원가입 스텝(email → verify → password → nickname → complete) 동안
 * 입력값을 공유하기 위한 컨텍스트. signup 그룹 레이아웃에서 감싼다.
 */
export function SignupProvider({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');

  const value = useMemo<SignupContextValue>(
    () => ({
      email,
      password,
      nickname,
      setEmail,
      setPassword,
      setNickname,
      reset: () => {
        setEmail('');
        setPassword('');
        setNickname('');
      },
    }),
    [email, password, nickname],
  );

  return <SignupContext.Provider value={value}>{children}</SignupContext.Provider>;
}

export function useSignup() {
  const ctx = useContext(SignupContext);
  if (!ctx) throw new Error('useSignup must be used within <SignupProvider>');
  return ctx;
}
