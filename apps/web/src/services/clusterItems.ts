import type { ItemType as ItemTypeValue } from '@bin/shared';
import type { Database } from '@bin/supabase';
import { labelCluster } from '@bin/ai';
import { createAdminSupabaseClient } from '@bin/supabase';

import { getServerEnv } from '@/lib/env';

type SupabaseClient = ReturnType<typeof createAdminSupabaseClient>;
type ItemRow = Database['public']['Tables']['items']['Row'];
type ClusterInsert = Database['public']['Tables']['clusters']['Insert'];

type VectorItem = {
  id: string;
  type: ItemTypeValue;
  actionability: Database['public']['Enums']['actionability'] | null;
  text: string;
  vector: number[];
};

type BuiltCluster = {
  id: string;
  label: string;
  centroid: number[];
  typeScope: ItemTypeValue;
  parentClusterId: string | null;
  memberIds: string[];
  depth: number;
};

type ItemAssignment = {
  clusterIds: Set<string>;
  deepestClusterId: string | null;
  deepestDepth: number;
};

type ClusterSummary = {
  clustered: boolean;
  itemCount: number;
  collectionCount: number;
  subclusterCount: number;
};

const MIN_CLUSTER_ITEMS = 8;
const MAX_CLUSTER_DEPTH = 4;

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

function getDominantTypeScope(points: VectorItem[]) {
  const counts = new Map<ItemTypeValue, number>();

  for (const point of points) {
    counts.set(point.type, (counts.get(point.type) ?? 0) + 1);
  }

  let winner: ItemTypeValue | null = null;
  let winnerCount = 0;

  for (const [type, count] of counts.entries()) {
    if (count > winnerCount) {
      winner = type;
      winnerCount = count;
    }
  }

  return winner;
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

function chooseClusterCount(itemCount: number, depth: number) {
  if (itemCount < MIN_CLUSTER_ITEMS || depth > MAX_CLUSTER_DEPTH) {
    return 0;
  }

  const bucketSize = depth === 0 ? 20 : 12;
  const maxClusters = depth === 0 ? 5 : 4;

  return Math.max(2, Math.min(Math.ceil(itemCount / bucketSize), maxClusters));
}

async function buildClusters(
  points: VectorItem[],
  typeScope: ItemTypeValue,
  depth: number,
  parentClusterId: string | null,
  labelClusterFn: typeof labelCluster,
) {
  const clusterCount = chooseClusterCount(points.length, depth);

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
        ? await labelClusterFn(
            sampleTexts,
            typeScope,
            depth === 0 ? 'collection' : 'subcluster',
          )
        : `${typeScope} cluster`;

    builtClusters.push({
      id: crypto.randomUUID(),
      label,
      centroid: rawCluster.centroid,
      typeScope,
      parentClusterId,
      memberIds: rawCluster.members.map((member) => member.id),
      depth,
    });
  }

  return builtClusters;
}

function determineTopLevelMembership(
  item: VectorItem,
  clusters: BuiltCluster[],
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
      (entry) => entry.similarity >= 0.72 && primary - entry.similarity <= 0.08,
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
        actionability: row.actionability,
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

function assignCluster(
  itemAssignments: Map<string, ItemAssignment>,
  itemId: string,
  clusterId: string,
  depth: number,
) {
  const current = itemAssignments.get(itemId) ?? {
    clusterIds: new Set<string>(),
    deepestClusterId: null,
    deepestDepth: -1,
  };

  current.clusterIds.add(clusterId);

  if (depth > current.deepestDepth && depth > 0) {
    current.deepestDepth = depth;
    current.deepestClusterId = clusterId;
  }

  itemAssignments.set(itemId, current);
}

async function buildClusterTree(
  points: VectorItem[],
  typeScope: ItemTypeValue,
  depth: number,
  parentClusterId: string | null,
  clusterRows: ClusterInsert[],
  itemAssignments: Map<string, ItemAssignment>,
  labelClusterFn: typeof labelCluster,
) {
  const clusters = await buildClusters(
    points,
    typeScope,
    depth,
    parentClusterId,
    labelClusterFn,
  );

  for (const cluster of clusters) {
    clusterRows.push({
      id: cluster.id,
      user_id: '',
      label: cluster.label,
      centroid: serializeEmbedding(cluster.centroid),
      parent_cluster_id: cluster.parentClusterId,
      type_scope: cluster.typeScope,
      member_count: cluster.memberIds.length,
    });

    const members = points.filter((item) =>
      cluster.memberIds.includes(item.id),
    );

    for (const member of members) {
      assignCluster(itemAssignments, member.id, cluster.id, cluster.depth);
    }

    await buildClusterTree(
      members,
      typeScope,
      depth + 1,
      cluster.id,
      clusterRows,
      itemAssignments,
      labelClusterFn,
    );
  }

  return clusters;
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

  const clusterRows: ClusterInsert[] = [];
  const itemAssignments = new Map<string, ItemAssignment>();
  let collectionCount = 0;
  let subclusterCount = 0;
  const topLevelTypeScope = getDominantTypeScope(items) ?? items[0]!.type;
  const topLevelClusters = await buildClusters(
    items,
    topLevelTypeScope,
    0,
    null,
    labelClusterFn,
  );

  if (topLevelClusters.length > 0) {
    collectionCount += topLevelClusters.length;

    for (const item of items) {
      const memberships = determineTopLevelMembership(item, topLevelClusters);

      for (const clusterId of memberships) {
        assignCluster(itemAssignments, item.id, clusterId, 0);
      }
    }

    for (const cluster of topLevelClusters) {
      clusterRows.push({
        id: cluster.id,
        user_id: userId,
        label: cluster.label,
        centroid: serializeEmbedding(cluster.centroid),
        parent_cluster_id: null,
        type_scope: cluster.typeScope,
        member_count: cluster.memberIds.length,
      });

      const members = items.filter((item) =>
        cluster.memberIds.includes(item.id),
      );
      const beforeCount = clusterRows.length;
      const childTypeScope = getDominantTypeScope(members) ?? cluster.typeScope;

      await buildClusterTree(
        members,
        childTypeScope,
        1,
        cluster.id,
        clusterRows,
        itemAssignments,
        labelClusterFn,
      );

      subclusterCount += clusterRows.length - beforeCount;
    }
  }

  await resetExistingClusters(supabase, userId);

  if (clusterRows.length > 0) {
    const finalClusterRows = clusterRows.map((row) => ({
      ...row,
      user_id: userId,
    }));
    const { error: insertError } = await supabase
      .from('clusters')
      .insert(finalClusterRows);

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  for (const [itemId, assignment] of itemAssignments.entries()) {
    const { error } = await supabase
      .from('items')
      .update({
        cluster_ids: [...assignment.clusterIds],
        sub_cluster_id: assignment.deepestClusterId,
      } as Database['public']['Tables']['items']['Update'])
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
