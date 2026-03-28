import type { Database } from '@bin/supabase';

import { getAuthenticatedRouteContext } from '@/lib/auth';
import { jsonResponse, optionsResponse } from '@/lib/api-response';
import { mapItemRow } from '@/lib/items';
import { createItemSchema, listItemsSchema } from '@/lib/validation';

export async function POST(request: Request) {
  const { client: supabase, user } =
    await getAuthenticatedRouteContext(request);

  if (!user) {
    return jsonResponse(request, { error: 'Unauthorized' }, { status: 401 });
  }

  const parsedPayload = createItemSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsedPayload.success) {
    return jsonResponse(
      request,
      {
        error:
          parsedPayload.error.issues[0]?.message ?? 'Invalid capture payload',
      },
      { status: 422 },
    );
  }

  const insertPayload: Database['public']['Tables']['items']['Insert'] = {
    user_id: user.id,
    raw_input: parsedPayload.data.rawInput,
    source: 'manual',
  };

  const { data, error } = await supabase
    .from('items')
    // Supabase's server client loses insert inference here, so keep the payload
    // typed and isolate the cast at the API boundary.
    .insert(insertPayload as never)
    .select('*')
    .single();

  if (error || !data) {
    return jsonResponse(
      request,
      { error: error?.message ?? 'Failed to create item' },
      { status: 500 },
    );
  }

  return jsonResponse(request, { item: mapItemRow(data) }, { status: 201 });
}

export async function GET(request: Request) {
  const { client: supabase, user } =
    await getAuthenticatedRouteContext(request);

  if (!user) {
    return jsonResponse(request, { error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsedQuery = listItemsSchema.safeParse({
    limit: searchParams.get('limit') ?? undefined,
    cursor: searchParams.get('cursor') ?? undefined,
    type: searchParams.get('type') ?? undefined,
    actionability: searchParams.get('actionability') ?? undefined,
  });

  if (!parsedQuery.success) {
    return jsonResponse(
      request,
      { error: parsedQuery.error.issues[0]?.message ?? 'Invalid query' },
      { status: 422 },
    );
  }

  const { limit, cursor, type, actionability } = parsedQuery.data;

  let query = supabase
    .from('items')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  if (type) {
    query = query.eq('type', type as Database['public']['Enums']['item_type']);
  }

  if (actionability) {
    query = query.eq(
      'actionability',
      actionability as Database['public']['Enums']['actionability'],
    );
  }

  const { data, error } = await query;

  if (error || !data) {
    return jsonResponse(
      request,
      { error: error?.message ?? 'Failed to load items' },
      { status: 500 },
    );
  }

  const hasMore = data.length > limit;
  const items = data.slice(0, limit).map(mapItemRow);
  const nextCursor = hasMore
    ? (items[items.length - 1]?.createdAt ?? null)
    : null;

  return jsonResponse(request, { items, nextCursor });
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
