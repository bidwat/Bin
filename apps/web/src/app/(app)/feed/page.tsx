import { ItemType } from '@bin/shared';

import { FeedList } from '@/components/FeedList';
import { getTopLevelCollections, mapClusterRow } from '@/lib/clusters';
import { mapItemRow } from '@/lib/items';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type FeedPageProps = {
  searchParams?: Promise<{
    type?: string;
  }>;
};

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const supabase = await createSupabaseServerClient();
  const params = (await searchParams) ?? {};
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const selectedType = Object.values(ItemType).includes(params.type as ItemType)
    ? (params.type as ItemType)
    : null;

  let query = supabase
    .from('items')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (selectedType) {
    query = query.eq('type', selectedType);
  }

  const { data, error } = await query;

  if (!user) {
    return null;
  }

  const items = error || !data ? [] : data.map(mapItemRow);
  const [{ data: clusterRows }, { data: allItemRows }] = await Promise.all([
    supabase
      .from('clusters')
      .select('*')
      .eq('user_id', user.id)
      .order('member_count', { ascending: false }),
    supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .not('embedding', 'is', null),
  ]);
  const collections = getTopLevelCollections(
    (clusterRows ?? []).map(mapClusterRow),
    (allItemRows ?? []).map(mapItemRow),
  );

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-700">
          Feed
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
          Everything you have dropped into Bin
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          The feed is live, newest-first, and ready for the AI pipeline that
          will land in the next phase.
        </p>
      </header>

      <FeedList
        initialItems={items}
        initialCollections={collections}
        userId={user.id}
      />
    </div>
  );
}
