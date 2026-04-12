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

import { Actionability, ItemType, type Cluster, type Item } from '@bin/shared';

import { CollectionCard } from '../../src/components/CollectionCard';
import { CaptureBar } from '../../src/components/CaptureBar';
import { FeedFilterDrawer } from '../../src/components/FeedFilterDrawer';
import { ItemCard } from '../../src/components/ItemCard';
import {
  createItem,
  deleteItem,
  fetchCollections,
  fetchItems,
} from '../../src/lib/api';
import { supabase } from '../../src/lib/supabase';

export default function FeedScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [collections, setCollections] = useState<Cluster[]>([]);
  const [selectedType, setSelectedType] = useState<ItemType | null>(null);
  const [selectedActionability, setSelectedActionability] =
    useState<Actionability | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    string | null
  >(null);
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
      const [payload, nextCollections] = await Promise.all([
        fetchItems(selectedType, selectedActionability),
        fetchCollections(),
      ]);
      setItems(payload.items);
      setCollections(nextCollections);
    } finally {
      setRefreshing(false);
    }
  }, [selectedActionability, selectedType]);

  const activeFilterCount = useMemo(
    () =>
      [selectedType, selectedActionability, selectedCollectionId].filter(
        Boolean,
      ).length,
    [selectedActionability, selectedCollectionId, selectedType],
  );

  const visibleItems = useMemo(
    () =>
      items.filter((item) =>
        selectedCollectionId
          ? item.clusterIds.includes(selectedCollectionId)
          : true,
      ),
    [items, selectedCollectionId],
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
                {selectedCollectionId ? ' · Collection on' : ''}
              </Text>
            </Pressable>
            {collections.length > 0 ? (
              <View style={styles.collectionsSection}>
                <View style={styles.collectionsHeader}>
                  <Text style={styles.collectionsEyebrow}>Collections</Text>
                  {selectedCollectionId ? (
                    <Pressable onPress={() => setSelectedCollectionId(null)}>
                      <Text style={styles.clearCollectionText}>Clear</Text>
                    </Pressable>
                  ) : null}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.collectionsRail}>
                    {collections.map((collection) => (
                      <CollectionCard
                        key={collection.id}
                        cluster={collection}
                        compact
                        active={selectedCollectionId === collection.id}
                        onPress={() =>
                          setSelectedCollectionId((current) =>
                            current === collection.id ? null : collection.id,
                          )
                        }
                      />
                    ))}
                  </View>
                </ScrollView>
              </View>
            ) : null}
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
  collectionsSection: {
    gap: 10,
    marginTop: 12,
  },
  collectionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collectionsEyebrow: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  clearCollectionText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700',
  },
  collectionsRail: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 4,
  },
});
