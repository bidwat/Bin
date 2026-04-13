'use client';

import { format } from 'date-fns';

import type { Item } from '@bin/shared';

export function ReminderBanner({
  item,
  onOpen,
  onDismiss,
  onSnooze,
  onEnableNotifications,
  notificationPermission,
}: {
  item: Item | null;
  onOpen?: () => void;
  onDismiss?: () => void;
  onSnooze?: (minutes: 15 | 60) => void;
  onEnableNotifications?: () => void;
  notificationPermission?: NotificationPermission | 'unsupported';
}) {
  if (!item && notificationPermission !== 'default') {
    return null;
  }

  return (
    <div className="fixed right-5 top-5 z-50 flex w-full max-w-md flex-col gap-3">
      {notificationPermission === 'default' && onEnableNotifications ? (
        <div className="rounded-[1.75rem] border border-sky-200 bg-white p-5 shadow-[0_16px_48px_rgba(15,23,42,0.12)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
            Browser reminders
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            Enable browser notifications so Bin can surface due reminders while
            you are working on the web.
          </p>
          <button
            type="button"
            onClick={onEnableNotifications}
            className="mt-4 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white"
          >
            Enable notifications
          </button>
        </div>
      ) : null}

      {item ? (
        <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 shadow-[0_16px_48px_rgba(15,23,42,0.12)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
            Reminder
          </p>
          <p className="mt-3 text-sm font-medium leading-6 text-slate-900">
            {item.cleanedText?.trim() || item.rawInput}
          </p>
          {item.reminderAt ? (
            <p className="mt-2 text-xs text-amber-900/75">
              Due {format(new Date(item.reminderAt), 'MMM d, yyyy h:mm a')}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-full border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => onSnooze?.(15)}
              className="rounded-full border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900"
            >
              15 min
            </button>
            <button
              type="button"
              onClick={() => onSnooze?.(60)}
              className="rounded-full border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900"
            >
              1 hour
            </button>
            <button
              type="button"
              onClick={onOpen}
              className="rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-white"
            >
              Open
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
