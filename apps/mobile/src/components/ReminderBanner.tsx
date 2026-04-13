import { format } from 'date-fns';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Item } from '@bin/shared';

export function ReminderBanner({
  item,
  onOpen,
  onDismiss,
  onSnooze,
}: {
  item: Item;
  onOpen: () => void;
  onDismiss: () => void;
  onSnooze: (minutes: 15 | 60) => void;
}) {
  const dueLabel = item.reminderAt
    ? format(new Date(item.reminderAt), 'MMM d, h:mm a')
    : null;

  return (
    <View style={styles.shell}>
      <View style={styles.banner}>
        <Text style={styles.eyebrow}>Reminder</Text>
        <Text style={styles.body} numberOfLines={3}>
          {item.cleanedText?.trim() || item.rawInput}
        </Text>
        {dueLabel ? <Text style={styles.meta}>Due {dueLabel}</Text> : null}
        <View style={styles.actions}>
          <Pressable style={styles.secondaryButton} onPress={onDismiss}>
            <Text style={styles.secondaryText}>Dismiss</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => onSnooze(15)}
          >
            <Text style={styles.secondaryText}>15 min</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => onSnooze(60)}
          >
            <Text style={styles.secondaryText}>1 hour</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={onOpen}>
            <Text style={styles.primaryText}>Open</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 16,
    zIndex: 30,
  },
  banner: {
    borderRadius: 24,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fdba74',
    padding: 16,
    gap: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  eyebrow: {
    color: '#c2410c',
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    fontSize: 11,
    fontWeight: '800',
  },
  body: {
    color: '#7c2d12',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  meta: {
    color: '#9a3412',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  secondaryButton: {
    borderRadius: 999,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  secondaryText: {
    color: '#7c2d12',
    fontWeight: '700',
    fontSize: 12,
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: '#7c2d12',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
});
