import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import type { Cluster } from '@bin/shared';

import { CollectionCard } from '../../src/components/CollectionCard';
import { fetchCollections } from '../../src/lib/api';

export default function CollectionsScreen() {
  const router = useRouter();
  const [collections, setCollections] = useState<Cluster[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadCollections = useCallback(async () => {
    setRefreshing(true);
    try {
      setCollections(await fetchCollections());
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadCollections();
    }, [loadCollections]),
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={collections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadCollections()}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Collections</Text>
            <Text style={styles.title}>Themes Bin found for you</Text>
            <Text style={styles.subtitle}>
              These are soft folders built from semantic similarity.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <CollectionCard
            cluster={item}
            onPress={() =>
              router.push({
                pathname: '/(app)/collection/[id]',
                params: { id: item.id },
              })
            }
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              Collections appear once Bin has enough processed material to
              cluster.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f4ec',
  },
  list: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
  },
  header: {
    gap: 8,
    paddingBottom: 12,
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
  subtitle: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 21,
  },
  emptyState: {
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    padding: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
  },
});
