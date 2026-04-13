alter table public.clusters
  add column if not exists parent_cluster_id uuid references public.clusters(id) on delete cascade;

create index if not exists clusters_parent_cluster_idx
  on public.clusters(parent_cluster_id);
