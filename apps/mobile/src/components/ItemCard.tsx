import { useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'expo-router';
import {
  Animated,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Actionability, ItemType, type Item } from '@bin/shared';

import { getAttachmentUrl } from '../lib/attachments';

export function ItemCard({
  item,
  onDelete,
}: {
  item: Item;
  onDelete: (id: string) => void;
}) {
  const optimistic = item.id.startsWith('optimistic-');
  const attachmentUrl = getAttachmentUrl(item.entities.attachment_url);
  const entityPills = [
    ...(item.entities.people ?? []),
    ...(item.entities.dates ?? []),
    ...(item.entities.places ?? []),
    ...(item.entities.urls ?? []),
  ].slice(0, 4);
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
        {optimistic ? (
          <Pressable
            style={styles.card}
            onPress={() => {
              closeActions();
            }}
          >
            <View style={styles.badges}>
              <Text style={styles.source}>{item.source}</Text>
              {item.type ? (
                <Text style={[styles.badge, typeBadgeStyle(item.type)]}>
                  {item.type}
                </Text>
              ) : null}
              {item.actionability ? (
                <Text
                  style={[
                    styles.badge,
                    actionabilityBadgeStyle(item.actionability),
                  ]}
                >
                  {item.actionability}
                </Text>
              ) : null}
              {optimistic ? (
                <Text style={[styles.badge, styles.pendingBadge]}>
                  Capturing
                </Text>
              ) : !item.processed ? (
                <Text style={[styles.badge, styles.pendingBadge]}>
                  Processing
                </Text>
              ) : null}
            </View>
            {attachmentUrl ? (
              <Image
                source={{ uri: attachmentUrl }}
                style={styles.attachment}
                resizeMode="cover"
              />
            ) : null}
            <Text style={styles.body}>
              {item.cleanedText?.trim() || item.rawInput}
            </Text>
            {entityPills.length > 0 ? (
              <View style={styles.entities}>
                {entityPills.map((pill) => (
                  <Text key={pill} style={styles.entityPill}>
                    {pill}
                  </Text>
                ))}
              </View>
            ) : null}
            <Text style={styles.meta}>
              {formatDistanceToNow(new Date(item.createdAt), {
                addSuffix: true,
              })}
            </Text>
            <Text style={styles.swipeHint}>Swipe left for delete</Text>
          </Pressable>
        ) : (
          <Link href={`/(app)/item/${item.id}`} asChild>
            <Pressable
              style={styles.card}
              onPress={() => {
                closeActions();
              }}
            >
              <View style={styles.badges}>
                <Text style={styles.source}>{item.source}</Text>
                {item.type ? (
                  <Text style={[styles.badge, typeBadgeStyle(item.type)]}>
                    {item.type}
                  </Text>
                ) : null}
                {item.actionability ? (
                  <Text
                    style={[
                      styles.badge,
                      actionabilityBadgeStyle(item.actionability),
                    ]}
                  >
                    {item.actionability}
                  </Text>
                ) : null}
                {!item.processed ? (
                  <Text style={[styles.badge, styles.pendingBadge]}>
                    Processing
                  </Text>
                ) : null}
              </View>
              {attachmentUrl ? (
                <Image
                  source={{ uri: attachmentUrl }}
                  style={styles.attachment}
                  resizeMode="cover"
                />
              ) : null}
              <Text style={styles.body}>
                {item.cleanedText?.trim() || item.rawInput}
              </Text>
              {entityPills.length > 0 ? (
                <View style={styles.entities}>
                  {entityPills.map((pill) => (
                    <Text key={pill} style={styles.entityPill}>
                      {pill}
                    </Text>
                  ))}
                </View>
              ) : null}
              <Text style={styles.meta}>
                {formatDistanceToNow(new Date(item.createdAt), {
                  addSuffix: true,
                })}
              </Text>
              <Text style={styles.swipeHint}>Swipe left for delete</Text>
            </Pressable>
          </Link>
        )}
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
  badge: {
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  pendingBadge: {
    backgroundColor: '#fde68a',
    color: '#92400e',
  },
  body: {
    color: '#0f172a',
    fontSize: 16,
    lineHeight: 24,
  },
  attachment: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    backgroundColor: '#e2e8f0',
  },
  entities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  entityPill: {
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: '#f8fafc',
    color: '#475569',
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

function typeBadgeStyle(type: ItemType) {
  switch (type) {
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

function actionabilityBadgeStyle(actionability: Actionability) {
  switch (actionability) {
    case Actionability.Now:
      return { backgroundColor: '#ffe4e6', color: '#881337' };
    case Actionability.Soon:
      return { backgroundColor: '#fef3c7', color: '#92400e' };
    case Actionability.Eventually:
      return { backgroundColor: '#e0f2fe', color: '#0c4a6e' };
    case Actionability.Never:
    default:
      return { backgroundColor: '#e2e8f0', color: '#334155' };
  }
}
