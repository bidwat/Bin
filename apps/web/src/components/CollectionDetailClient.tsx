'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import type { Cluster, Item } from '@bin/shared';

import { CollectionCard } from '@/components/CollectionCard';
import { ItemCard } from '@/components/ItemCard';
import { ItemDetailSheet } from '@/components/ItemDetailSheet';

type CollectionDetailClientProps = {
  cluster: Cluster;
  childClusters: Cluster[];
  breadcrumbs: Cluster[];
  items: Item[];
};

export function CollectionDetailClient({
  cluster,
  childClusters,
  breadcrumbs,
  items,
}: CollectionDetailClientProps) {
  const router = useRouter();
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [labelDraft, setLabelDraft] = useState(cluster.label);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const activeCluster = useMemo(() => cluster, [cluster]);

  useEffect(() => {
    setLabelDraft(activeCluster.label);
  }, [activeCluster.label]);

  async function saveLabel() {
    const nextLabel = labelDraft.trim();

    if (!nextLabel || nextLabel === activeCluster.label) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const response = await fetch(`/api/clusters/${activeCluster.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ label: nextLabel }),
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    setIsSaving(false);

    if (!response.ok) {
      setSaveError(payload?.error ?? 'Unable to update collection');
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/collections"
          className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500"
        >
          Collections
        </Link>
        {breadcrumbs.length > 1 ? (
          <nav
            aria-label="Collection breadcrumb"
            className="text-sm text-slate-500"
          >
            {breadcrumbs.map((entry, index) => {
              const isCurrent = index === breadcrumbs.length - 1;

              return (
                <span key={entry.id}>
                  {index > 0 ? (
                    <span className="mx-2 text-slate-400">/</span>
                  ) : null}
                  {isCurrent ? (
                    <span
                      aria-current="page"
                      className="font-medium text-slate-700"
                    >
                      {entry.label}
                    </span>
                  ) : (
                    <Link
                      href={`/collections/${entry.id}`}
                      className="transition-colors hover:text-slate-900"
                    >
                      {entry.label}
                    </Link>
                  )}
                </span>
              );
            })}
          </nav>
        ) : null}
        <div className="flex flex-col gap-3 rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-[0_16px_50px_rgba(15,23,42,0.08)] md:flex-row md:items-end md:justify-between">
          <div className="flex-1 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
              Collection
            </p>
            <input
              value={labelDraft}
              onChange={(event) => setLabelDraft(event.target.value)}
              className="w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-3xl font-semibold tracking-tight text-slate-950 outline-none focus:border-slate-400"
            />
            <p className="text-sm text-slate-500">
              {items.length} item{items.length === 1 ? '' : 's'} in this view.
            </p>
            {saveError ? (
              <p className="text-sm text-rose-600">{saveError}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => void saveLabel()}
            disabled={isSaving}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save label'}
          </button>
        </div>
      </div>

      {childClusters.length > 0 ? (
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Child Collections
          </p>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {childClusters.map((childCluster) => (
              <div key={childCluster.id} className="min-w-[240px] shrink-0">
                <CollectionCard
                  cluster={childCluster}
                  compact
                  href={`/collections/${childCluster.id}`}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/60 p-10 text-center text-slate-500">
            No items in this collection yet.
          </div>
        ) : (
          items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onOpen={() => setSelectedItem(item)}
            />
          ))
        )}
      </div>

      {selectedItem ? (
        <ItemDetailSheet
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onSave={(updatedItem) => {
            setSelectedItem(updatedItem);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
