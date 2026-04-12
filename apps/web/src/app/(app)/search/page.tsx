'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

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
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  async function runSearch(nextQuery: string) {
    const trimmed = nextQuery.trim();

    if (trimmed.length < 2) {
      abortControllerRef.current?.abort();
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: trimmed, limit: 20 }),
        signal: controller.signal,
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        results?: SearchResult[];
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Search failed');
      }

      if (requestIdRef.current === requestId) {
        setResults(payload?.results ?? []);
      }
    } catch (searchError: unknown) {
      if (
        searchError instanceof DOMException &&
        searchError.name === 'AbortError'
      ) {
        return;
      }

      if (requestIdRef.current === requestId) {
        setResults([]);
        setError(
          searchError instanceof Error ? searchError.message : 'Search failed',
        );
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      void runSearch(trimmed);
    }, 550);

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
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void runSearch(query);
            }
          }}
          placeholder="Search for that startup idea about food..."
          className="w-full rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900 outline-none transition focus:border-slate-400"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">{resultCountLabel}</p>
          <button
            type="button"
            onClick={() => void runSearch(query)}
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
          >
            Search
          </button>
        </div>
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
