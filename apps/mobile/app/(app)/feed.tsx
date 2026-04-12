import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Actionability, ItemType, type Item } from '@bin/shared';

import { CaptureBar } from '../../src/components/CaptureBar';
import { FeedFilterDrawer } from '../../src/components/FeedFilterDrawer';
import { ItemCard } from '../../src/components/ItemCard';
import { createItem, deleteItem, fetchItems } from '../../src/lib/api';
import { supabase } from '../../src/lib/supabase';

export default function FeedScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedType, setSelectedType] = useState<ItemType | null>(null);
  const [selectedActionability, setSelectedActionability] =
    useState<Actionability | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

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
      const payload = await fetchItems(selectedType, selectedActionability);
      setItems(payload.items);
    } finally {
      setRefreshing(false);
    }
  }, [selectedActionability, selectedType]);

  const activeFilterCount = useMemo(
    () => [selectedType, selectedActionability].filter(Boolean).length,
    [selectedActionability, selectedType],
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
            <Pressable
              style={styles.filterButton}
              onPress={() => setIsFilterOpen(true)}
            >
              <Text style={styles.filterButtonText}>
                Filters
                {activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </Text>
              <Text style={styles.filterSummary}>
                {selectedType
                  ? `${selectedType[0]?.toUpperCase()}${selectedType.slice(1)}`
                  : 'All types'}
                {' · '}
                {selectedActionability
                  ? `${selectedActionability[0]?.toUpperCase()}${selectedActionability.slice(1)}`
                  : 'All actionability'}
              </Text>
            </Pressable>
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
      <FeedFilterDrawer
        visible={isFilterOpen}
        selectedType={selectedType}
        selectedActionability={selectedActionability}
        onSelectType={setSelectedType}
        onSelectActionability={setSelectedActionability}
        onClose={() => setIsFilterOpen(false)}
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
  filterButton: {
    marginTop: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  filterButtonText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  filterSummary: {
    color: '#64748b',
    fontSize: 13,
  },
});
