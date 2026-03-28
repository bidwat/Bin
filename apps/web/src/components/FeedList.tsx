'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import type { Item } from '@bin/shared';

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
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;

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
          const createdAt =
            typeof payload.new.created_at === 'string'
              ? payload.new.created_at
              : new Date().toISOString();

          setItems((current) => {
            const withoutOptimistic = current.filter(
              (item) =>
                !(
                  item.id.startsWith('optimistic-') &&
                  item.rawInput === payload.new.raw_input
                ),
            );

            return [
              {
                id: String(payload.new.id),
                userId: String(payload.new.user_id),
                rawInput: String(payload.new.raw_input),
                cleanedText:
                  typeof payload.new.cleaned_text === 'string'
                    ? payload.new.cleaned_text
                    : null,
                source: String(payload.new.source ?? 'manual'),
                type:
                  typeof payload.new.type === 'string'
                    ? (payload.new.type as Item['type'])
                    : null,
                actionability:
                  typeof payload.new.actionability === 'string'
                    ? (payload.new.actionability as Item['actionability'])
                    : null,
                entities:
                  payload.new.entities &&
                  typeof payload.new.entities === 'object'
                    ? (payload.new.entities as Item['entities'])
                    : {},
                clusterIds: Array.isArray(payload.new.cluster_ids)
                  ? payload.new.cluster_ids.map(String)
                  : [],
                subClusterId:
                  typeof payload.new.sub_cluster_id === 'string'
                    ? payload.new.sub_cluster_id
                    : null,
                resurfacingScore:
                  typeof payload.new.resurfacing_score === 'number'
                    ? payload.new.resurfacing_score
                    : 1,
                processed: Boolean(payload.new.processed),
                reminderStatus:
                  typeof payload.new.reminder_status === 'string'
                    ? (payload.new.reminder_status as Item['reminderStatus'])
                    : null,
                reminderAt:
                  typeof payload.new.reminder_at === 'string'
                    ? payload.new.reminder_at
                    : null,
                createdAt,
                lastSurfacedAt:
                  typeof payload.new.last_surfaced_at === 'string'
                    ? payload.new.last_surfaced_at
                    : null,
              },
              ...withoutOptimistic,
            ];
          });
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
      <CaptureBar onCapture={handleCapture} />

      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          'All',
          'Ideas',
          'Tasks',
          'People',
          'Reminders',
          'Events',
          'References',
        ].map((label) => (
          <span
            key={label}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600"
          >
            {label}
          </span>
        ))}
      </div>

      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/60 p-10 text-center text-slate-500">
            Nothing captured yet.
          </div>
        ) : (
          items.map((item) => (
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
