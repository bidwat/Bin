create index items_embedding_hnsw_idx
  on public.items using hnsw (embedding extensions.vector_cosine_ops)
  with (m = 16, ef_construction = 64);
