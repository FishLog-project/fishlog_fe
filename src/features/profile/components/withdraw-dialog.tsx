import { useState } from 'react';

import { AppDialog, FormField } from '@/components/common';
import { UnderlineInput } from '@/features/auth';

type Props = {
  visible: boolean;
  loading: boolean;
  error: string | null;
  onConfirm: (password: string) => void;
  onCancel: () => void;
  onInput: () => void;
};

export function WithdrawDialog({
  visible,
  loading,
  error,
  onConfirm,
  onCancel,
  onInput,
}: Props) {
  const [password, setPassword] = useState('');

  const close = () => {
    if (loading) return;
    setPassword('');
    onCancel();
  };

  const confirm = () => onConfirm(password);

  return (
    <AppDialog
      visible={visible}
      title="정말 탈퇴하시겠어요?"
      message={'탈퇴하면 도감·낚시 기록·저장 목록이 모두 삭제되고\n되돌릴 수 없어요.'}
      buttonLabel="탈퇴하기"
      confirmDisabled={password.length === 0}
      loading={loading}
      onConfirm={confirm}
      onCancel={close}>
      <FormField error={error}>
        <UnderlineInput
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            onInput();
          }}
          placeholder="현재 비밀번호"
          secureTextEntry
          passwordToggle
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={confirm}
          accessibilityLabel="현재 비밀번호"
        />
      </FormField>
    </AppDialog>
  );
}
