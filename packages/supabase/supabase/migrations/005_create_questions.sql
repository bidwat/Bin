create type public.question_status as enum ('pending', 'answered', 'dismissed');

create table if not exists public.questions (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid not null references public.items(id) on delete cascade,
  question text not null,
  confidence_score float not null default 0.5,
  status public.question_status not null default 'pending',
  answer text,
  created_at timestamptz not null default now(),
  answered_at timestamptz
);

alter table public.questions enable row level security;

create policy "users can access own questions"
  on public.questions
  for all
  using (
    exists (
      select 1
      from public.items
      where public.items.id = public.questions.item_id
        and public.items.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.items
      where public.items.id = public.questions.item_id
        and public.items.user_id = auth.uid()
    )
  );
