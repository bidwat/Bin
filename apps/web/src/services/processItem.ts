import { classifyItem, embedText } from '@bin/ai';
import { createAdminSupabaseClient } from '@bin/supabase';
import type { Database, Json } from '@bin/supabase';

import { getServerEnv } from '@/lib/env';
import { mapItemRow } from '@/lib/items';

type AdminClient = ReturnType<typeof createAdminSupabaseClient>;
type ItemRow = Database['public']['Tables']['items']['Row'];

export class ProcessItemError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = 'ProcessItemError';
    this.status = status;
  }
}

function serializeEmbedding(embedding: number[]) {
  return `[${embedding.join(',')}]`;
}

function normalizeEntities(entities: {
  people: string[];
  dates: string[];
  places: string[];
  urls: string[];
}) {
  return {
    people: entities.people,
    dates: entities.dates,
    places: entities.places,
    urls: entities.urls,
  } satisfies Json;
}

async function fetchItemOrThrow(supabase: AdminClient, itemId: string) {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('id', itemId)
    .single();

  if (error || !data) {
    throw new ProcessItemError('Item not found', 404);
  }

  return data;
}

async function fetchUserMemoryStatements(
  supabase: AdminClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from('user_memory')
    .select('statement')
    .eq('user_id', userId)
    .order('confidence_score', { ascending: false })
    .limit(10);

  if (error || !data) {
    throw new ProcessItemError('Failed to load user memory', 500);
  }

  return data.map((entry) => entry.statement);
}

export async function processItem(itemId: string) {
  const env = getServerEnv();
  const supabase = createAdminSupabaseClient(
    env.supabaseUrl,
    env.supabaseSecretKey,
  );

  const item = await fetchItemOrThrow(supabase, itemId);

  if (item.processed) {
    throw new ProcessItemError('Item is already processed', 409);
  }

  const userMemoryStatements = await fetchUserMemoryStatements(
    supabase,
    item.user_id,
  );
  const classification = await classifyItem(
    item.raw_input,
    userMemoryStatements,
  );
  const embedding = await embedText(
    classification.cleaned_text || item.raw_input,
  );

  const updates: Database['public']['Tables']['items']['Update'] = {
    cleaned_text: classification.cleaned_text,
    type: classification.type,
    actionability: classification.actionability,
    entities: normalizeEntities(classification.entities),
    embedding: serializeEmbedding(embedding),
    processed: true,
    reminder_at: classification.reminder_at,
  };

  const { data, error } = await supabase
    .from('items')
    .update(updates)
    .eq('id', item.id)
    .eq('user_id', item.user_id)
    .select('*')
    .single();

  if (error || !data) {
    throw new ProcessItemError('Failed to update processed item', 500);
  }

  return mapItemRow(data);
}

export async function getProcessableItemForUser(
  itemId: string,
  userId: string,
): Promise<ItemRow> {
  const env = getServerEnv();
  const supabase = createAdminSupabaseClient(
    env.supabaseUrl,
    env.supabaseSecretKey,
  );
  const item = await fetchItemOrThrow(supabase, itemId);

  if (item.user_id !== userId) {
    throw new ProcessItemError('Item not found', 404);
  }

  return item;
}
