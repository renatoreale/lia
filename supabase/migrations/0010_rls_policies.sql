-- =====================================================================
-- 0010_rls_policies.sql
-- Row Level Security for every tenant-scoped table.
--
-- Model:
--  - "companies" is the amministratore's account.
--  - A user's visibility into a company comes from company_members.
--  - A user's visibility into a condominio comes from
--    public.my_condominium_ids() (company membership, optionally
--    narrowed by condominium_members -- see 0008_auth_helpers.sql).
--  - Write access requires 'owner' | 'administrator' | 'collaborator'.
--    'read_only' can only SELECT.
--  - service_role (used by Edge Functions) bypasses RLS entirely, as
--    is standard for Supabase.
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------

alter table public.profiles enable row level security;

create policy "profiles: read own or shared-company profiles"
  on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from public.company_members me
      join public.company_members them on them.company_id = me.company_id
      where me.user_id = auth.uid() and me.deleted_at is null
        and them.user_id = public.profiles.id and them.deleted_at is null
    )
  );

create policy "profiles: update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------

alter table public.companies enable row level security;

create policy "companies: read if member"
  on public.companies for select
  using (id in (select public.my_company_ids()));

create policy "companies: any authenticated user can create"
  on public.companies for insert
  with check (owner_id = auth.uid());

create policy "companies: admins can update"
  on public.companies for update
  using (public.is_company_admin(id))
  with check (public.is_company_admin(id));

create policy "companies: owner can delete"
  on public.companies for delete
  using (owner_id = auth.uid());

-- ---------------------------------------------------------------------
-- company_members
-- ---------------------------------------------------------------------

alter table public.company_members enable row level security;

create policy "company_members: read within company"
  on public.company_members for select
  using (company_id in (select public.my_company_ids()));

create policy "company_members: admins manage"
  on public.company_members for insert
  with check (public.is_company_admin(company_id));

create policy "company_members: admins update"
  on public.company_members for update
  using (public.is_company_admin(company_id))
  with check (public.is_company_admin(company_id));

create policy "company_members: admins delete"
  on public.company_members for delete
  using (public.is_company_admin(company_id));

-- ---------------------------------------------------------------------
-- condominiums
-- ---------------------------------------------------------------------

alter table public.condominiums enable row level security;

create policy "condominiums: read accessible"
  on public.condominiums for select
  using (id in (select public.my_condominium_ids()));

create policy "condominiums: admins create"
  on public.condominiums for insert
  with check (public.is_company_admin(company_id));

create policy "condominiums: writers update"
  on public.condominiums for update
  using (public.can_write_condominium(id))
  with check (public.can_write_condominium(id));

create policy "condominiums: admins delete"
  on public.condominiums for delete
  using (public.is_company_admin(company_id));

-- ---------------------------------------------------------------------
-- condominium_members
-- ---------------------------------------------------------------------

alter table public.condominium_members enable row level security;

create policy "condominium_members: read within company"
  on public.condominium_members for select
  using (
    condominium_id in (
      select c.id from public.condominiums c where c.company_id in (select public.my_company_ids())
    )
  );

create policy "condominium_members: admins manage insert"
  on public.condominium_members for insert
  with check (
    exists (
      select 1 from public.condominiums c
      where c.id = condominium_id and public.is_company_admin(c.company_id)
    )
  );

create policy "condominium_members: admins manage update"
  on public.condominium_members for update
  using (
    exists (
      select 1 from public.condominiums c
      where c.id = condominium_id and public.is_company_admin(c.company_id)
    )
  );

create policy "condominium_members: admins manage delete"
  on public.condominium_members for delete
  using (
    exists (
      select 1 from public.condominiums c
      where c.id = condominium_id and public.is_company_admin(c.company_id)
    )
  );

-- ---------------------------------------------------------------------
-- Generic pattern for tables scoped directly by condominium_id:
-- owners, apartments, documents, document_chunks, embeddings,
-- email_threads, emails, email_attachments, email_drafts, knowledge,
-- faqs, ai_feedback, tasks
-- ---------------------------------------------------------------------

