import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, Components } from '@/constants/theme';

type ScreenStateProps = {
  variant: 'loading' | 'empty' | 'error';
  /** error 변형에서만 노출되는 재시도 핸들러 */
  onRetry?: () => void;
};

const copy = {
  loading: {
    title: '불러오는 중이에요',
    description: '잠시만 기다려 주세요.',
  },
  empty: {
    title: '아직 표시할 기록이 없어요',
    description: '첫 낚시 기록을 남기면 이곳에서 확인할 수 있어요.',
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
export function ScreenState({ variant, onRetry }: ScreenStateProps) {
  const state = copy[variant];

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
      <Text style={styles.description}>{state.description}</Text>
      {variant === 'error' && onRetry && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="다시 시도"
          onPress={onRetry}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <Text style={styles.buttonText}>다시 시도</Text>
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
  symbolText: {
    color: Brand.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  errorSymbolText: {
    color: Components.state.error,
  },
  title: {
    color: Brand.textStrong,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  description: {
    maxWidth: 340,
    color: Brand.textMuted,
    fontSize: 14,
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
  buttonText: {
    color: Components.button.label,
    fontSize: 15,
    fontWeight: '700',
  },
});
