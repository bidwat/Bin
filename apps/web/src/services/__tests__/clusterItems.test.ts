import { describe, expect, it } from 'vitest';

import { clusterItemsForUser } from '@/services/clusterItems';

type ItemRow = {
  id: string;
  user_id: string;
  raw_input: string;
  cleaned_text: string | null;
  source: string;
  type: 'idea';
  actionability: 'eventually';
  entities: Record<string, never>;
  embedding: string;
  cluster_ids: string[];
  sub_cluster_id: string | null;
  resurfacing_score: number;
  processed: boolean;
  reminder_status: null;
  reminder_at: null;
  created_at: string;
  last_surfaced_at: null;
};

type ClusterRow = {
  id: string;
  user_id: string;
  label: string;
  centroid: string | null;
  parent_cluster_id?: string | null;
  type_scope: 'idea';
  member_count: number;
  created_at?: string;
  last_updated_at?: string;
};

function formatEmbedding(x: number, y: number) {
  return `[${x},${y}]`;
}

function createItems() {
  const items: ItemRow[] = [];

  for (let index = 0; index < 18; index += 1) {
    items.push({
      id: `group-a-${index}`,
      user_id: 'user-1',
      raw_input: `Startup idea ${index}`,
      cleaned_text: `Startup idea ${index}`,
      source: 'manual',
      type: 'idea',
      actionability: 'eventually',
      entities: {},
      embedding: formatEmbedding(1, index / 100),
      cluster_ids: [],
      sub_cluster_id: null,
      resurfacing_score: 1,
      processed: true,
      reminder_status: null,
      reminder_at: null,
      created_at: new Date().toISOString(),
      last_surfaced_at: null,
    });
  }

  for (let index = 0; index < 18; index += 1) {
    items.push({
      id: `group-b-${index}`,
      user_id: 'user-1',
      raw_input: `Fitness goal ${index}`,
      cleaned_text: `Fitness goal ${index}`,
      source: 'manual',
      type: 'idea',
      actionability: 'eventually',
      entities: {},
      embedding: formatEmbedding(index / 100, 1),
      cluster_ids: [],
      sub_cluster_id: null,
      resurfacing_score: 1,
      processed: true,
      reminder_status: null,
      reminder_at: null,
      created_at: new Date().toISOString(),
      last_surfaced_at: null,
    });
  }

  return items;
}

function createFakeSupabase(initialItems: ItemRow[]) {
  const state = {
    items: [...initialItems],
    clusters: [] as ClusterRow[],
  };

  return {
    state,
    from(table: string) {
      if (table === 'items') {
        return {
          select() {
            const filters: Array<(item: ItemRow) => boolean> = [];

            const runner = {
              eq(field: keyof ItemRow, value: unknown) {
                filters.push((item) => item[field] === value);
                return runner;
              },
              not(field: keyof ItemRow, _operator: string, value: unknown) {
                filters.push((item) => item[field] !== value);
                return runner;
              },
              then(resolve: (value: { data: ItemRow[]; error: null }) => void) {
                resolve({
                  data: state.items.filter((item) =>
                    filters.every((filter) => filter(item)),
                  ),
                  error: null,
                });
              },
            };

            return runner;
          },
          update(updates: Partial<ItemRow>) {
            const filters: Array<(item: ItemRow) => boolean> = [];

            const runner = {
              eq(field: keyof ItemRow, value: unknown) {
                filters.push((item) => item[field] === value);

                return {
                  ...runner,
                  then(resolve: (value: { data: null; error: null }) => void) {
                    state.items = state.items.map((item) =>
                      filters.every((filter) => filter(item))
                        ? { ...item, ...updates }
                        : item,
                    );
                    resolve({ data: null, error: null });
                  },
                };
              },
              then(resolve: (value: { data: null; error: null }) => void) {
                state.items = state.items.map((item) =>
                  filters.every((filter) => filter(item))
                    ? { ...item, ...updates }
                    : item,
                );
                resolve({ data: null, error: null });
              },
            };

            return runner;
          },
        };
      }

      if (table === 'clusters') {
        return {
          delete() {
            return {
              eq(field: keyof ClusterRow, value: unknown) {
                state.clusters = state.clusters.filter(
                  (cluster) => cluster[field] !== value,
                );
                return Promise.resolve({ data: null, error: null });
              },
            };
          },
          insert(rows: ClusterRow[]) {
            state.clusters.push(...rows);
            return Promise.resolve({ data: rows, error: null });
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

describe('clusterItemsForUser', () => {
  it('builds recursive collection assignments for processed items', async () => {
    const fakeSupabase = createFakeSupabase(createItems());

    const summary = await clusterItemsForUser('user-1', {
      supabase: fakeSupabase as never,
      labelClusterFn: async (_texts, _typeScope, level) =>
        level === 'collection' ? 'Top Cluster' : 'Sub Cluster',
    });

    expect(summary.clustered).toBe(true);
    expect(summary.collectionCount).toBeGreaterThanOrEqual(2);
    expect(fakeSupabase.state.clusters.length).toBeGreaterThanOrEqual(4);
    expect(
      fakeSupabase.state.items.every((item) => item.cluster_ids.length > 0),
    ).toBe(true);
    expect(
      fakeSupabase.state.items.some((item) => item.sub_cluster_id !== null),
    ).toBe(true);
    expect(
      fakeSupabase.state.clusters.some(
        (cluster) => cluster.parent_cluster_id !== null,
      ),
    ).toBe(true);
    const topLevelClusterIds = new Set(
      fakeSupabase.state.clusters
        .filter((cluster) => !cluster.parent_cluster_id)
        .map((cluster) => cluster.id),
    );
    expect(
      fakeSupabase.state.items.every((item) =>
        item.cluster_ids.some((clusterId) => topLevelClusterIds.has(clusterId)),
      ),
    ).toBe(true);
    expect(
      fakeSupabase.state.clusters.every((cluster) =>
        ['Top Cluster', 'Sub Cluster'].includes(cluster.label),
      ),
    ).toBe(true);
  });
});
