-- =====================================================================
-- 0004_documents.sql
-- documents, document_chunks, embeddings (unified vector index)
-- =====================================================================

-- ---------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums (id) on delete cascade,
  category public.document_category not null default 'documentazione_varia',
  title text not null,
  description text,
  storage_bucket text not null default 'documents',
  storage_path text not null,
  mime_type text,
  file_size bigint,
  page_count integer,
  requires_ocr boolean not null default false,
  status public.document_status not null default 'uploaded',
  processing_error text,
  document_date date,
  version integer not null default 1,
  replaces_document_id uuid references public.documents (id),
  uploaded_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

create index documents_condominium_id_idx on public.documents (condominium_id);
create index documents_category_idx on public.documents (category);
create index documents_status_idx on public.documents (status);
create index documents_deleted_at_idx on public.documents (deleted_at);
create index documents_title_trgm_idx on public.documents using gin (title gin_trgm_ops);

create trigger set_updated_at before update on public.documents
  for each row execute function public.set_updated_at();
create trigger set_created_by before insert on public.documents
  for each row execute function public.set_created_by();

-- ---------------------------------------------------------------------
-- document_chunks
-- Each chunk carries its own embedding for direct RAG retrieval scoped
-- to a single document; see `embeddings` below for the cross-entity
-- unified vector index used by global semantic search.
-- ---------------------------------------------------------------------

create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  condominium_id uuid not null references public.condominiums (id) on delete cascade,
  category public.document_category not null default 'documentazione_varia',
  page_number integer,
  chunk_index integer not null,
  content text not null,
  token_count integer,
  embedding extensions.vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id),
  unique (document_id, chunk_index)
);

create index document_chunks_document_id_idx on public.document_chunks (document_id);
create index document_chunks_condominium_id_idx on public.document_chunks (condominium_id);
create index document_chunks_category_idx on public.document_chunks (category);
create index document_chunks_deleted_at_idx on public.document_chunks (deleted_at);
create index document_chunks_embedding_idx on public.document_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

create trigger set_updated_at before update on public.document_chunks
  for each row execute function public.set_updated_at();
create trigger set_created_by before insert on public.document_chunks
  for each row execute function public.set_created_by();

-- ---------------------------------------------------------------------
-- embeddings
-- Unified, polymorphic vector index spanning document_chunks, knowledge
-- entries, faqs and emails. Populated by triggers/Edge Functions so the
-- global search bar and the RAG retriever can query a single table
-- regardless of the underlying content type.
-- ---------------------------------------------------------------------

create table public.embeddings (
  id uuid primary key default gen_random_uuid(),
  source_type public.embedding_source_type not null,
  source_id uuid not null,
  condominium_id uuid references public.condominiums (id) on delete cascade,
  content text not null,
  embedding extensions.vector(1536) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id),
  unique (source_type, source_id)
);

create index embeddings_condominium_id_idx on public.embeddings (condominium_id);
create index embeddings_source_idx on public.embeddings (source_type, source_id);
create index embeddings_deleted_at_idx on public.embeddings (deleted_at);
create index embeddings_vector_idx on public.embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

create trigger set_updated_at before update on public.embeddings
  for each row execute function public.set_updated_at();
create trigger set_created_by before insert on public.embeddings
  for each row execute function public.set_created_by();
