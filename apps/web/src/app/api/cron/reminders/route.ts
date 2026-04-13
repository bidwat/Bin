import { createAdminSupabaseClient } from '@bin/supabase';

import { getServerEnv } from '@/lib/env';
import { mapItemRow } from '@/lib/items';
import { jsonResponse, optionsResponse } from '@/lib/api-response';
import { sendPushNotification } from '@/services/sendPushNotification';

function buildReminderMessage(rawText: string | null | undefined) {
  const text = rawText?.trim();
  if (!text) {
    return 'You have a reminder due.';
  }

  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
}

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization');
  const env = getServerEnv();

  if (authorization !== `Bearer ${env.cronSecret}`) {
    return jsonResponse(request, { error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminSupabaseClient(
    env.supabaseUrl,
    env.supabaseSecretKey,
  );
  const windowStart = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const { data: itemRows, error: itemsError } = await admin
    .from('items')
    .select('*')
    .not('reminder_at', 'is', null)
    .or(
      'reminder_status.eq.pending,reminder_status.eq.snoozed,reminder_status.is.null',
    )
    .lte('reminder_at', now)
    .gt('reminder_at', windowStart);

  if (itemsError) {
    return jsonResponse(
      request,
      { error: itemsError.message },
      { status: 500 },
    );
  }

  const items = (itemRows ?? []).map(mapItemRow);
  const userIds = Array.from(new Set(items.map((item) => item.userId)));

  const { data: userRows, error: usersError } = await admin
    .from('users')
    .select('id, push_token')
    .in('id', userIds);

  if (usersError) {
    return jsonResponse(
      request,
      { error: usersError.message },
      { status: 500 },
    );
  }

  const pushTokensByUserId = new Map(
    (userRows ?? []).map((user) => [user.id, user.push_token]),
  );

  let notified = 0;
  let skipped = 0;

  for (const item of items) {
    const pushToken = pushTokensByUserId.get(item.userId);

    if (typeof pushToken === 'string' && pushToken.trim().length > 0) {
      try {
        const result = await sendPushNotification({
          userId: item.userId,
          pushToken,
          title: 'Reminder from Bin',
          body: buildReminderMessage(item.cleanedText ?? item.rawInput),
          data: {
            action: 'open_item',
            itemId: item.id,
          },
        });

        if (result.delivered) {
          notified += 1;
        }
      } catch (error) {
        console.error('Failed to send reminder notification', {
          itemId: item.id,
          userId: item.userId,
          error,
        });
      }
    } else {
      skipped += 1;
    }

    const { error: updateError } = await admin
      .from('items')
      .update({
        reminder_status: 'sent',
      })
      .eq('id', item.id);

    if (updateError) {
      console.error('Failed to mark reminder as sent', {
        itemId: item.id,
        error: updateError,
      });
    }
  }

  return jsonResponse(request, {
    processed: items.length,
    notified,
    skipped,
  });
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
