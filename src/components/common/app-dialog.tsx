import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, View } from 'react-native';

import { Brand, Components, Typography } from '@/constants/theme';

import { PrimaryButton } from './primary-button';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  children?: ReactNode;
  buttonLabel?: string;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  loading?: boolean;
  cancelLabel?: string;
  onCancel?: () => void;
};

/** 앱 공통 단일 액션 팝업 — 딤 배경 + 흰색 라운드 카드 + PrimaryButton. */
export function AppDialog({
  visible,
  title,
  message,
  children,
  buttonLabel = '확인',
  onConfirm,
  confirmDisabled,
  loading,
  cancelLabel = '취소',
  onCancel,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onCancel ?? onConfirm}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        accessibilityViewIsModal>
        <View style={styles.card}>
          <View style={styles.content}>
            <View style={styles.copy}>
              <Text style={styles.title}>{title}</Text>
              {message ? <Text style={styles.message}>{message}</Text> : null}
            </View>
            {children}
          </View>
          <View style={[styles.actions, onCancel && styles.actionsRow]}>
            {onCancel ? (
              <View style={styles.actionButton}>
                <PrimaryButton
                  label={cancelLabel}
                  variant="outline"
                  onPress={onCancel}
                  disabled={loading}
                />
              </View>
            ) : null}
            <View style={onCancel && styles.actionButton}>
              <PrimaryButton
                label={buttonLabel}
                onPress={onConfirm}
                disabled={confirmDisabled}
                loading={loading}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: Components.dialog.scrim,
  },
  card: {
    width: '100%',
    maxWidth: 350,
    padding: 24,
    gap: 28,
    borderRadius: Components.dialog.radius,
    backgroundColor: Brand.background,
  },
  content: { gap: Components.dialog.gap },
  copy: { alignItems: 'center', gap: Components.dialog.tightGap },
  actions: { gap: Components.dialog.tightGap },
  actionsRow: { flexDirection: 'row' },
  actionButton: { flex: 1 },
  title: { ...Typography.sectionTitle, color: Brand.textStrong, textAlign: 'center' },
  message: { ...Typography.itemMeta, color: Brand.textMuted, textAlign: 'center' },
});
