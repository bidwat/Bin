import { formatDistanceToNow } from 'date-fns';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Item } from '@bin/shared';

export function ItemCard({
  item,
  onDelete,
}: {
  item: Item;
  onDelete: (id: string) => void;
}) {
  return (
    <View style={styles.cardShell}>
      <Link href={`/(app)/item/${item.id}`} asChild>
        <Pressable style={styles.card}>
          <View style={styles.badges}>
            <Text style={styles.source}>{item.source}</Text>
            {item.type ? <Text style={styles.type}>{item.type}</Text> : null}
          </View>
          <Text style={styles.body}>
            {item.cleanedText?.trim() || item.rawInput}
          </Text>
          <Text style={styles.meta}>
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </Text>
        </Pressable>
      </Link>
      <Pressable style={styles.deleteAction} onPress={() => onDelete(item.id)}>
        <Text style={styles.deleteText}>Delete</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  cardShell: {
    marginBottom: 12,
    gap: 10,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    gap: 12,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  source: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  type: {
    backgroundColor: '#e2e8f0',
    color: '#334155',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  body: {
    color: '#0f172a',
    fontSize: 16,
    lineHeight: 24,
  },
  meta: {
    color: '#64748b',
    fontSize: 12,
  },
  deleteAction: {
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
    minWidth: 96,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  deleteText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
