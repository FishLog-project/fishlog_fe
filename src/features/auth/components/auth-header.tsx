import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  /** 가운데 타이틀 (예: "회원가입", "가입 완료") */
  title?: string;
  /** 뒤로가기 버튼 노출 여부 (기본 true) */
  showBack?: boolean;
};

/** 회원가입 플로우 공통 상단 헤더 (← + 타이틀). */
export function AuthHeader({ title, showBack = true }: Props) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      {showBack ? (
        <Pressable
          hitSlop={12}
          onPress={() => router.back()}
          style={styles.back}>
          <Ionicons name="chevron-back" size={26} color="#111111" />
        </Pressable>
      ) : (
        <View style={styles.back} />
      )}
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.back} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '500', color: '#1C1C1C' },
});
