import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, Components, Typography } from '@/constants/theme';

type ScreenStateProps = {
  variant: 'loading' | 'empty' | 'error';
  /** error 변형에서만 노출되는 재시도 핸들러 */
  onRetry?: () => void;
  actionLabel?: string;
  onAction?: () => void;
};

const copy = {
  loading: {
    title: '불러오는 중이에요',
    description: '잠시만 기다려 주세요.',
  },
  empty: {
    title: '아직 표시할 기록이 없어요',
    description: '',
  },
  error: {
    title: '정보를 불러오지 못했어요',
    description: '네트워크 상태를 확인하고 다시 시도해 주세요.',
  },
} as const;

/**
 * Common/ScreenState — 로딩·빈 화면·오류를 한 벌로 처리하는 카드.
 * 목록/상세 화면이 데이터를 못 채울 때 본문 자리에 그대로 끼워 넣는다.
 */
export function ScreenState({ variant, onRetry, actionLabel, onAction }: ScreenStateProps) {
  const state = copy[variant];
  const buttonLabel = variant === 'error' && onRetry ? '다시 시도' : actionLabel;
  const handlePress = variant === 'error' && onRetry ? onRetry : onAction;

  return (
    <View style={styles.card}>
      {variant === 'loading' ? (
        <ActivityIndicator
          accessibilityLabel="정보 불러오는 중"
          color={Brand.primary}
          size="small"
        />
      ) : (
        <View style={[styles.symbol, variant === 'error' && styles.errorSymbol]}>
          <Text style={[styles.symbolText, variant === 'error' && styles.errorSymbolText]}>
            {variant === 'empty' ? '○' : '!'}
          </Text>
        </View>
      )}
      <Text style={styles.title}>{state.title}</Text>
      {state.description ? <Text style={styles.description}>{state.description}</Text> : null}
      {buttonLabel && handlePress && (
        <Pressable
          accessibilityRole={variant === 'error' ? 'button' : 'link'}
          accessibilityLabel={buttonLabel}
          onPress={handlePress}
          style={({ pressed }) => [
            variant === 'error' ? styles.button : styles.link,
            pressed && styles.pressed,
          ]}>
          <Text style={variant === 'error' ? styles.buttonText : styles.linkText}>
            {buttonLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 190,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
    borderWidth: 1,
    borderColor: Components.state.border,
    borderRadius: Components.state.radius,
    backgroundColor: Components.state.surface,
  },
  symbol: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: Components.state.soft,
  },
  errorSymbol: {
    backgroundColor: Components.state.errorSoft,
  },
  symbolText: { ...Typography.badge, fontSize: 18, color: Brand.primary },
  errorSymbolText: {
    color: Components.state.error,
  },
  title: {
    ...Typography.cardTitle,
    fontSize: 17,
    color: Brand.textStrong,
    textAlign: 'center',
  },
  description: {
    ...Typography.caption,
    fontWeight: '400',
    maxWidth: 340,
    color: Brand.textMuted,
    lineHeight: 20,
    textAlign: 'center',
  },
  button: {
    minWidth: 112,
    minHeight: 48,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: Brand.primary,
  },
  pressed: {
    opacity: 0.7,
  },
  buttonText: { ...Typography.button, fontSize: 15, color: Components.button.label },
  link: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  linkText: {
    ...Typography.button,
    fontSize: 15,
    color: Brand.primary,
    textDecorationLine: 'underline',
  },
});
