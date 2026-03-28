'use client';

import { formatDistanceToNow } from 'date-fns';

import type { Item } from '@bin/shared';

type ItemCardProps = {
  item: Item;
  onDelete?: (id: string) => Promise<void>;
};

export function ItemCard({ item, onDelete }: ItemCardProps) {
  const optimistic = item.id.startsWith('optimistic-');
  const body = item.cleanedText?.trim() || item.rawInput;

  return (
    <article
      className={`rounded-[1.75rem] border p-5 shadow-[0_10px_40px_rgba(15,23,42,0.05)] transition ${
        optimistic
          ? 'border-amber-300 bg-amber-50/80'
          : 'border-white/80 bg-white/90'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-white">
            {item.source}
          </span>
          {item.type ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {item.type}
            </span>
          ) : null}
          {optimistic ? (
            <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-medium text-amber-950">
              Capturing
            </span>
          ) : null}
        </div>

        {onDelete ? (
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
          >
            Delete
          </button>
        ) : null}
      </div>

      <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-slate-900">
        {body}
      </p>

      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <span>
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
        </span>
        <span>{item.processed ? 'Processed' : 'Awaiting AI processing'}</span>
      </div>
    </article>
  );
}
