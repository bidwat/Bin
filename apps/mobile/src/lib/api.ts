import {
  ReminderStatus,
  type Actionability,
  type Cluster,
  type Item,
} from '@bin/shared';
import type { Database } from '@bin/supabase';
import { Platform } from 'react-native';

import {
  buildClusterBreadcrumbs,
  getChildClusters,
  getTopLevelCollections,
  mapClusterRow,
} from './clusters';
import { getMobileEnv } from './env';
import { supabase } from './supabase';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertUuid(id: string) {
  if (!uuidPattern.test(id)) {
    throw new Error('Invalid item id');
  }
}

export type UserProfile = Database['public']['Tables']['users']['Row'];
type ItemRow = Database['public']['Tables']['items']['Row'];
type ClusterRow = Database['public']['Tables']['clusters']['Row'];

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

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('No authenticated session');
  }

  return session.access_token;
}

async function getAuthHeaders() {
  return {
    Authorization: `Bearer ${await getAccessToken()}`,
  };
}

export async function fetchItems(
  type?: Item['type'] | null,
  actionability?: Actionability | null,
) {
  let query = supabase
    .from('items')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (type) {
    query = query.eq('type', type);
  }

  if (actionability) {
    query = query.eq('actionability', actionability);
  }

  const { data, error } = await query;

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to load items');
  }

  return {
    items: data.map(mapItemRow),
    nextCursor: null,
  };
}

export async function fetchCollections() {
  const [
    { data: clusterRows, error: clusterError },
    { data: itemRows, error: itemError },
  ] = await Promise.all([
    supabase
      .from('clusters')
      .select('*')
      .order('member_count', { ascending: false }),
    supabase.from('items').select('*').not('embedding', 'is', null),
  ]);

  if (clusterError) {
    throw new Error(clusterError.message);
  }

  if (itemError) {
    throw new Error(itemError.message);
  }

  const clusters = (clusterRows ?? []).map((row: ClusterRow) =>
    mapClusterRow(row),
  );
  const items = (itemRows ?? []).map((row: ItemRow) => mapItemRow(row));

  return getTopLevelCollections(clusters, items);
}

export async function fetchCollectionView(clusterId: string) {
  assertUuid(clusterId);

  const [
    { data: clusterRow, error: clusterError },
    { data: clusterRows, error: clustersError },
    { data: itemRows, error: itemsError },
  ] = await Promise.all([
    supabase.from('clusters').select('*').eq('id', clusterId).single(),
    supabase
      .from('clusters')
      .select('*')
      .order('member_count', { ascending: false }),
    supabase.from('items').select('*').contains('cluster_ids', [clusterId]),
  ]);

  if (clusterError || !clusterRow) {
    throw new Error(clusterError?.message ?? 'Collection not found');
  }

  if (clustersError) {
    throw new Error(clustersError.message);
  }

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const cluster = mapClusterRow(clusterRow as ClusterRow);
  const allClusters = (clusterRows ?? []).map((row: ClusterRow) =>
    mapClusterRow(row),
  );
  const allItems = (itemRows ?? []).map((row: ItemRow) => mapItemRow(row));
  const childClusters = getChildClusters(allClusters, clusterId);
  const breadcrumbs = buildClusterBreadcrumbs(allClusters, clusterId);

  return {
    cluster,
    childClusters,
    breadcrumbs,
    items: allItems,
  };
}

export async function updateClusterLabel(id: string, label: string) {
  assertUuid(id);

  const response = await fetch(
    `${getMobileEnv().apiBaseUrl}/api/clusters/${id}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(await getAuthHeaders()),
      },
      body: JSON.stringify({ label }),
    },
  );

  const payload = (await response.json().catch(() => null)) as {
    cluster?: Cluster;
    error?: string;
  } | null;

  if (!response.ok || !payload?.cluster) {
    throw new Error(payload?.error ?? 'Unable to update collection');
  }

  return payload.cluster;
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

export async function transcribeVoiceCapture(
  uri: string,
  mimeType = 'audio/mp4',
) {
  const formData = new FormData();
  formData.append('mode', 'preview');
  formData.append('source', 'voice');

  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    formData.append(
      'audio',
      new File([blob], 'capture.webm', {
        type: blob.type || 'audio/webm',
      }),
    );
  } else {
    formData.append('audio', {
      uri,
      name: 'capture.m4a',
      type: mimeType,
    } as unknown as Blob);
  }

  const response = await fetch(`${getMobileEnv().apiBaseUrl}/api/items/voice`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as {
    transcript?: string;
    error?: string;
  } | null;

  if (!response.ok || !payload?.transcript) {
    throw new Error(payload?.error ?? 'Voice transcription failed');
  }

  return payload.transcript;
}

export async function createVoiceItem(uri: string, mimeType = 'audio/mp4') {
  const formData = new FormData();
  formData.append('source', 'voice');

  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    formData.append(
      'audio',
      new File([blob], 'capture.webm', {
        type: blob.type || mimeType,
      }),
    );
  } else {
    formData.append('audio', {
      uri,
      name: 'capture.m4a',
      type: mimeType,
    } as unknown as Blob);
  }

  const response = await fetch(`${getMobileEnv().apiBaseUrl}/api/items/voice`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as {
    item?: Item;
    error?: string;
  } | null;

  if (!response.ok || !payload?.item) {
    throw new Error(payload?.error ?? 'Voice capture failed');
  }

  return payload.item;
}

export async function createImageItem(uri: string, mimeType = 'image/jpeg') {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    formData.append(
      'image',
      new File([blob], 'capture.jpg', {
        type: blob.type || mimeType,
      }),
    );
  } else {
    formData.append('image', {
      uri,
      name: 'capture.jpg',
      type: mimeType,
    } as unknown as Blob);
  }

  const response = await fetch(`${getMobileEnv().apiBaseUrl}/api/items/image`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as {
    item?: Item;
    error?: string;
  } | null;

  if (!response.ok || !payload?.item) {
    throw new Error(payload?.error ?? 'Image capture failed');
  }

  return payload.item;
}

export async function deleteItem(id: string) {
  assertUuid(id);
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
  assertUuid(id);
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
    Pick<
      Item,
      'cleanedText' | 'type' | 'actionability' | 'reminderAt' | 'reminderStatus'
    >
  >,
) {
  assertUuid(id);
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
  if ('reminderStatus' in updates) {
    payload.reminder_status = updates.reminderStatus ?? null;
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

export async function snoozeReminder(
  id: string,
  snoozeMinutes: 15 | 30 | 60 | 120 | 1440,
) {
  assertUuid(id);

  const response = await fetch(
    `${getMobileEnv().apiBaseUrl}/api/items/${id}/snooze`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await getAuthHeaders()),
      },
      body: JSON.stringify({ snooze_minutes: snoozeMinutes }),
    },
  );

  const payload = (await response.json().catch(() => null)) as {
    item?: Item;
    error?: string;
  } | null;

  if (!response.ok || !payload?.item) {
    throw new Error(payload?.error ?? 'Failed to snooze reminder');
  }

  return payload.item;
}

export async function dismissReminder(id: string) {
  const { item } = await updateItem(id, {
    reminderStatus: ReminderStatus.Dismissed,
  });

  return item;
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
