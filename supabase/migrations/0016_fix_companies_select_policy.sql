-- =====================================================================
-- 0016_fix_companies_select_policy.sql
-- The original "companies: read if member" policy relied solely on
-- my_company_ids(), which in turn depends on a company_members row
-- created by the on_company_created AFTER INSERT trigger. PostgREST's
-- INSERT ... RETURNING re-checks the new row against the SELECT policy,
-- and that check was failing (surfacing as a generic 42501 on the
-- *insert*) because it did not reliably see the trigger-created
-- membership row yet. Making owner_id a direct, trigger-independent
-- condition fixes this and is also a more robust policy on its own
-- merits (the owner should always see their own company).
-- =====================================================================

drop policy if exists "companies: read if member" on public.companies;

create policy "companies: read if member"
  on public.companies for select
  using (owner_id = auth.uid() or id in (select public.my_company_ids()));
