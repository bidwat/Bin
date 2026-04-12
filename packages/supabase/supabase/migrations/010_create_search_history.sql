create table if not exists public.search_history (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  query text not null,
  created_at timestamptz not null default now()
);

alter table public.search_history enable row level security;

create index if not exists search_history_user_created_idx
  on public.search_history(user_id, created_at desc);

create policy "Users can view their own search history"
  on public.search_history
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own search history"
  on public.search_history
  for insert
  with check (auth.uid() = user_id);
