import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { Cluster, Item } from '@bin/shared';

import { CollectionCard } from '../../../src/components/CollectionCard';
import { ItemCard } from '../../../src/components/ItemCard';
import { fetchCollectionView, updateClusterLabel } from '../../../src/lib/api';

export default function CollectionDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [childClusters, setChildClusters] = useState<Cluster[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Cluster[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [labelDraft, setLabelDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const activeCluster = useMemo(() => cluster, [cluster]);

  const loadView = useCallback(async () => {
    const payload = await fetchCollectionView(params.id);
    setCluster(payload.cluster);
    setChildClusters(payload.childClusters);
    setBreadcrumbs(payload.breadcrumbs);
    setItems(payload.items);
    setLabelDraft(payload.cluster.label);
  }, [params.id]);

  useFocusEffect(
    useCallback(() => {
      void loadView();
    }, [loadView]),
  );

  async function saveLabel() {
    if (!activeCluster) {
      return;
    }

    const nextLabel = labelDraft.trim();

    if (!nextLabel || nextLabel === activeCluster.label) {
      return;
    }

    setIsSaving(true);

    try {
      const updated = await updateClusterLabel(activeCluster.id, nextLabel);
      setCluster(updated);
      setBreadcrumbs((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
      setLabelDraft(updated.label);
    } catch (error) {
      Alert.alert(
        'Unable to update collection',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!cluster || !activeCluster) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.backLink}>Collections</Text>
            </Pressable>
            {breadcrumbs.length > 1 ? (
              <Text style={styles.breadcrumb}>
                {breadcrumbs.map((entry) => entry.label).join(' / ')}
              </Text>
            ) : null}
            <TextInput
              value={labelDraft}
              onChangeText={setLabelDraft}
              style={styles.titleInput}
            />
            <View style={styles.actionsRow}>
              <Text style={styles.itemCount}>
                {items.length} item{items.length === 1 ? '' : 's'}
              </Text>
              <Pressable
                style={styles.saveButton}
                onPress={() => void saveLabel()}
                disabled={isSaving}
              >
                <Text style={styles.saveButtonText}>
                  {isSaving ? 'Saving...' : 'Save label'}
                </Text>
              </Pressable>
            </View>
            {childClusters.length > 0 ? (
              <View style={styles.subclustersSection}>
                <Text style={styles.subclustersEyebrow}>Child Collections</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.subclustersRail}>
                    {childClusters.map((childCluster) => (
                      <CollectionCard
                        key={childCluster.id}
                        cluster={childCluster}
                        compact
                        onPress={() =>
                          router.push({
                            pathname: '/(app)/collection/[id]',
                            params: { id: childCluster.id },
                          })
                        }
                      />
                    ))}
                  </View>
                </ScrollView>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => <ItemCard item={item} onDelete={() => {}} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No items in this collection yet.
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
    gap: 10,
    paddingBottom: 12,
  },
  backLink: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  breadcrumb: {
    color: '#64748b',
    fontSize: 13,
  },
  titleInput: {
    borderRadius: 20,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  itemCount: {
    color: '#64748b',
    fontSize: 13,
  },
  saveButton: {
    borderRadius: 999,
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  subclustersSection: {
    gap: 10,
    marginTop: 8,
  },
  subclustersEyebrow: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  subclustersRail: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 4,
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
  },
});
