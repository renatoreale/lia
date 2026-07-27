-- =====================================================================
-- 0017_audit_logs_no_fk.sql
-- audit_logs must be able to record DELETE actions on the very row(s)
-- being deleted (directly, or cascaded -- e.g. deleting a company
-- cascades to company_members, whose audit trigger then tries to log
-- against the already-gone company). A hard FK to the audited entity
-- makes exactly that -- the most important case to audit -- impossible
-- ("insert or update on table audit_logs violates foreign key
-- constraint audit_logs_company_id_fkey"). Audit tables intentionally
-- do not enforce referential integrity to the entities they describe.
-- =====================================================================

alter table public.audit_logs drop constraint if exists audit_logs_company_id_fkey;
alter table public.audit_logs drop constraint if exists audit_logs_condominium_id_fkey;
alter table public.audit_logs drop constraint if exists audit_logs_user_id_fkey;
