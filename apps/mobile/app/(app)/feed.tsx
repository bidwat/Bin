import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import type { Item } from '@bin/shared';

import { CaptureBar } from '../../src/components/CaptureBar';
import { ItemCard } from '../../src/components/ItemCard';
import { createItem, deleteItem, fetchItems } from '../../src/lib/api';
import { supabase } from '../../src/lib/supabase';

export default function FeedScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadItems = useCallback(async () => {
    setRefreshing(true);
    try {
      const payload = await fetchItems();
      setItems(payload.items);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    const channel = supabase
      .channel('mobile-items')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'items' },
        () => {
          void loadItems();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadItems]);

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadItems()}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Feed</Text>
            <Text style={styles.title}>Everything you have captured</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            onDelete={(id) => {
              setItems((current) => current.filter((entry) => entry.id !== id));
              void deleteItem(id).catch(() => void loadItems());
            }}
          />
        )}
      />
      <CaptureBar
        onCapture={async (text) => {
          const { item } = await createItem(text);
          setItems((current) => [item, ...current]);
        }}
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
    paddingBottom: 120,
  },
  header: {
    paddingBottom: 12,
    gap: 8,
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
});
