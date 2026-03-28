import { useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'expo-router';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { Item } from '@bin/shared';

export function ItemCard({
  item,
  onDelete,
}: {
  item: Item;
  onDelete: (id: string) => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const maxReveal = -108;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
        Math.abs(gestureState.dx) > 8,
      onPanResponderMove: (_, gestureState) => {
        const next = Math.max(maxReveal, Math.min(0, gestureState.dx));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldOpen = gestureState.dx < -48;
        Animated.spring(translateX, {
          toValue: shouldOpen ? maxReveal : 0,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  function closeActions() {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }

  return (
    <View style={styles.cardShell}>
      <View style={styles.deleteTray}>
        <Pressable
          style={styles.deleteAction}
          onPress={() => {
            closeActions();
            onDelete(item.id);
          }}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </View>

      <Animated.View
        style={[styles.cardWrapper, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <Link href={`/(app)/item/${item.id}`} asChild>
          <Pressable
            style={styles.card}
            onPress={() => {
              closeActions();
            }}
          >
            <View style={styles.badges}>
              <Text style={styles.source}>{item.source}</Text>
              {item.type ? <Text style={styles.type}>{item.type}</Text> : null}
            </View>
            <Text style={styles.body}>
              {item.cleanedText?.trim() || item.rawInput}
            </Text>
            <Text style={styles.meta}>
              {formatDistanceToNow(new Date(item.createdAt), {
                addSuffix: true,
              })}
            </Text>
            <Text style={styles.swipeHint}>Swipe left for delete</Text>
          </Pressable>
        </Link>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardShell: {
    marginBottom: 12,
    position: 'relative',
  },
  deleteTray: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  cardWrapper: {
    zIndex: 1,
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
  swipeHint: {
    color: '#94a3b8',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  deleteAction: {
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    width: 108,
    borderRadius: 24,
  },
  deleteText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
