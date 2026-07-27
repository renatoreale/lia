-- =====================================================================
-- 0020_super_admin.sql
-- Platform-level super admin role, separate from the per-company
-- app_role (owner/administrator/collaborator/read_only), which only
-- ever grants access within a single tenant. A super admin can see
-- and manage every account on the platform (support/ops use case).
--
-- Deliberately its own table rather than a boolean column on
-- `profiles`: profiles already has a self-service "update own
-- profile" policy, and a flag living there would let a user grant
-- themselves admin via a normal PATCH. super_admins has RLS enabled
-- with only a self-read policy -- no INSERT/UPDATE/DELETE policy
-- exists for authenticated users at all, so granting/revoking is only
-- ever possible via the service role (i.e. by another admin/operator
-- acting outside the app, or an Edge Function you explicitly build
-- for it later).
-- =====================================================================

create table public.super_admins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  granted_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  notes text
);

alter table public.super_admins enable row level security;

create policy "super_admins: read own status"
  on public.super_admins for select
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- is_super_admin(): cheap, callable-by-anyone self-check.
-- ---------------------------------------------------------------------

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.super_admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- admin_list_user_stats(): condomini count per user, across every
-- tenant. SECURITY DEFINER so it can see across companies, but it
-- explicitly re-checks is_super_admin() itself rather than relying on
-- the caller's RLS -- callable directly by an authenticated super
-- admin without needing the service role for this part.
-- ---------------------------------------------------------------------

create or replace function public.admin_list_user_stats()
returns table (user_id uuid, condominiums_count bigint, companies_count bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
    select
      cm.user_id,
      count(distinct c.id) as condominiums_count,
      count(distinct cm.company_id) as companies_count
    from public.company_members cm
    left join public.condominiums c on c.company_id = cm.company_id and c.deleted_at is null
    where cm.deleted_at is null
    group by cm.user_id;
end;
$$;
