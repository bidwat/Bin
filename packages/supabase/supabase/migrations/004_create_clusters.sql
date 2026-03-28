create table if not exists public.clusters (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  label text not null,
  centroid vector(1536),
  type_scope public.item_type,
  member_count integer not null default 0,
  created_at timestamptz not null default now(),
  last_updated_at timestamptz not null default now()
);

alter table public.clusters enable row level security;

create policy "users can access own clusters"
  on public.clusters
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
