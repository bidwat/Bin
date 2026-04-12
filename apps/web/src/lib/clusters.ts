import { ItemType, type Cluster, type Item } from '@bin/shared';
import type { Database } from '@bin/supabase';

type ClusterRow = Database['public']['Tables']['clusters']['Row'];

export function mapClusterRow(row: ClusterRow): Cluster {
  return {
    id: row.id,
    userId: row.user_id,
    label: row.label,
    typeScope: row.type_scope as ItemType | null,
    memberCount: row.member_count,
    createdAt: row.created_at,
    lastUpdatedAt: row.last_updated_at,
  };
}

export function getTopLevelCollections(
  clusters: Cluster[],
  items: Pick<Item, 'clusterIds' | 'subClusterId'>[],
) {
  const topLevelIds = new Set<string>();
  const subClusterIds = new Set<string>();

  for (const item of items) {
    for (const clusterId of item.clusterIds) {
      topLevelIds.add(clusterId);
    }

    if (item.subClusterId) {
      subClusterIds.add(item.subClusterId);
    }
  }

  return clusters.filter(
    (cluster) => topLevelIds.has(cluster.id) && !subClusterIds.has(cluster.id),
  );
}

export function getChildSubclusters(
  clusters: Cluster[],
  items: Pick<Item, 'clusterIds' | 'subClusterId'>[],
  parentClusterId: string,
) {
  const subClusterIds = new Set<string>();

  for (const item of items) {
    if (!item.clusterIds.includes(parentClusterId) || !item.subClusterId) {
      continue;
    }

    subClusterIds.add(item.subClusterId);
  }

  return clusters.filter((cluster) => subClusterIds.has(cluster.id));
}
