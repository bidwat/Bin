'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import type { Item } from '@bin/shared';

import { mapItemRow } from '@/lib/items';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

import { ReminderBanner } from './ReminderBanner';

export function WebReminderBridge({ userId }: { userId: string }) {
  const router = useRouter();
  const seenReminderIdsRef = useRef(new Set<string>());
  const [activeReminder, setActiveReminder] = useState<Item | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }

    return Notification.permission;
  });

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`web-reminders-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'items',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const nextReminderStatus =
            typeof payload.new.reminder_status === 'string'
              ? payload.new.reminder_status
              : null;
          const previousReminderStatus =
            typeof payload.old.reminder_status === 'string'
              ? payload.old.reminder_status
              : null;

          if (
            nextReminderStatus !== 'sent' ||
            previousReminderStatus === 'sent'
          ) {
            return;
          }

          const nextItem = mapItemRow(payload.new as never);

          if (seenReminderIdsRef.current.has(nextItem.id)) {
            return;
          }

          seenReminderIdsRef.current.add(nextItem.id);
          setActiveReminder(nextItem);

          if (
            typeof window !== 'undefined' &&
            'Notification' in window &&
            Notification.permission === 'granted'
          ) {
            const notification = new Notification('Reminder from Bin', {
              body: nextItem.cleanedText?.trim() || nextItem.rawInput,
              tag: nextItem.id,
            });

            notification.onclick = () => {
              window.focus();
              router.push(`/feed?item=${nextItem.id}`);
              notification.close();
            };
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router, userId]);

  async function requestBrowserNotifications() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  }

  async function dismissReminder() {
    if (!activeReminder) {
      return;
    }

    await fetch(`/api/items/${activeReminder.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reminder_status: 'dismissed',
      }),
    });

    setActiveReminder(null);
  }

  async function snoozeReminder(minutes: 15 | 60) {
    if (!activeReminder) {
      return;
    }

    await fetch(`/api/items/${activeReminder.id}/snooze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snooze_minutes: minutes,
      }),
    });

    setActiveReminder(null);
  }

  return (
    <ReminderBanner
      item={activeReminder}
      notificationPermission={notificationPermission}
      onEnableNotifications={() => void requestBrowserNotifications()}
      onDismiss={() => void dismissReminder()}
      onSnooze={(minutes) => void snoozeReminder(minutes)}
      onOpen={() => {
        if (!activeReminder) {
          return;
        }

        router.push(`/feed?item=${activeReminder.id}`);
        setActiveReminder(null);
      }}
    />
  );
}