-- owners
alter table public.owners enable row level security;
create policy "owners: read accessible" on public.owners for select
  using (condominium_id in (select public.my_condominium_ids()));
create policy "owners: writers insert" on public.owners for insert
  with check (public.can_write_condominium(condominium_id));
create policy "owners: writers update" on public.owners for update
  using (public.can_write_condominium(condominium_id)) with check (public.can_write_condominium(condominium_id));
create policy "owners: writers delete" on public.owners for delete
  using (public.can_write_condominium(condominium_id));

-- apartments
alter table public.apartments enable row level security;
create policy "apartments: read accessible" on public.apartments for select
  using (condominium_id in (select public.my_condominium_ids()));
create policy "apartments: writers insert" on public.apartments for insert
  with check (public.can_write_condominium(condominium_id));
create policy "apartments: writers update" on public.apartments for update
  using (public.can_write_condominium(condominium_id)) with check (public.can_write_condominium(condominium_id));
create policy "apartments: writers delete" on public.apartments for delete
  using (public.can_write_condominium(condominium_id));

-- documents
alter table public.documents enable row level security;
create policy "documents: read accessible" on public.documents for select
  using (condominium_id in (select public.my_condominium_ids()));
create policy "documents: writers insert" on public.documents for insert
  with check (public.can_write_condominium(condominium_id));
create policy "documents: writers update" on public.documents for update
  using (public.can_write_condominium(condominium_id)) with check (public.can_write_condominium(condominium_id));
create policy "documents: writers delete" on public.documents for delete
  using (public.can_write_condominium(condominium_id));

-- document_chunks (read-only from the client; written by Edge Functions
-- via service_role during ingestion)
alter table public.document_chunks enable row level security;
create policy "document_chunks: read accessible" on public.document_chunks for select
  using (condominium_id in (select public.my_condominium_ids()));

-- embeddings (read-only from the client; written by Edge Functions)
alter table public.embeddings enable row level security;
create policy "embeddings: read accessible" on public.embeddings for select
  using (condominium_id in (select public.my_condominium_ids()));

-- email_threads
alter table public.email_threads enable row level security;
create policy "email_threads: read accessible" on public.email_threads for select
  using (condominium_id in (select public.my_condominium_ids()) or condominium_id is null);
create policy "email_threads: writers update" on public.email_threads for update
  using (condominium_id in (select public.my_condominium_ids()))
  with check (condominium_id in (select public.my_condominium_ids()));

-- emails
alter table public.emails enable row level security;
create policy "emails: read accessible" on public.emails for select
  using (condominium_id in (select public.my_condominium_ids()) or condominium_id is null);
create policy "emails: writers update" on public.emails for update
  using (condominium_id in (select public.my_condominium_ids()))
  with check (condominium_id in (select public.my_condominium_ids()));

-- email_attachments
alter table public.email_attachments enable row level security;
create policy "email_attachments: read accessible" on public.email_attachments for select
  using (
    exists (
      select 1 from public.emails e
      where e.id = email_id
        and (e.condominium_id in (select public.my_condominium_ids()) or e.condominium_id is null)
    )
  );

-- email_drafts
alter table public.email_drafts enable row level security;
create policy "email_drafts: read accessible" on public.email_drafts for select
  using (condominium_id in (select public.my_condominium_ids()));
create policy "email_drafts: writers insert" on public.email_drafts for insert
  with check (public.can_write_condominium(condominium_id));
create policy "email_drafts: writers update" on public.email_drafts for update
  using (public.can_write_condominium(condominium_id)) with check (public.can_write_condominium(condominium_id));
create policy "email_drafts: writers delete" on public.email_drafts for delete
  using (public.can_write_condominium(condominium_id));

-- knowledge
alter table public.knowledge enable row level security;
create policy "knowledge: read accessible" on public.knowledge for select
  using (condominium_id in (select public.my_condominium_ids()));
