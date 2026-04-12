'use client';

import { ItemType } from '@bin/shared';

type FeedFilterBarProps = {
  selectedType: ItemType | null;
  onSelectType: (type: ItemType | null) => void;
};

export function FeedFilterBar({
  selectedType,
  onSelectType,
}: FeedFilterBarProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      <FilterChip
        active={selectedType === null}
        label="All"
        onClick={() => onSelectType(null)}
      />
      {Object.values(ItemType).map((value) => (
        <FilterChip
          key={value}
          active={selectedType === value}
          label={`${value[0]?.toUpperCase()}${value.slice(1)}`}
          onClick={() => onSelectType(value)}
        />
      ))}
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
