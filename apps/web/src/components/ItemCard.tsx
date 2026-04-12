'use client';

import { formatDistanceToNow } from 'date-fns';

import { Actionability, ItemType, type Item } from '@bin/shared';

import { getAttachmentUrl } from '@/lib/attachments';

type ItemCardProps = {
  item: Item;
  onDelete?: (id: string) => Promise<void>;
  onOpen?: (id: string) => void;
};

export function ItemCard({ item, onDelete, onOpen }: ItemCardProps) {
  const optimistic = item.id.startsWith('optimistic-');
  const body = item.cleanedText?.trim() || item.rawInput;
  const attachmentUrl = getAttachmentUrl(item.entities.attachment_url);
  const entityPills = [
    ...(item.entities.people ?? []),
    ...(item.entities.dates ?? []),
    ...(item.entities.places ?? []),
    ...(item.entities.urls ?? []),
  ].slice(0, 4);

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
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${typeBadgeClassName(item.type)}`}
            >
              {item.type}
            </span>
          ) : null}
          {item.actionability ? (
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${actionabilityBadgeClassName(item.actionability)}`}
            >
              {item.actionability}
            </span>
          ) : null}
          {optimistic ? (
            <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-medium text-amber-950">
              Capturing
            </span>
          ) : !item.processed ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
              Processing
            </span>
          ) : null}
        </div>

        {onDelete ? (
          <button
            type="button"
            onClick={() => void onDelete(item.id)}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
          >
            Delete
          </button>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => {
          if (!optimistic) {
            onOpen?.(item.id);
          }
        }}
        className="mt-4 block w-full text-left"
      >
        {attachmentUrl ? (
          <img
            src={attachmentUrl}
            alt="Captured attachment"
            className="mb-4 h-56 w-full rounded-[1.25rem] object-cover"
          />
        ) : null}
        <p className="whitespace-pre-wrap text-base leading-7 text-slate-900">
          {body}
        </p>
        {entityPills.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {entityPills.map((pill) => (
              <span
                key={pill}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
              >
                {pill}
              </span>
            ))}
          </div>
        ) : null}
      </button>

      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <span>
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
        </span>
        <span>{item.processed ? 'Processed' : 'Awaiting AI processing'}</span>
      </div>
    </article>
  );
}

function typeBadgeClassName(type: ItemType) {
  switch (type) {
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

function actionabilityBadgeClassName(actionability: Actionability) {
  switch (actionability) {
    case Actionability.Now:
      return 'bg-rose-100 text-rose-900';
    case Actionability.Soon:
      return 'bg-amber-100 text-amber-900';
    case Actionability.Eventually:
      return 'bg-sky-100 text-sky-900';
    case Actionability.Never:
    default:
      return 'bg-slate-100 text-slate-700';
  }
}
