import type { Database } from '@bin/supabase';

import { getAuthenticatedRouteContext } from '@/lib/auth';
import { jsonResponse, optionsResponse } from '@/lib/api-response';
import { isUuid } from '@/lib/ids';
import { mapItemRow } from '@/lib/items';
import { snoozeReminderSchema } from '@/lib/validation';

type RouteContext = {
  params: Promise<{ id: string }>;
};

function addMinutes(baseDate: Date, minutes: number) {
  return new Date(baseDate.getTime() + minutes * 60 * 1000);
}

export async function POST(request: Request, context: RouteContext) {
  const { client: supabase, user } =
    await getAuthenticatedRouteContext(request);

  if (!user) {
    return jsonResponse(request, { error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isUuid(id)) {
    return jsonResponse(request, { error: 'Invalid item id' }, { status: 422 });
  }

  const parsedPayload = snoozeReminderSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsedPayload.success) {
    return jsonResponse(
      request,
      { error: parsedPayload.error.issues[0]?.message ?? 'Invalid payload' },
      { status: 422 },
    );
  }

  const reminderAt = addMinutes(new Date(), parsedPayload.data.snooze_minutes);
  const updates: Database['public']['Tables']['items']['Update'] = {
    reminder_at: reminderAt.toISOString(),
    reminder_status: 'snoozed',
  };

  const { data, error } = await supabase
    .from('items')
    .update(updates as never)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (error || !data) {
    return jsonResponse(
      request,
      { error: error?.message ?? 'Failed to snooze reminder' },
      { status: 500 },
    );
  }

  return jsonResponse(request, { item: mapItemRow(data) });
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
