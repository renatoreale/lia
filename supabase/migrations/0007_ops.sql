-- =====================================================================
-- 0007_ops.sql
-- tasks, notifications, audit_logs, settings, integrations
-- =====================================================================

-- ---------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid references public.condominiums (id) on delete cascade,
  title text not null,
  description text,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  due_date date,
  assigned_to uuid references public.profiles (id),
  related_email_id uuid references public.emails (id) on delete set null,
  related_document_id uuid references public.documents (id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

create index tasks_condominium_id_idx on public.tasks (condominium_id);
create index tasks_assigned_to_idx on public.tasks (assigned_to);
create index tasks_status_idx on public.tasks (status);
create index tasks_deleted_at_idx on public.tasks (deleted_at);

create trigger set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
create trigger set_created_by before insert on public.tasks
  for each row execute function public.set_created_by();

-- ---------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  company_id uuid references public.companies (id) on delete cascade,
  condominium_id uuid references public.condominiums (id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  message text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

create index notifications_user_id_idx on public.notifications (user_id);
create index notifications_read_at_idx on public.notifications (read_at);
create index notifications_created_at_idx on public.notifications (created_at desc);
create index notifications_deleted_at_idx on public.notifications (deleted_at);

create trigger set_updated_at before update on public.notifications
  for each row execute function public.set_updated_at();
create trigger set_created_by before insert on public.notifications
  for each row execute function public.set_created_by();

-- ---------------------------------------------------------------------
-- audit_logs
-- Append-only trail. updated_at/deleted_at are kept for schema
-- consistency but are never expected to change once a row is written.
-- ---------------------------------------------------------------------

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete cascade,
  condominium_id uuid references public.condominiums (id) on delete cascade,
  user_id uuid references public.profiles (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

create index audit_logs_company_id_idx on public.audit_logs (company_id);
create index audit_logs_condominium_id_idx on public.audit_logs (condominium_id);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

-- ---------------------------------------------------------------------
-- settings
-- Key/value scoped settings: company-wide when condominium_id is null,
-- condominium-specific otherwise.
-- ---------------------------------------------------------------------

create table public.settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  condominium_id uuid references public.condominiums (id) on delete cascade,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id),
  unique (company_id, condominium_id, key)
);

create index settings_company_id_idx on public.settings (company_id);
create index settings_condominium_id_idx on public.settings (condominium_id);
create index settings_deleted_at_idx on public.settings (deleted_at);

create trigger set_updated_at before update on public.settings
  for each row execute function public.set_updated_at();
create trigger set_created_by before insert on public.settings
  for each row execute function public.set_created_by();

-- ---------------------------------------------------------------------
-- integrations
-- Gmail / Outlook / OpenAI connections. Tokens are stored encrypted at
-- the application layer (see src/lib/supabase and Edge Functions) --
-- this table only ever holds ciphertext, never raw tokens.
-- ---------------------------------------------------------------------

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  provider public.integration_provider not null,
  status public.integration_status not null default 'disconnected',
  external_account_email text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  last_synced_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id),
  unique (company_id, provider, external_account_email)
);

create index integrations_company_id_idx on public.integrations (company_id);
create index integrations_provider_idx on public.integrations (provider);
create index integrations_deleted_at_idx on public.integrations (deleted_at);

create trigger set_updated_at before update on public.integrations
  for each row execute function public.set_updated_at();
create trigger set_created_by before insert on public.integrations
  for each row execute function public.set_created_by();

alter table public.email_threads
  add constraint email_threads_integration_id_fkey
  foreign key (integration_id) references public.integrations (id) on delete set null;
