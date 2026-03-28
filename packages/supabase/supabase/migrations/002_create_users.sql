create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  timezone text not null default 'UTC',
  auto_create_reminders boolean not null default false,
  auto_create_events boolean not null default false,
  push_token text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "users_select_own_profile"
  on public.users
  for select
  using (auth.uid() = id);

create policy "users_update_own_profile"
  on public.users
  for update
  using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
