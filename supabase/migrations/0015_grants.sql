-- =====================================================================
-- 0015_grants.sql
-- Table/function-level privileges for the anon/authenticated roles.
-- RLS policies (0010_rls_policies.sql) control row visibility, but
-- Postgres also requires the base GRANT before RLS is ever evaluated.
-- Mirrors the default privileges a fresh Supabase project normally
-- pre-configures for the `postgres` role's future objects; explicit
-- here because objects created via the SQL Editor may not inherit
-- them automatically.
-- =====================================================================

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on routines to anon, authenticated, service_role;

grant usage on schema extensions to anon, authenticated, service_role;
