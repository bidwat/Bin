import { createAdminSupabaseClient } from '@bin/supabase';

import { getServerEnv } from '@/lib/env';

type PushNotificationData = Record<string, string | number | boolean | null>;

type SendPushParams = {
  userId: string;
  pushToken: string;
  title: string;
  body: string;
  data?: PushNotificationData;
};

type ExpoPushResponse = {
  data?: Array<{
    status?: 'ok' | 'error';
    details?: {
      error?: string;
    };
    message?: string;
  }>;
};

async function clearInvalidPushToken(userId: string) {
  const env = getServerEnv();
  const admin = createAdminSupabaseClient(
    env.supabaseUrl,
    env.supabaseSecretKey,
  );

  await admin
    .from('users')
    .update({
      push_token: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
}

export async function sendPushNotification({
  userId,
  pushToken,
  title,
  body,
  data,
}: SendPushParams) {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: pushToken,
      sound: 'default',
      title,
      body,
      data,
    }),
  });

  const payload = (await response
    .json()
    .catch(() => null)) as ExpoPushResponse | null;

  if (!response.ok) {
    throw new Error('Failed to send push notification');
  }

  const ticket = payload?.data?.[0];
  const deviceNotRegistered =
    ticket?.status === 'error' &&
    ticket.details?.error === 'DeviceNotRegistered';

  if (deviceNotRegistered) {
    await clearInvalidPushToken(userId);
    return { delivered: false, invalidatedToken: true };
  }

  if (ticket?.status === 'error') {
    throw new Error(ticket.message ?? 'Push notification rejected');
  }

  return { delivered: true, invalidatedToken: false };
}
