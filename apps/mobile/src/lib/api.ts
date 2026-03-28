import type { Item } from '@bin/shared';
import type { Database } from '@bin/supabase';

import { supabase } from './supabase';

export type UserProfile = Database['public']['Tables']['users']['Row'];
type ItemRow = Database['public']['Tables']['items']['Row'];

function mapItemRow(row: ItemRow): Item {
  return {
    id: row.id,
    userId: row.user_id,
    rawInput: row.raw_input,
    cleanedText: row.cleaned_text,
    source: row.source,
    type: row.type as Item['type'],
    actionability: row.actionability as Item['actionability'],
    entities:
      row.entities &&
      typeof row.entities === 'object' &&
      !Array.isArray(row.entities)
        ? (row.entities as Item['entities'])
        : {},
    clusterIds: row.cluster_ids,
    subClusterId: row.sub_cluster_id,
    resurfacingScore: row.resurfacing_score,
    processed: row.processed,
    reminderStatus: row.reminder_status as Item['reminderStatus'],
    reminderAt: row.reminder_at,
    createdAt: row.created_at,
    lastSurfacedAt: row.last_surfaced_at,
  };
}

async function getCurrentUserId() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.id) {
    throw new Error('No authenticated session');
  }

  return session.user.id;
}

export async function fetchItems() {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to load items');
  }

  return {
    items: data.map(mapItemRow),
    nextCursor: null,
  };
}

export async function createItem(text: string) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('items')
    .insert({
      user_id: userId,
      raw_input: text,
      source: 'manual',
    } as Database['public']['Tables']['items']['Insert'])
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create item');
  }

  return { item: mapItemRow(data) };
}

export async function deleteItem(id: string) {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchItem(id: string) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to load item');
  }

  return { item: mapItemRow(data) };
}

export async function updateItem(
  id: string,
  updates: Partial<
    Pick<Item, 'cleanedText' | 'type' | 'actionability' | 'reminderAt'>
  >,
) {
  const userId = await getCurrentUserId();
  const payload: Database['public']['Tables']['items']['Update'] = {};

  if ('cleanedText' in updates) {
    payload.cleaned_text = updates.cleanedText ?? null;
  }
  if ('type' in updates) {
    payload.type = updates.type ?? null;
  }
  if ('actionability' in updates) {
    payload.actionability = updates.actionability ?? null;
  }
  if ('reminderAt' in updates) {
    payload.reminder_at = updates.reminderAt ?? null;
  }

  const { data, error } = await supabase
    .from('items')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update item');
  }

  return { item: mapItemRow(data) };
}

export async function fetchProfile() {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to load profile');
  }

  return { profile: data };
}

export async function updateProfile(
  updates: Partial<
    Pick<
      UserProfile,
      'timezone' | 'auto_create_events' | 'auto_create_reminders' | 'push_token'
    >
  >,
) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('users')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    } as Database['public']['Tables']['users']['Update'])
    .eq('id', userId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update profile');
  }

  return { profile: data };
}
