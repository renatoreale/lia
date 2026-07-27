-- =====================================================================
-- 0021_recalibrate_match_thresholds.sql
-- The default match_threshold values (0.72 / 0.65) assumed cosine
-- similarities in the same range as some other embedding models. In
-- practice text-embedding-3-small produces much lower absolute
-- similarities: a verified correct match against real condominium
-- text measured ~0.52. The application always passes its own
-- threshold explicitly (see src/lib/ai/rag.ts), but the SQL defaults
-- are corrected here too so the functions behave sensibly if ever
-- called without one (e.g. future direct RPC use, ad hoc queries).
-- =====================================================================

create or replace function public.match_document_chunks(
  query_embedding extensions.vector(1536),
  p_condominium_id uuid,
  match_count int default 8,
  match_threshold float default 0.2,
  p_category public.document_category default null
)
returns table (
  chunk_id uuid,
  document_id uuid,
  document_title text,
  category public.document_category,
  page_number int,
  content text,
  similarity float
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    dc.id as chunk_id,
    dc.document_id,
    d.title as document_title,
    dc.category,
    dc.page_number,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  join public.documents d on d.id = dc.document_id
  where dc.condominium_id = p_condominium_id
    and dc.deleted_at is null
    and d.deleted_at is null
    and (p_category is null or dc.category = p_category)
    and 1 - (dc.embedding <=> query_embedding) >= match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;

create or replace function public.match_embeddings(
  query_embedding extensions.vector(1536),
  p_condominium_id uuid default null,
  match_count int default 20,
  match_threshold float default 0.2,
  p_source_types public.embedding_source_type[] default null
)
returns table (
  source_type public.embedding_source_type,
  source_id uuid,
  condominium_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    e.source_type,
    e.source_id,
    e.condominium_id,
    e.content,
    e.metadata,
    1 - (e.embedding <=> query_embedding) as similarity
  from public.embeddings e
  where e.deleted_at is null
    and (p_condominium_id is null or e.condominium_id = p_condominium_id)
    and (p_source_types is null or e.source_type = any (p_source_types))
    and 1 - (e.embedding <=> query_embedding) >= match_threshold
  order by e.embedding <=> query_embedding
  limit match_count;
$$;
