import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { FormError } from './form-error';

type Props = {
  children: ReactNode;
  error?: string | null;
  gap?: number;
};

/** 입력 요소와 바로 아래의 검증 메시지를 같은 간격으로 배치한다. */
export function FormField({ children, error, gap = 12 }: Props) {
  return (
    <View style={[styles.container, { gap }]}>
      {children}
      <FormError message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
});
