import { ItemType, type Cluster, type Item } from '@bin/shared';
import type { Database } from '@bin/supabase';

type ClusterRow = Database['public']['Tables']['clusters']['Row'];

export function mapClusterRow(row: ClusterRow): Cluster {
  return {
    id: row.id,
    userId: row.user_id,
    label: row.label,
    parentClusterId: row.parent_cluster_id,
    typeScope: row.type_scope as ItemType | null,
    memberCount: row.member_count,
    createdAt: row.created_at,
    lastUpdatedAt: row.last_updated_at,
  };
}

export function getTopLevelCollections(
  clusters: Cluster[],
  items: Pick<Item, 'clusterIds'>[],
) {
  const topLevelIds = new Set<string>();

  for (const item of items) {
    for (const clusterId of item.clusterIds) {
      topLevelIds.add(clusterId);
    }
  }

  return clusters.filter(
    (cluster) => topLevelIds.has(cluster.id) && !cluster.parentClusterId,
  );
}

export function getChildClusters(clusters: Cluster[], parentClusterId: string) {
  return clusters.filter(
    (cluster) => cluster.parentClusterId === parentClusterId,
  );
}

export function buildClusterBreadcrumbs(
  clusters: Cluster[],
  clusterId: string,
) {
  const clustersById = new Map(
    clusters.map((cluster) => [cluster.id, cluster]),
  );
  const breadcrumb: Cluster[] = [];
  let current = clustersById.get(clusterId) ?? null;

  while (current) {
    breadcrumb.unshift(current);
    current = current.parentClusterId
      ? (clustersById.get(current.parentClusterId) ?? null)
      : null;
  }

  return breadcrumb;
}
