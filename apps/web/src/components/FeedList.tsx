'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { ItemType, type Item } from '@bin/shared';

import { CaptureBar } from '@/components/CaptureBar';
import { ItemDetailSheet } from '@/components/ItemDetailSheet';
import { ItemCard } from '@/components/ItemCard';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type FeedListProps = {
  initialItems: Item[];
  userId: string;
};

export function FeedList({ initialItems, userId }: FeedListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [items, setItems] = useState(initialItems);
  const selectedItemId = searchParams.get('item');
  const selectedType = Object.values(ItemType).includes(
    searchParams.get('type') as ItemType,
  )
    ? (searchParams.get('type') as ItemType)
    : null;
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;
  const visibleItems = useMemo(
    () =>
      selectedType ? items.filter((item) => item.type === selectedType) : items,
    [items, selectedType],
  );

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  function mapRealtimeItem(row: Record<string, unknown>) {
    const createdAt =
      typeof row.created_at === 'string'
        ? row.created_at
        : new Date().toISOString();

    return {
      id: String(row.id),
      userId: String(row.user_id),
      rawInput: String(row.raw_input),
      cleanedText:
        typeof row.cleaned_text === 'string' ? row.cleaned_text : null,
      source: String(row.source ?? 'manual'),
      type: typeof row.type === 'string' ? (row.type as Item['type']) : null,
      actionability:
        typeof row.actionability === 'string'
          ? (row.actionability as Item['actionability'])
          : null,
      entities:
        row.entities && typeof row.entities === 'object'
          ? (row.entities as Item['entities'])
          : {},
      clusterIds: Array.isArray(row.cluster_ids)
        ? row.cluster_ids.map(String)
        : [],
      subClusterId:
        typeof row.sub_cluster_id === 'string' ? row.sub_cluster_id : null,
      resurfacingScore:
        typeof row.resurfacing_score === 'number' ? row.resurfacing_score : 1,
      processed: Boolean(row.processed),
      reminderStatus:
        typeof row.reminder_status === 'string'
          ? (row.reminder_status as Item['reminderStatus'])
          : null,
      reminderAt: typeof row.reminder_at === 'string' ? row.reminder_at : null,
      createdAt,
      lastSurfacedAt:
        typeof row.last_surfaced_at === 'string' ? row.last_surfaced_at : null,
    } satisfies Item;
  }

  function setTypeFilter(nextType: ItemType | null) {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (nextType) {
      nextParams.set('type', nextType);
    } else {
      nextParams.delete('type');
    }

    const query = nextParams.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function openItem(id: string) {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('item', id);
    router.push(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }

  function closeItem() {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('item');
    const query = nextParams.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function replaceItem(updatedItem: Item) {
    setItems((current) =>
      current.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
    );
  }

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`items-feed-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'items',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setItems((current) => {
            const withoutOptimistic = current.filter(
              (item) =>
                !(
                  item.id.startsWith('optimistic-') &&
                  item.rawInput === payload.new.raw_input
                ),
            );

            return [mapRealtimeItem(payload.new), ...withoutOptimistic];
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'items',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const nextItem = mapRealtimeItem(payload.new);
          setItems((current) =>
            current.map((item) => (item.id === nextItem.id ? nextItem : item)),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  async function handleCapture(text: string) {
    const optimisticItem: Item = {
      id: `optimistic-${crypto.randomUUID()}`,
      userId,
      rawInput: text,
      cleanedText: null,
      source: 'manual',
      type: null,
      actionability: null,
      entities: {},
      clusterIds: [],
      subClusterId: null,
      resurfacingScore: 1,
      processed: false,
      reminderStatus: null,
      reminderAt: null,
      createdAt: new Date().toISOString(),
      lastSurfacedAt: null,
    };

    setItems((current) => [optimisticItem, ...current]);

    const response = await fetch('/api/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      setItems((current) =>
        current.filter((item) => item.id !== optimisticItem.id),
      );
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(payload?.error ?? 'Unable to capture item');
    }

    const payload = (await response.json()) as { item: Item };
    setItems((current) => [
      payload.item,
      ...current.filter((item) => item.id !== optimisticItem.id),
    ]);
  }

  function handleVoiceCaptured(item: Item) {
    setItems((current) => [
      item,
      ...current.filter((entry) => entry.id !== item.id),
    ]);
  }

  async function handleDelete(id: string) {
    const previousItems = items;
    setItems((current) => current.filter((item) => item.id !== id));

    const response = await fetch(`/api/items/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      setItems(previousItems);
    }
  }

  return (
    <div className="space-y-6">
      <CaptureBar
        onCapture={handleCapture}
        onVoiceCaptured={handleVoiceCaptured}
      />

      <div className="flex gap-2 overflow-x-auto pb-2">
        <FilterChip
          active={selectedType === null}
          label="All"
          onClick={() => setTypeFilter(null)}
        />
        {Object.values(ItemType).map((value) => (
          <FilterChip
            key={value}
            active={selectedType === value}
            label={`${value[0]?.toUpperCase()}${value.slice(1)}`}
            onClick={() => setTypeFilter(value)}
          />
        ))}
      </div>

      <div className="space-y-4">
        {visibleItems.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/60 p-10 text-center text-slate-500">
            Nothing captured yet.
          </div>
        ) : (
          visibleItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onDelete={handleDelete}
              onOpen={openItem}
            />
          ))
        )}
      </div>

      {selectedItem ? (
        <ItemDetailSheet
          item={selectedItem}
          onClose={closeItem}
          onSave={replaceItem}
        />
      ) : null}
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
        active
          ? 'border-slate-950 bg-slate-950 text-white'
          : 'border-slate-200 bg-white text-slate-600'
      }`}
    >
      {label}
    </button>
  );
}
