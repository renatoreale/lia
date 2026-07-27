-- =====================================================================
-- 0012_rag_functions.sql
-- Vector search RPCs used by the RAG pipeline and the global search bar.
-- Both are SECURITY INVOKER so the caller's RLS still applies -- a user
-- can never retrieve chunks/embeddings outside their accessible
-- condomini through these functions.
-- =====================================================================

-- ---------------------------------------------------------------------
-- match_document_chunks
-- Used by the RAG answer pipeline: given a question embedding, return
-- the top-N most similar chunks for a single condominio, joined with
-- document metadata so the response can cite its sources.
-- ---------------------------------------------------------------------

create or replace function public.match_document_chunks(
  query_embedding extensions.vector(1536),
  p_condominium_id uuid,
  match_count int default 8,
  match_threshold float default 0.72,
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

-- ---------------------------------------------------------------------
-- match_embeddings
-- Powers the global search bar across document chunks, knowledge
-- entries, FAQs and emails in one query.
-- ---------------------------------------------------------------------

create or replace function public.match_embeddings(
  query_embedding extensions.vector(1536),
  p_condominium_id uuid default null,
  match_count int default 20,
  match_threshold float default 0.65,
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
