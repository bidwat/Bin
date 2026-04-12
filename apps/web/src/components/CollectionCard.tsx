'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

import { ItemType, type Cluster } from '@bin/shared';

type CollectionCardProps = {
  cluster: Cluster;
  href?: string;
  active?: boolean;
  compact?: boolean;
};

export function CollectionCard({
  cluster,
  href,
  active = false,
  compact = false,
}: CollectionCardProps) {
  const content = (
    <article
      className={`rounded-[1.5rem] border p-4 text-left transition ${
        active
          ? 'border-slate-950 bg-slate-950 text-white'
          : 'border-white/80 bg-white/90 text-slate-900'
      } ${compact ? 'min-w-[240px]' : ''}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-semibold tracking-tight">
          {cluster.label}
        </p>
        {cluster.typeScope ? (
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
              active
                ? 'bg-white/15 text-white'
                : typeScopeClassName(cluster.typeScope)
            }`}
          >
            {cluster.typeScope}
          </span>
        ) : null}
      </div>
      <div
        className={`mt-4 flex items-center justify-between text-xs ${
          active ? 'text-slate-200' : 'text-slate-500'
        }`}
      >
        <span>{cluster.memberCount} items</span>
        <span>
          Updated{' '}
          {formatDistanceToNow(new Date(cluster.lastUpdatedAt), {
            addSuffix: true,
          })}
        </span>
      </div>
    </article>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}

function typeScopeClassName(typeScope: ItemType) {
  switch (typeScope) {
    case ItemType.Task:
      return 'bg-sky-100 text-sky-900';
    case ItemType.Reminder:
      return 'bg-rose-100 text-rose-900';
    case ItemType.Idea:
      return 'bg-amber-100 text-amber-900';
    case ItemType.Person:
      return 'bg-emerald-100 text-emerald-900';
    case ItemType.Event:
      return 'bg-violet-100 text-violet-900';
    case ItemType.Reference:
      return 'bg-orange-100 text-orange-900';
    case ItemType.Note:
    default:
      return 'bg-slate-100 text-slate-700';
  }
}
