import { useEffect, useState } from 'react';
import {
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { Item } from '@bin/shared';

import { ItemCard } from '../../src/components/ItemCard';
import { getMobileEnv } from '../../src/lib/env';
import { supabase } from '../../src/lib/supabase';

type SearchResult = {
  item: Item;
  similarity: number;
};

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const timeout = setTimeout(() => {
      void search(trimmed);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('No authenticated session');
    }

    return session.access_token;
  }

  async function search(nextQuery: string) {
    try {
      const response = await fetch(`${getMobileEnv().apiBaseUrl}/api/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await getAccessToken()}`,
        },
        body: JSON.stringify({ query: nextQuery, limit: 20 }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        results?: SearchResult[];
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Search failed');
      }

      setResults(payload?.results ?? []);
    } catch (searchError) {
      setResults([]);
      setError(
        searchError instanceof Error ? searchError.message : 'Search failed',
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Search</Text>
        <Text style={styles.title}>Find notes by meaning</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search for that thing you meant to do..."
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.summary}>
          {query.trim().length < 2
            ? 'Type at least two characters to search.'
            : isLoading
              ? 'Searching...'
              : error
                ? error
                : `${results.length} result${results.length === 1 ? '' : 's'}`}
        </Text>
      </View>

      <FlatList
        data={results}
        keyExtractor={(entry) => entry.item.id}
        contentContainerStyle={styles.list}
        keyboardDismissMode="on-drag"
        onScrollBeginDrag={() => Keyboard.dismiss()}
        renderItem={({ item: entry }) => (
          <View style={styles.result}>
            <Text style={styles.similarity}>
              Similarity {Math.round(entry.similarity * 100)}%
            </Text>
            <ItemCard item={entry.item} onDelete={() => {}} />
          </View>
        )}
        ListEmptyComponent={
          !isLoading && query.trim().length >= 2 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No results yet.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f4ec',
    padding: 16,
  },
  header: {
    gap: 8,
    paddingBottom: 12,
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
  input: {
    borderRadius: 20,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#0f172a',
    fontSize: 16,
  },
  summary: {
    color: '#64748b',
    fontSize: 13,
  },
  list: {
    paddingBottom: 24,
    gap: 12,
  },
  result: {
    gap: 6,
  },
  similarity: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 4,
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
