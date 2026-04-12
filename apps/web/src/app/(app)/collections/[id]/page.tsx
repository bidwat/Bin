import { notFound } from 'next/navigation';

import { CollectionDetailClient } from '@/components/CollectionDetailClient';
import { getChildSubclusters, mapClusterRow } from '@/lib/clusters';
import { mapItemRow } from '@/lib/items';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type CollectionDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ sub?: string }>;
};

export default async function CollectionDetailPage({
  params,
  searchParams,
}: CollectionDetailPageProps) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;
  const selectedSubclusterId = (await searchParams)?.sub ?? null;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [{ data: clusterRow }, { data: clusterRows }, { data: itemRows }] =
    await Promise.all([
      supabase
        .from('clusters')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('clusters')
        .select('*')
        .eq('user_id', user.id)
        .order('member_count', { ascending: false }),
      supabase
        .from('items')
        .select('*')
        .eq('user_id', user.id)
        .contains('cluster_ids', [id]),
    ]);

  if (!clusterRow) {
    notFound();
  }

  const cluster = mapClusterRow(clusterRow);
  const allClusters = (clusterRows ?? []).map(mapClusterRow);
  const collectionItems = (itemRows ?? []).map(mapItemRow);
  const subclusters = getChildSubclusters(
    allClusters,
    collectionItems,
    cluster.id,
  );
  const visibleItems = selectedSubclusterId
    ? collectionItems.filter(
        (item) => item.subClusterId === selectedSubclusterId,
      )
    : collectionItems;

  return (
    <CollectionDetailClient
      cluster={cluster}
      subclusters={subclusters}
      items={visibleItems}
      selectedSubclusterId={selectedSubclusterId}
    />
  );
}
