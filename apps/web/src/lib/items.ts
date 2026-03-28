import type { Item } from '@bin/shared';
import type { Database, Json } from '@bin/supabase';

type ItemRow = Database['public']['Tables']['items']['Row'];

function asEntityMap(value: Json): Item['entities'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Item['entities'];
}

export function mapItemRow(row: ItemRow): Item {
  return {
    id: row.id,
    userId: row.user_id,
    rawInput: row.raw_input,
    cleanedText: row.cleaned_text,
    source: row.source,
    type: row.type as Item['type'],
    actionability: row.actionability as Item['actionability'],
    entities: asEntityMap(row.entities),
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
