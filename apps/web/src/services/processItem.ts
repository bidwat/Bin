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

function normalizeEntities(entities: Record<string, unknown>) {
  const normalized: Record<string, unknown> = {
    ...entities,
    people: Array.isArray(entities.people) ? entities.people : [],
    dates: Array.isArray(entities.dates) ? entities.dates : [],
    places: Array.isArray(entities.places) ? entities.places : [],
    urls: Array.isArray(entities.urls) ? entities.urls : [],
    times: Array.isArray(entities.times) ? entities.times : [],
    companies: Array.isArray(entities.companies) ? entities.companies : [],
  };

  if (typeof entities.attachment_url === 'string') {
    normalized.attachment_url = entities.attachment_url;
  }

  return normalized as Json;
}

function mergeEntityMaps(
  existingEntities: Record<string, unknown>,
  classifiedEntities: {
    people: string[];
    dates: string[];
    places: string[];
    urls: string[];
  },
) {
  const unique = (values: string[]) => Array.from(new Set(values));

  const merged: Record<string, unknown> = {
    ...existingEntities,
    people: unique([
      ...(Array.isArray(existingEntities.people)
        ? existingEntities.people
        : []),
      ...classifiedEntities.people,
    ]),
    dates: unique([
      ...(Array.isArray(existingEntities.dates) ? existingEntities.dates : []),
      ...classifiedEntities.dates,
    ]),
    places: unique([
      ...(Array.isArray(existingEntities.places)
        ? existingEntities.places
        : []),
      ...classifiedEntities.places,
    ]),
    urls: unique([
      ...(Array.isArray(existingEntities.urls) ? existingEntities.urls : []),
      ...classifiedEntities.urls,
    ]),
    times: Array.isArray(existingEntities.times) ? existingEntities.times : [],
    companies: Array.isArray(existingEntities.companies)
      ? existingEntities.companies
      : [],
  };

  if (typeof existingEntities.attachment_url === 'string') {
    merged.attachment_url = existingEntities.attachment_url;
  }

  return merged;
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

async function fetchUserProfile(supabase: AdminClient, userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('timezone, auto_create_reminders')
    .eq('id', userId)
    .single();

  if (error || !data) {
    throw new ProcessItemError('Failed to load user profile', 500);
  }

  return data;
}

export async function processItem(itemId: string) {
  const env = getServerEnv();
  const supabase = createAdminSupabaseClient(
    env.supabaseUrl,
    env.supabaseSecretKey,
  );
  console.info('processItem started', { itemId });

  const item = await fetchItemOrThrow(supabase, itemId);

  if (item.processed) {
    throw new ProcessItemError('Item is already processed', 409);
  }

  const userMemoryStatements = await fetchUserMemoryStatements(
    supabase,
    item.user_id,
  );
  const userProfile = await fetchUserProfile(supabase, item.user_id);
  const classification = await classifyItem(
    item.raw_input,
    userMemoryStatements,
    {
      timezone: userProfile.timezone || 'UTC',
      nowIso: new Date().toISOString(),
    },
  );
  console.info('processItem classified item', {
    itemId,
    type: classification.type,
    actionability: classification.actionability,
    hasReminderAt: Boolean(classification.reminder_at),
  });
  const embedding = await embedText(
    classification.cleaned_text || item.raw_input,
  );

  const updates: Database['public']['Tables']['items']['Update'] = {
    cleaned_text: classification.cleaned_text,
    type: classification.type,
    actionability: classification.actionability,
    entities: normalizeEntities(
      mergeEntityMaps(
        item.entities &&
          typeof item.entities === 'object' &&
          !Array.isArray(item.entities)
          ? (item.entities as Record<string, unknown>)
          : {},
        classification.entities,
      ),
    ),
    embedding: serializeEmbedding(embedding),
    processed: true,
    reminder_at: classification.reminder_at,
    reminder_status:
      classification.reminder_at && userProfile.auto_create_reminders
        ? 'pending'
        : null,
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

  console.info('processItem completed', { itemId, processed: data.processed });
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