create policy "knowledge: writers insert" on public.knowledge for insert
  with check (public.can_write_condominium(condominium_id));
create policy "knowledge: writers update" on public.knowledge for update
  using (public.can_write_condominium(condominium_id)) with check (public.can_write_condominium(condominium_id));
create policy "knowledge: writers delete" on public.knowledge for delete
  using (public.can_write_condominium(condominium_id));

-- faqs (condominium-scoped, or company-wide when condominium_id is null)
alter table public.faqs enable row level security;
create policy "faqs: read accessible" on public.faqs for select
  using (
    condominium_id in (select public.my_condominium_ids())
    or company_id in (select public.my_company_ids())
  );
create policy "faqs: writers insert" on public.faqs for insert
  with check (
    (condominium_id is not null and public.can_write_condominium(condominium_id))
    or (condominium_id is null and public.is_company_admin(company_id))
  );
create policy "faqs: writers update" on public.faqs for update
  using (
    (condominium_id is not null and public.can_write_condominium(condominium_id))
    or (condominium_id is null and public.is_company_admin(company_id))
  );
create policy "faqs: writers delete" on public.faqs for delete
  using (
    (condominium_id is not null and public.can_write_condominium(condominium_id))
    or (condominium_id is null and public.is_company_admin(company_id))
  );

-- ai_feedback
alter table public.ai_feedback enable row level security;
create policy "ai_feedback: read accessible" on public.ai_feedback for select
  using (condominium_id in (select public.my_condominium_ids()));
create policy "ai_feedback: writers insert" on public.ai_feedback for insert
  with check (public.can_write_condominium(condominium_id));

-- tasks
alter table public.tasks enable row level security;
create policy "tasks: read accessible" on public.tasks for select
  using (condominium_id in (select public.my_condominium_ids()));
create policy "tasks: writers insert" on public.tasks for insert
  with check (public.can_write_condominium(condominium_id));
create policy "tasks: writers update" on public.tasks for update
  using (public.can_write_condominium(condominium_id)) with check (public.can_write_condominium(condominium_id));
create policy "tasks: writers delete" on public.tasks for delete
  using (public.can_write_condominium(condominium_id));

-- ---------------------------------------------------------------------
-- notifications (strictly per-user)
-- ---------------------------------------------------------------------

alter table public.notifications enable row level security;

create policy "notifications: read own"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "notifications: update own (mark read)"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- audit_logs (read-only for company admins; writes come from
-- service_role / triggers only)
-- ---------------------------------------------------------------------

alter table public.audit_logs enable row level security;

create policy "audit_logs: admins read"
  on public.audit_logs for select
  using (company_id in (select public.my_company_ids()) and public.is_company_admin(company_id));

-- ---------------------------------------------------------------------
-- settings
-- ---------------------------------------------------------------------

alter table public.settings enable row level security;

create policy "settings: read within company"
  on public.settings for select
  using (company_id in (select public.my_company_ids()));

create policy "settings: admins insert"
  on public.settings for insert
  with check (public.is_company_admin(company_id));

create policy "settings: admins update"
  on public.settings for update
  using (public.is_company_admin(company_id))
  with check (public.is_company_admin(company_id));

create policy "settings: admins delete"
  on public.settings for delete
  using (public.is_company_admin(company_id));

-- ---------------------------------------------------------------------
-- integrations (contains encrypted tokens; only admins may read/manage)
-- ---------------------------------------------------------------------

alter table public.integrations enable row level security;

create policy "integrations: admins read"
  on public.integrations for select
  using (public.is_company_admin(company_id));

create policy "integrations: admins insert"
  on public.integrations for insert
  with check (public.is_company_admin(company_id));

create policy "integrations: admins update"
  on public.integrations for update
  using (public.is_company_admin(company_id))
  with check (public.is_company_admin(company_id));

create policy "integrations: admins delete"
  on public.integrations for delete
  using (public.is_company_admin(company_id));
