-- =====================================================================
-- 0008_auth_helpers.sql
-- SQL helper functions used by RLS policies to resolve tenant
-- membership and effective role for the currently authenticated user
-- (auth.uid()). All are STABLE + SECURITY DEFINER with a locked
-- search_path so they are safe to call from policy expressions.
-- =====================================================================

-- Companies the current user belongs to (any role)
create or replace function public.my_company_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id
  from public.company_members
  where user_id = auth.uid()
    and deleted_at is null
    and accepted_at is not null;
$$;

-- Condominium ids the current user can access:
--  * every condominium under a company they belong to, UNLESS
--  * the company has at least one explicit condominium_members row for
--    that user, in which case only those explicitly-granted condomini
--    are visible (fine-grained scoping for Collaborator / Read Only).
create or replace function public.my_condominium_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.condominiums c
  where c.deleted_at is null
    and c.company_id in (select public.my_company_ids())
    and (
      not exists (
        select 1 from public.condominium_members cm
        where cm.condominium_id = c.id and cm.deleted_at is null
      )
      or exists (
        select 1 from public.condominium_members cm
        where cm.condominium_id = c.id
          and cm.user_id = auth.uid()
          and cm.deleted_at is null
      )
    )
  union
  select cm.condominium_id
  from public.condominium_members cm
  where cm.user_id = auth.uid()
    and cm.deleted_at is null;
$$;

-- Effective role of the current user for a given company: the highest
-- privilege between an explicit company_members role.
create or replace function public.my_role_for_company(p_company_id uuid)
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.company_members
  where company_id = p_company_id
    and user_id = auth.uid()
    and deleted_at is null
  limit 1;
$$;

-- Effective role of the current user for a given condominio: a
-- condominium_members override takes precedence over the company role.
create or replace function public.my_role_for_condominium(p_condominium_id uuid)
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select cm.role
      from public.condominium_members cm
      where cm.condominium_id = p_condominium_id
        and cm.user_id = auth.uid()
        and cm.deleted_at is null
      limit 1
    ),
    (
      select public.my_role_for_company(c.company_id)
      from public.condominiums c
      where c.id = p_condominium_id
    )
  );
$$;

-- True if the current user can write (owner/administrator/collaborator)
-- to the given condominio.
create or replace function public.can_write_condominium(p_condominium_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.my_role_for_condominium(p_condominium_id) in ('owner', 'administrator', 'collaborator');
$$;

-- True if the current user is owner/administrator of the given company.
create or replace function public.is_company_admin(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.my_role_for_company(p_company_id) in ('owner', 'administrator');
$$;
