import type { Database } from '@bin/supabase';

import { getAuthenticatedRouteContext } from '@/lib/auth';
import {
  emptyResponse,
  jsonResponse,
  optionsResponse,
} from '@/lib/api-response';
import { mapItemRow } from '@/lib/items';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: Request, context: RouteContext) {
  const { client: supabase, user } =
    await getAuthenticatedRouteContext(request);

  if (!user) {
    return jsonResponse(request, { error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return jsonResponse(request, { error: error.message }, { status: 500 });
  }

  return emptyResponse(request, { status: 204 });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { client: supabase, user } =
    await getAuthenticatedRouteContext(request);

  if (!user) {
    return jsonResponse(request, { error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const payload = (await request.json().catch(() => null)) as {
    cleaned_text?: string | null;
    type?: Database['public']['Enums']['item_type'] | null;
    actionability?: Database['public']['Enums']['actionability'] | null;
    reminder_at?: string | null;
  } | null;

  if (!payload) {
    return jsonResponse(request, { error: 'Invalid payload' }, { status: 400 });
  }

  const updates: Database['public']['Tables']['items']['Update'] = {};

  if ('cleaned_text' in payload)
    updates.cleaned_text = payload.cleaned_text ?? null;
  if ('type' in payload) updates.type = payload.type ?? null;
  if ('actionability' in payload) {
    updates.actionability = payload.actionability ?? null;
  }
  if ('reminder_at' in payload)
    updates.reminder_at = payload.reminder_at ?? null;

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
      { error: error?.message ?? 'Failed to update item' },
      { status: 500 },
    );
  }

  return jsonResponse(request, { item: mapItemRow(data) });
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
