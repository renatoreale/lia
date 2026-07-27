-- =====================================================================
-- 0006_knowledge_and_ai.sql
-- knowledge (per-condominium AI memory), faqs, ai_feedback (learning
-- loop for AI LEARNING: AI version, final version, diff, motivation).
-- =====================================================================

-- ---------------------------------------------------------------------
-- knowledge
-- Condominium-specific AI memory: distilled facts, decisions and
-- corrections that should inform future answers for that condominio.
-- ---------------------------------------------------------------------

create table public.knowledge (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums (id) on delete cascade,
  title text not null,
  content text not null,
  category public.document_category,
  source_document_id uuid references public.documents (id) on delete set null,
  source_email_id uuid references public.emails (id) on delete set null,
  tags text[] not null default '{}',
  confidence numeric(4, 3) not null default 1.0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

create index knowledge_condominium_id_idx on public.knowledge (condominium_id);
create index knowledge_tags_idx on public.knowledge using gin (tags);
create index knowledge_deleted_at_idx on public.knowledge (deleted_at);

create trigger set_updated_at before update on public.knowledge
  for each row execute function public.set_updated_at();
create trigger set_created_by before insert on public.knowledge
  for each row execute function public.set_created_by();

-- ---------------------------------------------------------------------
-- faqs
-- ---------------------------------------------------------------------

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid references public.condominiums (id) on delete cascade,
  company_id uuid references public.companies (id) on delete cascade,
  question text not null,
  answer text not null,
  category text,
  usage_count integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

create index faqs_condominium_id_idx on public.faqs (condominium_id);
create index faqs_company_id_idx on public.faqs (company_id);
create index faqs_deleted_at_idx on public.faqs (deleted_at);

create trigger set_updated_at before update on public.faqs
  for each row execute function public.set_updated_at();
create trigger set_created_by before insert on public.faqs
  for each row execute function public.set_created_by();

-- ---------------------------------------------------------------------
-- ai_feedback
-- Captures every human edit to an AI-generated draft/answer so the
-- system can learn per-condominio over time: AI version, final version,
-- diff and the human's stated motivation.
-- ---------------------------------------------------------------------

create table public.ai_feedback (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid references public.condominiums (id) on delete cascade,
  email_draft_id uuid references public.email_drafts (id) on delete cascade,
  source_type text not null default 'email_draft',
  ai_content text not null,
  final_content text not null,
  diff jsonb,
  reason text,
  rating smallint check (rating between 1 and 5),
  applied_to_knowledge boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

create index ai_feedback_condominium_id_idx on public.ai_feedback (condominium_id);
create index ai_feedback_email_draft_id_idx on public.ai_feedback (email_draft_id);
create index ai_feedback_deleted_at_idx on public.ai_feedback (deleted_at);

create trigger set_updated_at before update on public.ai_feedback
  for each row execute function public.set_updated_at();
create trigger set_created_by before insert on public.ai_feedback
  for each row execute function public.set_created_by();
