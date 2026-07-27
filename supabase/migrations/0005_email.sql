-- =====================================================================
-- 0005_email.sql
-- email_threads, emails, email_attachments, email_drafts
-- =====================================================================

-- ---------------------------------------------------------------------
-- email_threads
-- ---------------------------------------------------------------------

create table public.email_threads (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid references public.condominiums (id) on delete cascade,
  provider public.email_provider not null,
  external_thread_id text not null,
  integration_id uuid,
  subject text,
  participants jsonb not null default '[]'::jsonb,
  message_count integer not null default 0,
  last_message_at timestamptz,
  is_unclassified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id),
  unique (provider, external_thread_id)
);

create index email_threads_condominium_id_idx on public.email_threads (condominium_id);
create index email_threads_last_message_at_idx on public.email_threads (last_message_at desc);
create index email_threads_deleted_at_idx on public.email_threads (deleted_at);

create trigger set_updated_at before update on public.email_threads
  for each row execute function public.set_updated_at();
create trigger set_created_by before insert on public.email_threads
  for each row execute function public.set_created_by();

-- ---------------------------------------------------------------------
-- emails
-- ---------------------------------------------------------------------

create table public.emails (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.email_threads (id) on delete cascade,
  condominium_id uuid references public.condominiums (id) on delete set null,
  provider public.email_provider not null,
  external_message_id text not null,
  direction public.email_direction not null default 'inbound',
  from_address text not null,
  to_addresses jsonb not null default '[]'::jsonb,
  cc_addresses jsonb not null default '[]'::jsonb,
  subject text,
  body_text text,
  body_html text,
  snippet text,
  category text,
  urgency public.email_urgency not null default 'low',
  status public.email_status not null default 'pending',
  ai_summary text,
  ai_confidence numeric(4, 3),
  has_attachments boolean not null default false,
  received_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id),
  unique (provider, external_message_id)
);

create index emails_thread_id_idx on public.emails (thread_id);
create index emails_condominium_id_idx on public.emails (condominium_id);
create index emails_status_idx on public.emails (status);
create index emails_urgency_idx on public.emails (urgency);
create index emails_received_at_idx on public.emails (received_at desc);
create index emails_deleted_at_idx on public.emails (deleted_at);
create index emails_subject_trgm_idx on public.emails using gin (subject gin_trgm_ops);

create trigger set_updated_at before update on public.emails
  for each row execute function public.set_updated_at();
create trigger set_created_by before insert on public.emails
  for each row execute function public.set_created_by();

-- ---------------------------------------------------------------------
-- email_attachments
-- Supplementary table (not explicitly listed in the spec) required to
-- satisfy "estrarre eventuali allegati" from the EMAIL workflow. Links
-- an extracted attachment to a `documents` row once ingested.
-- ---------------------------------------------------------------------

create table public.email_attachments (
  id uuid primary key default gen_random_uuid(),
  email_id uuid not null references public.emails (id) on delete cascade,
  document_id uuid references public.documents (id) on delete set null,
  filename text not null,
  storage_bucket text not null default 'email-attachments',
  storage_path text not null,
  mime_type text,
  file_size bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

create index email_attachments_email_id_idx on public.email_attachments (email_id);
create index email_attachments_deleted_at_idx on public.email_attachments (deleted_at);

create trigger set_updated_at before update on public.email_attachments
  for each row execute function public.set_updated_at();
create trigger set_created_by before insert on public.email_attachments
  for each row execute function public.set_created_by();

-- ---------------------------------------------------------------------
-- email_drafts
-- AI-generated replies awaiting human approval. Never sent automatically.
-- ---------------------------------------------------------------------

create table public.email_drafts (
  id uuid primary key default gen_random_uuid(),
  email_id uuid references public.emails (id) on delete cascade,
  thread_id uuid references public.email_threads (id) on delete cascade,
  condominium_id uuid references public.condominiums (id) on delete cascade,
  ai_content text not null,
  final_content text,
  status public.draft_status not null default 'pending_review',
  ai_confidence numeric(4, 3),
  citations jsonb not null default '[]'::jsonb,
  model text,
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

create index email_drafts_email_id_idx on public.email_drafts (email_id);
create index email_drafts_condominium_id_idx on public.email_drafts (condominium_id);
create index email_drafts_status_idx on public.email_drafts (status);
create index email_drafts_deleted_at_idx on public.email_drafts (deleted_at);

create trigger set_updated_at before update on public.email_drafts
  for each row execute function public.set_updated_at();
create trigger set_created_by before insert on public.email_drafts
  for each row execute function public.set_created_by();
