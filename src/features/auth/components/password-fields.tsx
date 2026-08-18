import { StyleSheet, View } from 'react-native';

import { Components } from '@/constants/theme';

import { UnderlineInput } from './underline-input';

/**
 * 서버가 요구하는 비밀번호 형식 — 영문과 숫자를 모두 포함해 8자 이상.
 * (Swagger PasswordUpdateRequest / SignupRequest의 pattern을 그대로 옮긴 것)
 *
 * 길이만 검사하면 서버에서 400으로 튕기고, 사용자는 마지막 단계에 가서야
 * 알게 된다. 같은 규칙을 앱에서도 들고 있어야 하는 이유다.
 */
export const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*d).{8,}$/;
export const PASSWORD_MIN_LENGTH = 8;

type Check = {
  /** 두 칸 모두 조건을 만족해 다음 단계로 넘어가도 되는지 */
  valid: boolean;
  /** 사용자에게 보여줄 문구. 아직 판단할 때가 아니면 null */
  message: string | null;
};

/**
 * 비밀번호와 확인란을 함께 검사한다.
 *
 * 타이핑 도중에 잔소리하지 않으려고, 각 칸을 건드리기 시작한 뒤에만 문구를 낸다.
 * (빈 칸에 대고 "8자 이상" 이라고 띄우면 입력을 시작하기도 전에 빨간 글씨가 뜬다)
 */
export function checkPassword(password: string, confirm: string): Check {
  const wellFormed = PASSWORD_RE.test(password);
  const matches = password === confirm;

  if (password.length > 0 && !wellFormed) {
    return {
      valid: false,
      message: `영문과 숫자를 포함해 ${PASSWORD_MIN_LENGTH}자 이상으로 입력해 주세요.`,
    };
  }
  if (confirm.length > 0 && !matches) {
    return { valid: false, message: '비밀번호가 일치하지 않아요.' };
  }
  return { valid: wellFormed && matches && confirm.length > 0, message: null };
}

type Props = {
  password: string;
  onPasswordChange: (v: string) => void;
  confirm: string;
  onConfirmChange: (v: string) => void;
  placeholder?: string;
  confirmPlaceholder?: string;
  /** 확인란에서 완료를 눌렀을 때 */
  onSubmit?: () => void;
  autoFocus?: boolean;
};

/**
 * 비밀번호 입력 + 재입력 한 쌍 (회원가입 3단계 / 비밀번호 찾기 3단계 공용).
 *
 * 일치 여부 문구는 여기서 그리지 않는다. 화면이 checkPassword로 문구를 받아
 * StepScreen의 message(버튼 위 고정 자리)로 올린다 — 키보드에 가리지 않게.
 */
export function PasswordFields({
  password,
  onPasswordChange,
  confirm,
  onConfirmChange,
  placeholder = `비밀번호 (영문+숫자 ${PASSWORD_MIN_LENGTH}자 이상)`,
  confirmPlaceholder = '비밀번호 확인',
  onSubmit,
  autoFocus,
}: Props) {
  const { valid } = checkPassword(password, confirm);

  return (
    <View style={styles.fields}>
      <UnderlineInput
        value={password}
        onChangeText={onPasswordChange}
        placeholder={placeholder}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="newPassword"
        autoFocus={autoFocus}
        returnKeyType="next"
        accessibilityLabel="비밀번호"
      />

      <UnderlineInput
          value={confirm}
          onChangeText={onConfirmChange}
          placeholder={confirmPlaceholder}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
          returnKeyType="done"
        onSubmitEditing={() => valid && onSubmit?.()}
        accessibilityLabel="비밀번호 확인"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  /** 두 입력 사이 간격은 부모가 gap으로 준다 */
  fields: { gap: Components.authStep.fieldGap },
});
