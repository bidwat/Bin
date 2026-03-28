create table if not exists public.user_corrections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  original_classification jsonb not null,
  corrected_classification jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.user_corrections enable row level security;

create policy "users can access own corrections"
  on public.user_corrections
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
