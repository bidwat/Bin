import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Actionability, ItemType, type Item } from '@bin/shared';

import { fetchItem, updateItem } from '../../../src/lib/api';

export default function ItemDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const itemId = useMemo(() => params.id ?? 'unknown', [params.id]);
  const [item, setItem] = useState<Item | null>(null);
  const [cleanedText, setCleanedText] = useState('');
  const [type, setType] = useState<Item['type']>(null);
  const [actionability, setActionability] =
    useState<Item['actionability']>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) {
      return;
    }

    fetchItem(params.id)
      .then(({ item: nextItem }) => {
        setItem(nextItem);
        setCleanedText(nextItem.cleanedText ?? nextItem.rawInput);
        setType(nextItem.type ?? null);
        setActionability(nextItem.actionability ?? null);
      })
      .catch((nextError: unknown) => {
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'Failed to load item',
        );
      });
  }, [params.id]);

  async function save() {
    if (!item) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const { item: updatedItem } = await updateItem(item.id, {
        cleanedText: cleanedText.trim() || null,
        type,
        actionability,
      });
      setItem(updatedItem);
      setCleanedText(updatedItem.cleanedText ?? updatedItem.rawInput);
      setType(updatedItem.type ?? null);
      setActionability(updatedItem.actionability ?? null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>Item</Text>
      <Text style={styles.title}>Refine this capture</Text>
      <Text style={styles.meta}>Item id: {itemId}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Original input</Text>
        <Text style={styles.body}>{item?.rawInput ?? 'Loading...'}</Text>
      </View>

      <Text style={styles.label}>Cleaned text</Text>
      <TextInput
        multiline
        style={styles.input}
        value={cleanedText}
        onChangeText={setCleanedText}
        placeholder="Refine the note"
      />

      <Text style={styles.label}>Type</Text>
      <View style={styles.pills}>
        <Pill
          active={type === null}
          label="Unset"
          onPress={() => setType(null)}
        />
        {Object.values(ItemType).map((value) => (
          <Pill
            key={value}
            active={type === value}
            label={value}
            onPress={() => setType(value)}
          />
        ))}
      </View>

      <Text style={styles.label}>Actionability</Text>
      <View style={styles.pills}>
        <Pill
          active={actionability === null}
          label="Unset"
          onPress={() => setActionability(null)}
        />
        {Object.values(Actionability).map((value) => (
          <Pill
            key={value}
            active={actionability === value}
            label={value}
            onPress={() => setActionability(value)}
          />
        ))}
      </View>

      <Pressable style={styles.saveButton} onPress={() => void save()}>
        <Text style={styles.saveButtonText}>
          {isSaving ? 'Saving...' : 'Save'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function Pill({
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
      style={[styles.pill, active ? styles.pillActive : null]}
      onPress={onPress}
    >
      <Text style={[styles.pillText, active ? styles.pillTextActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f8f4ec',
    padding: 24,
    gap: 12,
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
  meta: {
    color: '#64748b',
    fontSize: 14,
  },
  body: {
    color: '#475569',
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    marginTop: 12,
  },
  cardTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  label: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  input: {
    minHeight: 160,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    padding: 18,
    textAlignVertical: 'top',
    fontSize: 16,
    color: '#0f172a',
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    borderRadius: 999,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pillActive: {
    backgroundColor: '#0f172a',
  },
  pillText: {
    color: '#334155',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  pillTextActive: {
    color: '#ffffff',
  },
  saveButton: {
    marginTop: 12,
    borderRadius: 999,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    paddingVertical: 14,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  error: {
    color: '#dc2626',
    fontSize: 14,
  },
});
