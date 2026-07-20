import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';

type PlaceholderCardProps = {
  label: string;
  title: string;
  description: string;
};

export function PlaceholderCard({ label, title, description }: PlaceholderCardProps) {
  return (
    <View
      accessible
      accessibilityLabel={`${title}. ${description}`}
      style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    backgroundColor: Colors.surface,
  },
  label: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  description: {
    maxWidth: 360,
    color: Colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
