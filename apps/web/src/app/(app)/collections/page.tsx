import { CollectionCard } from '@/components/CollectionCard';
import { getTopLevelCollections, mapClusterRow } from '@/lib/clusters';
import { mapItemRow } from '@/lib/items';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function CollectionsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [{ data: clusterRows }, { data: itemRows }] = await Promise.all([
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

  const clusters = (clusterRows ?? []).map(mapClusterRow);
  const items = (itemRows ?? []).map(mapItemRow);
  const topLevelCollections = getTopLevelCollections(clusters, items);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-700">
          Collections
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
          Themes that emerged from your Bin
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Collections are generated from semantic similarity. They update as
          your captures evolve.
        </p>
      </header>

      {topLevelCollections.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/60 p-10 text-center text-slate-500">
          Collections appear once Bin has enough processed material to cluster.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {topLevelCollections.map((cluster) => (
            <CollectionCard
              key={cluster.id}
              cluster={cluster}
              href={`/collections/${cluster.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
