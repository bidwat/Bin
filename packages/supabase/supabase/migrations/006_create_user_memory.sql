create type public.memory_source as enum ('onboarding', 'inferred');

create table if not exists public.user_memory (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  statement text not null,
  confidence_score float not null default 0.5,
  source public.memory_source not null default 'inferred',
  created_at timestamptz not null default now(),
  last_reinforced_at timestamptz not null default now()
);

alter table public.user_memory enable row level security;

create policy "users can access own memory"
  on public.user_memory
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
