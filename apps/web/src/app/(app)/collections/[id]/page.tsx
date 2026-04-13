import { notFound } from 'next/navigation';

import { CollectionDetailClient } from '@/components/CollectionDetailClient';
import {
  buildClusterBreadcrumbs,
  getChildClusters,
  mapClusterRow,
} from '@/lib/clusters';
import { mapItemRow } from '@/lib/items';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type CollectionDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CollectionDetailPage({
  params,
}: CollectionDetailPageProps) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;
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
  const childClusters = getChildClusters(allClusters, cluster.id);
  const breadcrumbs = buildClusterBreadcrumbs(allClusters, cluster.id);

  return (
    <CollectionDetailClient
      cluster={cluster}
      childClusters={childClusters}
      breadcrumbs={breadcrumbs}
      items={collectionItems}
    />
  );
}
