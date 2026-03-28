import type { Database } from '@bin/supabase';

import { getAuthenticatedRouteContext } from '@/lib/auth';
import { jsonResponse, optionsResponse } from '@/lib/api-response';
import { updateProfileSchema } from '@/lib/validation';

export async function GET(request: Request) {
  const { client: supabase, user } =
    await getAuthenticatedRouteContext(request);

  if (!user) {
    return jsonResponse(request, { error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    return jsonResponse(
      request,
      { error: error?.message ?? 'Failed to load profile' },
      { status: 500 },
    );
  }

  return jsonResponse(request, { profile: data });
}

export async function PATCH(request: Request) {
  const { client: supabase, user } =
    await getAuthenticatedRouteContext(request);

  if (!user) {
    return jsonResponse(request, { error: 'Unauthorized' }, { status: 401 });
  }

  const parsedPayload = updateProfileSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsedPayload.success) {
    return jsonResponse(
      request,
      { error: parsedPayload.error.issues[0]?.message ?? 'Invalid payload' },
      { status: 422 },
    );
  }

  const updates: Database['public']['Tables']['users']['Update'] = {
    updated_at: new Date().toISOString(),
  };
  const payload = parsedPayload.data;

  if (typeof payload.timezone === 'string' && payload.timezone.trim()) {
    updates.timezone = payload.timezone.trim();
  }
  if (typeof payload.auto_create_reminders === 'boolean') {
    updates.auto_create_reminders = payload.auto_create_reminders;
  }
  if (typeof payload.auto_create_events === 'boolean') {
    updates.auto_create_events = payload.auto_create_events;
  }
  if ('push_token' in payload) {
    updates.push_token = payload.push_token ?? null;
  }

  const { data, error } = await supabase
    .from('users')
    .update(updates as never)
    .eq('id', user.id)
    .select('*')
    .single();

  if (error || !data) {
    return jsonResponse(
      request,
      { error: error?.message ?? 'Failed to update profile' },
      { status: 500 },
    );
  }

  return jsonResponse(request, { profile: data });
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
