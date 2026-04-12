import type { ItemType as ItemTypeValue } from '@bin/shared';
import type { Database } from '@bin/supabase';
import { labelCluster } from '@bin/ai';
import { createAdminSupabaseClient } from '@bin/supabase';

import { getServerEnv } from '@/lib/env';

type SupabaseClient = ReturnType<typeof createAdminSupabaseClient>;
type ItemRow = Database['public']['Tables']['items']['Row'];
type ClusterInsert = Database['public']['Tables']['clusters']['Insert'];
type ClusterUpdate = Pick<
  Database['public']['Tables']['items']['Update'],
  'cluster_ids' | 'sub_cluster_id'
>;

type VectorItem = {
  id: string;
  type: ItemTypeValue;
  text: string;
  vector: number[];
};

type BuiltCluster = {
  id: string;
  label: string;
  centroid: number[];
  typeScope: ItemTypeValue;
  memberIds: string[];
  level: 'collection' | 'subcluster';
};

type ClusterSummary = {
  clustered: boolean;
  itemCount: number;
  collectionCount: number;
  subclusterCount: number;
};

const MIN_CLUSTER_ITEMS = 15;

function parseEmbedding(value: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const withoutBrackets = trimmed.replace(/^\[/, '').replace(/\]$/, '');

  if (!withoutBrackets) {
    return null;
  }

  const vector = withoutBrackets
    .split(',')
    .map((entry) => Number.parseFloat(entry.trim()))
    .filter((entry) => Number.isFinite(entry));

  return vector.length > 0 ? vector : null;
}

function serializeEmbedding(vector: number[]) {
  return `[${vector.join(',')}]`;
}

function averageVector(vectors: number[][]) {
  if (vectors.length === 0) {
    return [];
  }

  const centroid = new Array(vectors[0]?.length ?? 0).fill(0);

  for (const vector of vectors) {
    for (let index = 0; index < vector.length; index += 1) {
      centroid[index] += vector[index] ?? 0;
    }
  }

  return centroid.map((value) => value / vectors.length);
}

function cosineSimilarity(left: number[], right: number[]) {
  if (left.length === 0 || right.length === 0 || left.length !== right.length) {
    return 0;
  }

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dot += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function chooseInitialCentroids(points: VectorItem[], count: number) {
  const centroids: number[][] = [];

  if (points.length === 0) {
    return centroids;
  }

  centroids.push(points[0]!.vector);

  while (centroids.length < count) {
    let bestPoint = points[centroids.length % points.length]!.vector;
    let bestDistance = -1;

    for (const point of points) {
      const nearest = Math.max(
        ...centroids.map((centroid) =>
          cosineSimilarity(point.vector, centroid),
        ),
      );

      const distance = 1 - nearest;

      if (distance > bestDistance) {
        bestDistance = distance;
        bestPoint = point.vector;
      }
    }

    centroids.push(bestPoint);
  }

  return centroids;
}

function clusterPoints(points: VectorItem[], requestedCount: number) {
  if (points.length === 0) {
    return [];
  }

  const clusterCount = Math.max(1, Math.min(requestedCount, points.length));
  let centroids = chooseInitialCentroids(points, clusterCount);
  let assignments = new Array(points.length).fill(0);

  for (let iteration = 0; iteration < 12; iteration += 1) {
    let changed = false;

    assignments = points.map((point, pointIndex) => {
      let bestClusterIndex = 0;
      let bestSimilarity = -Infinity;

      for (
        let centroidIndex = 0;
        centroidIndex < centroids.length;
        centroidIndex += 1
      ) {
        const similarity = cosineSimilarity(
          point.vector,
          centroids[centroidIndex]!,
        );

        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestClusterIndex = centroidIndex;
        }
      }

      if (assignments[pointIndex] !== bestClusterIndex) {
        changed = true;
      }

      return bestClusterIndex;
    });

    const nextCentroids = centroids.map((_, centroidIndex) => {
      const vectors = points
        .filter((_, pointIndex) => assignments[pointIndex] === centroidIndex)
        .map((point) => point.vector);

      return vectors.length > 0
        ? averageVector(vectors)
        : centroids[centroidIndex]!;
    });

    centroids = nextCentroids;

    if (!changed) {
      break;
    }
  }

  return centroids
    .map((centroid, centroidIndex) => ({
      centroid,
      members: points.filter(
        (_, pointIndex) => assignments[pointIndex] === centroidIndex,
      ),
    }))
    .filter((cluster) => cluster.members.length > 0);
}

function chooseClusterCount(
  itemCount: number,
  bucketSize: number,
  maxClusters: number,
) {
  if (itemCount < MIN_CLUSTER_ITEMS) {
    return 0;
  }

  return Math.max(2, Math.min(Math.ceil(itemCount / bucketSize), maxClusters));
}

async function buildClusters(
  points: VectorItem[],
  typeScope: ItemTypeValue,
  level: 'collection' | 'subcluster',
  labelClusterFn: typeof labelCluster,
) {
  const clusterCount =
    level === 'collection'
      ? chooseClusterCount(points.length, 15, 8)
      : chooseClusterCount(points.length, 8, 5);

  if (clusterCount < 2) {
    return [];
  }

  const rawClusters = clusterPoints(points, clusterCount);
  const builtClusters: BuiltCluster[] = [];

  for (const rawCluster of rawClusters) {
    const sampleTexts = rawCluster.members
      .slice(0, 8)
      .map((member) => member.text)
      .filter(Boolean);

    const label =
      sampleTexts.length > 0
        ? await labelClusterFn(sampleTexts, typeScope, level)
        : `${typeScope} ${level}`;

    builtClusters.push({
      id: crypto.randomUUID(),
      label,
      centroid: rawCluster.centroid,
      typeScope,
      memberIds: rawCluster.members.map((member) => member.id),
      level,
    });
  }

  return builtClusters;
}

