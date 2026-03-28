create type public.item_type as enum ('task', 'reminder', 'idea', 'person', 'event', 'reference', 'note');
create type public.actionability as enum ('now', 'soon', 'eventually', 'never');
create type public.reminder_status as enum ('pending', 'sent', 'dismissed', 'snoozed');

create table if not exists public.items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  raw_input text not null,
  cleaned_text text,
  source text not null default 'manual',
  type public.item_type,
  actionability public.actionability,
  entities jsonb not null default '{}',
  embedding vector(1536),
  cluster_ids uuid[] not null default '{}',
  sub_cluster_id uuid,
  resurfacing_score float not null default 1.0,
  processed boolean not null default false,
  reminder_status public.reminder_status,
  reminder_at timestamptz,
  created_at timestamptz not null default now(),
  last_surfaced_at timestamptz
);

alter table public.items enable row level security;

create policy "users can CRUD own items"
  on public.items
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index items_user_id_idx on public.items(user_id);
create index items_created_at_idx on public.items(created_at desc);
create index items_processed_idx on public.items(processed) where processed = false;
