import { formatDistanceToNow } from 'date-fns';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type Cluster, ItemType } from '@bin/shared';

export function CollectionCard({
  cluster,
  active = false,
  compact = false,
  onPress,
  onLongPress,
}: {
  cluster: Cluster;
  active?: boolean;
  compact?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.card,
        compact && styles.compactCard,
        active && styles.activeCard,
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.label, active && styles.activeLabel]}>
          {cluster.label}
        </Text>
        {cluster.typeScope ? (
          <Text
            style={[
              styles.badge,
              typeBadgeStyle(cluster.typeScope),
              active && styles.activeBadge,
            ]}
          >
            {cluster.typeScope}
          </Text>
        ) : null}
      </View>
      <View style={styles.metaRow}>
        <Text style={[styles.meta, active && styles.activeMeta]}>
          {cluster.memberCount} items
        </Text>
        <Text style={[styles.meta, active && styles.activeMeta]}>
          {formatDistanceToNow(new Date(cluster.lastUpdatedAt), {
            addSuffix: true,
          })}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: '#ffffff',
    padding: 16,
    gap: 12,
  },
  compactCard: {
    width: 240,
  },
  activeCard: {
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  label: {
    flex: 1,
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '700',
  },
  activeLabel: {
    color: '#ffffff',
  },
  badge: {
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  activeBadge: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    color: '#ffffff',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  meta: {
    color: '#64748b',
    fontSize: 12,
  },
  activeMeta: {
    color: '#cbd5e1',
  },
});

function typeBadgeStyle(typeScope: ItemType) {
  switch (typeScope) {
    case ItemType.Task:
      return { backgroundColor: '#e0f2fe', color: '#0c4a6e' };
    case ItemType.Reminder:
      return { backgroundColor: '#ffe4e6', color: '#881337' };
    case ItemType.Idea:
      return { backgroundColor: '#fef3c7', color: '#92400e' };
    case ItemType.Person:
      return { backgroundColor: '#dcfce7', color: '#166534' };
    case ItemType.Event:
      return { backgroundColor: '#ede9fe', color: '#5b21b6' };
    case ItemType.Reference:
      return { backgroundColor: '#ffedd5', color: '#9a3412' };
    case ItemType.Note:
    default:
      return { backgroundColor: '#e2e8f0', color: '#334155' };
  }
}
