-- =====================================================================
-- 0009_tenant_bootstrap.sql
-- Auto-provisions a company_members('owner') row whenever a company is
-- created, so the creator immediately satisfies the RLS helper
-- functions defined in 0008_auth_helpers.sql.
-- =====================================================================

create or replace function public.handle_new_company()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.company_members (company_id, user_id, role, accepted_at, created_by)
  values (new.id, new.owner_id, 'owner', now(), new.owner_id)
  on conflict (company_id, user_id) do nothing;
  return new;
end;
$$;

create trigger on_company_created
  after insert on public.companies
  for each row execute function public.handle_new_company();
