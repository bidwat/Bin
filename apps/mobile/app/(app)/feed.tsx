import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ItemType, type Item } from '@bin/shared';

import { CaptureBar } from '../../src/components/CaptureBar';
import { ItemCard } from '../../src/components/ItemCard';
import { createItem, deleteItem, fetchItems } from '../../src/lib/api';
import { supabase } from '../../src/lib/supabase';

export default function FeedScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedType, setSelectedType] = useState<Item['type']>(null);
  const [refreshing, setRefreshing] = useState(false);

  function buildPendingItem(source: 'voice' | 'image', message: string): Item {
    return {
      id: `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: 'pending',
      rawInput: message,
      cleanedText: null,
      source,
      type: null,
      actionability: null,
      entities: {},
      clusterIds: [],
      subClusterId: null,
      resurfacingScore: 1,
      processed: false,
      reminderStatus: null,
      reminderAt: null,
      createdAt: new Date().toISOString(),
      lastSurfacedAt: null,
    };
  }

  const loadItems = useCallback(async () => {
    setRefreshing(true);
    try {
      const payload = await fetchItems(selectedType);
      setItems(payload.items);
    } finally {
      setRefreshing(false);
    }
  }, [selectedType]);

  const visibleItems = useMemo(
    () =>
      selectedType ? items.filter((item) => item.type === selectedType) : items,
    [items, selectedType],
  );

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    const channel = supabase
      .channel('mobile-items')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items' },
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
        data={visibleItems}
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filters}
            >
              <FilterChip
                active={selectedType === null}
                label="All"
                onPress={() => setSelectedType(null)}
              />
              {Object.values(ItemType).map((value) => (
                <FilterChip
                  key={value}
                  active={selectedType === value}
                  label={`${value[0]?.toUpperCase()}${value.slice(1)}`}
                  onPress={() => setSelectedType(value)}
                />
              ))}
            </ScrollView>
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
        onAsyncCaptureStart={(source, label) => {
          const pendingItem = buildPendingItem(source, label);
          setItems((current) => [pendingItem, ...current]);
          return pendingItem.id;
        }}
        onAsyncCaptureResolved={(pendingId, item) => {
          setItems((current) => [
            item,
            ...current.filter(
              (entry) => entry.id !== pendingId && entry.id !== item.id,
            ),
          ]);
        }}
        onAsyncCaptureRejected={(pendingId) => {
          setItems((current) =>
            current.filter((entry) => entry.id !== pendingId),
          );
          void loadItems();
        }}
      />
    </View>
  );
}

function FilterChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.filterChip, active ? styles.filterChipActive : null]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterChipText,
          active ? styles.filterChipTextActive : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
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
  filters: {
    gap: 8,
    paddingTop: 8,
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
  filterChip: {
    borderRadius: 999,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  filterChipText: {
    color: '#334155',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
});
