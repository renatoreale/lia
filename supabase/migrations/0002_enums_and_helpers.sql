-- =====================================================================
-- 0002_enums_and_helpers.sql
-- Enum types and shared helper functions/triggers used across the schema.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------

create type public.app_role as enum ('owner', 'administrator', 'collaborator', 'read_only');

create type public.document_category as enum (
  'anagrafica',
  'regolamento',
  'tabella_millesimale',
  'verbale',
  'delibera',
  'bilancio',
  'preventivo',
  'consuntivo',
  'contratto',
  'assicurazione',
  'pratica_legale',
  'documentazione_varia'
);

create type public.document_status as enum (
  'uploaded',
  'extracting',
  'ocr_processing',
  'chunking',
  'embedding',
  'indexed',
  'failed'
);

create type public.email_provider as enum ('gmail', 'outlook');

create type public.email_direction as enum ('inbound', 'outbound');

create type public.email_urgency as enum ('low', 'medium', 'high', 'critical');

-- Drives the "Email" dashboard columns: Da approvare / Urgenti / In attesa / Bozze / Inviate
create type public.email_status as enum (
  'to_review',
  'urgent',
  'pending',
  'draft',
  'sent',
  'archived'
);

create type public.draft_status as enum ('pending_review', 'approved', 'sent', 'discarded');

create type public.task_status as enum ('todo', 'in_progress', 'done', 'cancelled');

create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');

create type public.notification_type as enum (
  'new_email',
  'new_document',
  'ai_request',
  'missing_document',
  'task_assigned',
  'system'
);

create type public.integration_provider as enum ('gmail', 'outlook', 'openai');

create type public.integration_status as enum ('connected', 'disconnected', 'error', 'expired');

create type public.embedding_source_type as enum ('document_chunk', 'knowledge', 'faq', 'email');

-- ---------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- created_by default helper (falls back to auth.uid())
-- ---------------------------------------------------------------------

create or replace function public.set_created_by()
returns trigger
language plpgsql
as $$
begin
  if new.created_by is null then
    new.created_by = auth.uid();
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Soft delete helper: marks a row as deleted instead of removing it
-- ---------------------------------------------------------------------

create or replace function public.soft_delete(p_table regclass, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  execute format('update %s set deleted_at = now(), deleted_by = auth.uid() where id = $1', p_table)
    using p_id;
end;
$$;
