create or replace function public.match_items(
  query_embedding vector(1536),
  match_user_id uuid,
  match_threshold float default 0.7,
  match_count int default 20
)
returns table (
  id uuid,
  raw_input text,
  cleaned_text text,
  type public.item_type,
  actionability public.actionability,
  similarity float,
  created_at timestamptz
)
language plpgsql
as $$
begin
  return query
  select
    i.id,
    i.raw_input,
    i.cleaned_text,
    i.type,
    i.actionability,
    1 - (i.embedding <=> query_embedding) as similarity,
    i.created_at
  from public.items i
  where i.user_id = match_user_id
    and i.embedding is not null
    and 1 - (i.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
end;
$$;
