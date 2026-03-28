'use client';

import { useState } from 'react';

import { Actionability, ItemType, type Item } from '@bin/shared';

type ItemDetailSheetProps = {
  item: Item;
  onClose: () => void;
  onSave: (item: Item) => void;
};

export function ItemDetailSheet({
  item,
  onClose,
  onSave,
}: ItemDetailSheetProps) {
  const [cleanedText, setCleanedText] = useState(
    item.cleanedText ?? item.rawInput,
  );
  const [type, setType] = useState<Item['type']>(item.type ?? null);
  const [actionability, setActionability] = useState<Item['actionability']>(
    item.actionability ?? null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setIsSaving(true);
    setError(null);

    const response = await fetch(`/api/items/${item.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cleaned_text: cleanedText.trim() || null,
        type,
        actionability,
      }),
    });

    setIsSaving(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(payload?.error ?? 'Unable to save item');
      return;
    }

    const payload = (await response.json()) as { item: Item };
    onSave(payload.item);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/25 backdrop-blur-[1px]">
      <button
        type="button"
        aria-label="Close item detail"
        className="flex-1"
        onClick={onClose}
      />
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-white/70 bg-[#fffdf8] px-6 py-8 shadow-[-24px_0_80px_rgba(15,23,42,0.18)]">
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-700">
                Item detail
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                Refine the capture
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600"
            >
              Close
            </button>
          </div>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Original capture
            </p>
            <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-slate-900">
              {item.rawInput}
            </p>
          </section>

          <label className="block space-y-3">
            <span className="text-sm font-medium text-slate-700">
              Cleaned text
            </span>
            <textarea
              rows={8}
              value={cleanedText}
              onChange={(event) => setCleanedText(event.target.value)}
              className="w-full rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 text-base text-slate-900 outline-none transition focus:border-slate-400"
            />
          </label>

          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">Type</p>
            <div className="flex flex-wrap gap-2">
              <Pill
                active={type === null}
                label="Unset"
                onClick={() => setType(null)}
              />
              {Object.values(ItemType).map((value) => (
                <Pill
                  key={value}
                  active={type === value}
                  label={value}
                  onClick={() => setType(value)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">Actionability</p>
            <div className="flex flex-wrap gap-2">
              <Pill
                active={actionability === null}
                label="Unset"
                onClick={() => setActionability(null)}
              />
              {Object.values(Actionability).map((value) => (
                <Pill
                  key={value}
                  active={actionability === value}
                  label={value}
                  onClick={() => setActionability(value)}
                />
              ))}
            </div>
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white disabled:bg-slate-400"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Pill({
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
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        active
          ? 'bg-slate-950 text-white'
          : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300'
      }`}
    >
      {label}
    </button>
  );
}
