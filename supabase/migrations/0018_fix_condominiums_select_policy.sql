-- =====================================================================
-- 0018_fix_condominiums_select_policy.sql
-- Same class of bug as 0016, different mechanism: my_condominium_ids()
-- is STABLE and itself queries public.condominiums -- the very table
-- the policy protects. STABLE functions reuse the snapshot taken at
-- the start of the calling statement, so inside an INSERT ... RETURNING
-- on condominiums, my_condominium_ids() cannot see the row just
-- inserted by that same statement, and PostgREST's implicit RETURNING
-- select-policy check fails ("new row violates row-level security
-- policy for table condominiums") even though the INSERT's own WITH
-- CHECK passed. is_company_admin() only queries company_members (not
-- condominiums), so it has no such self-reference and gives admins/
-- owners an immediate, reliable path -- which is also the sensible
-- default anyway (admins see every condominio in their company).
-- =====================================================================

drop policy if exists "condominiums: read accessible" on public.condominiums;

create policy "condominiums: read accessible"
  on public.condominiums for select
  using (
    public.is_company_admin(company_id)
    or id in (select public.my_condominium_ids())
  );