function determineCollectionMembership(
  item: VectorItem,
  clusters: BuiltCluster[],
  primaryClusterId: string,
) {
  const similarities = clusters
    .map((cluster) => ({
      id: cluster.id,
      similarity: cosineSimilarity(item.vector, cluster.centroid),
    }))
    .sort((left, right) => right.similarity - left.similarity);

  const primary = similarities[0]?.similarity ?? 0;

  return similarities
    .filter(
      (entry) =>
        entry.id === primaryClusterId ||
        (entry.similarity >= 0.78 && primary - entry.similarity <= 0.06),
    )
    .slice(0, 3)
    .map((entry) => entry.id);
}

async function fetchEmbeddableItems(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', userId)
    .eq('processed', true)
    .not('embedding', 'is', null)
    .not('type', 'is', null);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .map((row: ItemRow) => {
      const vector = parseEmbedding(row.embedding);

      if (!vector || !row.type) {
        return null;
      }

      return {
        id: row.id,
        type: row.type as ItemTypeValue,
        text: row.cleaned_text?.trim() || row.raw_input,
        vector,
      } satisfies VectorItem;
    })
    .filter(Boolean) as VectorItem[];
}

async function resetExistingClusters(supabase: SupabaseClient, userId: string) {
  const { error: itemsError } = await supabase
    .from('items')
    .update({
      cluster_ids: [],
      sub_cluster_id: null,
    } as Database['public']['Tables']['items']['Update'])
    .eq('user_id', userId);

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const { error: clustersError } = await supabase
    .from('clusters')
    .delete()
    .eq('user_id', userId);

  if (clustersError) {
    throw new Error(clustersError.message);
  }
}

export async function clusterItemsForUser(
  userId: string,
  deps?: {
    supabase?: SupabaseClient;
    labelClusterFn?: typeof labelCluster;
  },
): Promise<ClusterSummary> {
  const supabase =
    deps?.supabase ??
    (() => {
      const env = getServerEnv();
      return createAdminSupabaseClient(env.supabaseUrl, env.supabaseSecretKey);
    })();
  const labelClusterFn = deps?.labelClusterFn ?? labelCluster;

  const items = await fetchEmbeddableItems(supabase, userId);

  if (items.length < MIN_CLUSTER_ITEMS) {
    await resetExistingClusters(supabase, userId);
    return {
      clustered: false,
      itemCount: items.length,
      collectionCount: 0,
      subclusterCount: 0,
    };
  }

  const groupedByType = new Map<ItemTypeValue, VectorItem[]>();

  for (const item of items) {
    const group = groupedByType.get(item.type) ?? [];
    group.push(item);
    groupedByType.set(item.type, group);
  }

  const clusterRows: ClusterInsert[] = [];
  const itemUpdates = new Map<string, ClusterUpdate>();
  let collectionCount = 0;
  let subclusterCount = 0;

  for (const [typeScope, typedItems] of groupedByType.entries()) {
    const topLevelClusters = await buildClusters(
      typedItems,
      typeScope,
      'collection',
      labelClusterFn,
    );

    if (topLevelClusters.length === 0) {
      continue;
    }

    collectionCount += topLevelClusters.length;

    for (const cluster of topLevelClusters) {
      clusterRows.push({
        id: cluster.id,
        user_id: userId,
        label: cluster.label,
        centroid: serializeEmbedding(cluster.centroid),
        type_scope: cluster.typeScope,
        member_count: cluster.memberIds.length,
      });

      const members = typedItems.filter((item) =>
        cluster.memberIds.includes(item.id),
      );
      const subclusters = await buildClusters(
        members,
        typeScope,
        'subcluster',
        labelClusterFn,
      );

      for (const member of members) {
        const membership = determineCollectionMembership(
          member,
          topLevelClusters,
          cluster.id,
        );
        const current = itemUpdates.get(member.id) ?? {
          cluster_ids: [],
          sub_cluster_id: null,
        };

        current.cluster_ids = [
          ...new Set([...(current.cluster_ids ?? []), ...membership]),
        ];
        itemUpdates.set(member.id, current);
      }

      if (subclusters.length > 0) {
        subclusterCount += subclusters.length;

        for (const subcluster of subclusters) {
          clusterRows.push({
            id: subcluster.id,
            user_id: userId,
            label: subcluster.label,
            centroid: serializeEmbedding(subcluster.centroid),
            type_scope: subcluster.typeScope,
            member_count: subcluster.memberIds.length,
          });

          for (const memberId of subcluster.memberIds) {
            const current = itemUpdates.get(memberId) ?? {
              cluster_ids: [cluster.id],
              sub_cluster_id: null,
            };
            current.sub_cluster_id = subcluster.id;
            itemUpdates.set(memberId, current);
          }
        }
      }
    }
  }

  await resetExistingClusters(supabase, userId);

  if (clusterRows.length > 0) {
    const { error: insertError } = await supabase
      .from('clusters')
      .insert(clusterRows);

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  for (const [itemId, updates] of itemUpdates.entries()) {
    const { error } = await supabase
      .from('items')
      .update(updates as Database['public']['Tables']['items']['Update'])
      .eq('id', itemId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message);
    }
  }

  return {
    clustered: collectionCount > 0,
    itemCount: items.length,
    collectionCount,
    subclusterCount,
  };
}
