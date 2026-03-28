import type { Database } from '@bin/supabase';

import { getAuthenticatedRouteContext } from '@/lib/auth';
import { jsonResponse, optionsResponse } from '@/lib/api-response';

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

  const payload = (await request.json().catch(() => null)) as {
    timezone?: string;
    auto_create_reminders?: boolean;
    auto_create_events?: boolean;
    push_token?: string | null;
  } | null;

  if (!payload) {
    return jsonResponse(request, { error: 'Invalid payload' }, { status: 400 });
  }

  const updates: Database['public']['Tables']['users']['Update'] = {
    updated_at: new Date().toISOString(),
  };

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
