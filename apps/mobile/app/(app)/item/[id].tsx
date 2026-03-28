import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ItemDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const itemId = useMemo(() => params.id ?? 'unknown', [params.id]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>Item</Text>
      <Text style={styles.title}>Detail view scaffold</Text>
      <Text style={styles.body}>
        Item id: {itemId}. Full editing lands in the next mobile refinement
        pass.
      </Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Phase 1.2 baseline</Text>
        <Text style={styles.body}>
          This route exists and is wired into Expo Router so item navigation is
          in place for the upcoming detail/edit work.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f8f4ec',
    padding: 24,
    gap: 12,
  },
  eyebrow: {
    color: '#b45309',
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '700',
    fontSize: 12,
  },
  title: {
    color: '#0f172a',
    fontSize: 30,
    fontWeight: '700',
  },
  body: {
    color: '#475569',
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    marginTop: 12,
  },
  cardTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
});
