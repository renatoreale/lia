-- =====================================================================
-- 0019_fix_company_members_select_policy.sql
-- Same self-referential STABLE-function pattern as 0016/0018:
-- my_company_ids() queries company_members, which is also the table
-- the policy protects. Not currently exercised (the invite route
-- inserts without .select(), so no RETURNING is requested), but it's
-- the same landmine, so it gets the same fix pre-emptively: a direct,
-- non-self-referential fast path for a user reading their own
-- membership row.
-- =====================================================================

drop policy if exists "company_members: read within company" on public.company_members;

create policy "company_members: read within company"
  on public.company_members for select
  using (user_id = auth.uid() or company_id in (select public.my_company_ids()));
