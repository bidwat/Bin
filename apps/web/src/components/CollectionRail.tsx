'use client';

import type { Cluster } from '@bin/shared';

import { CollectionCard } from '@/components/CollectionCard';

type CollectionRailProps = {
  collections: Cluster[];
  selectedCollectionId: string | null;
  onSelect: (collectionId: string | null) => void;
};

export function CollectionRail({
  collections,
  selectedCollectionId,
  onSelect,
}: CollectionRailProps) {
  if (collections.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Collections
          </p>
          <p className="mt-1 text-sm text-slate-600">
            AI-generated themes across your feed.
          </p>
        </div>
        {selectedCollectionId ? (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {collections.map((collection) => (
          <button
            key={collection.id}
            type="button"
            onClick={() => onSelect(collection.id)}
            className="min-w-[260px] shrink-0 text-left"
          >
            <CollectionCard
              cluster={collection}
              compact
              active={selectedCollectionId === collection.id}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
