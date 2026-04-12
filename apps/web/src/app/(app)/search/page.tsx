'use client';

import { useEffect, useMemo, useState } from 'react';

import type { Item } from '@bin/shared';

import { ItemCard } from '@/components/ItemCard';
import { ItemDetailSheet } from '@/components/ItemDetailSheet';

type SearchResult = {
  item: Item;
  similarity: number;
};

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

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

    const timeout = window.setTimeout(() => {
      void fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: trimmed, limit: 20 }),
      })
        .then(async (response) => {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
            results?: SearchResult[];
          } | null;

          if (!response.ok) {
            throw new Error(payload?.error ?? 'Search failed');
          }

          setResults(payload?.results ?? []);
        })
        .catch((searchError: unknown) => {
          setResults([]);
          setError(
            searchError instanceof Error
              ? searchError.message
              : 'Search failed',
          );
        })
        .finally(() => {
          setIsLoading(false);
        });
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [query]);

  const resultCountLabel = useMemo(() => {
    if (query.trim().length < 2) {
      return 'Type at least two characters to search semantically.';
    }

    if (isLoading) {
      return 'Searching...';
    }

    if (error) {
      return error;
    }

    return `${results.length} result${results.length === 1 ? '' : 's'}`;
  }, [error, isLoading, query, results.length]);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-700">
          Search
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
          Search by meaning, not just keywords
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Search turns your query into an embedding and finds the closest items
          in your Bin.
        </p>
      </header>

      <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-4 shadow-[0_16px_60px_rgba(15,23,42,0.08)] backdrop-blur">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search for that startup idea about food..."
          className="w-full rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900 outline-none transition focus:border-slate-400"
        />
        <p className="mt-3 text-sm text-slate-500">{resultCountLabel}</p>
      </div>

      <div className="space-y-4">
        {!isLoading &&
        query.trim().length >= 2 &&
        results.length === 0 &&
        !error ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/60 p-10 text-center text-slate-500">
            No results yet.
          </div>
        ) : null}

        {results.map(({ item, similarity }) => (
          <div key={item.id} className="space-y-2">
            <div className="px-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Similarity {Math.round(similarity * 100)}%
            </div>
            <ItemCard item={item} onOpen={() => setSelectedItem(item)} />
          </div>
        ))}
      </div>

      {selectedItem ? (
        <ItemDetailSheet
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onSave={(updatedItem) => {
            setSelectedItem(updatedItem);
            setResults((current) =>
              current.map((entry) =>
                entry.item.id === updatedItem.id
                  ? { ...entry, item: updatedItem }
                  : entry,
              ),
            );
          }}
        />
      ) : null}
    </div>
  );
}
