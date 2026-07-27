-- =====================================================================
-- 0014_audit_triggers.sql
-- Generic audit trigger, applied to the tables where change history
-- matters most for a legal/administrative SaaS.
-- =====================================================================

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_condominium_id uuid;
  v_company_id uuid;
begin
  begin
    v_condominium_id := coalesce(new.condominium_id, old.condominium_id);
  exception when undefined_column then
    v_condominium_id := null;
  end;

  begin
    v_company_id := coalesce(new.company_id, old.company_id);
  exception when undefined_column then
    v_company_id := null;
  end;

  if v_company_id is null and v_condominium_id is not null then
    select company_id into v_company_id from public.condominiums where id = v_condominium_id;
  end if;

  insert into public.audit_logs (
    company_id, condominium_id, user_id, action, entity_type, entity_id, old_values, new_values
  )
  values (
    v_company_id,
    v_condominium_id,
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    coalesce(new.id, old.id),
    case when tg_op in ('update', 'delete') then to_jsonb(old) else null end,
    case when tg_op in ('update', 'insert') then to_jsonb(new) else null end
  );

  return coalesce(new, old);
end;
$$;

create trigger audit_condominiums
  after insert or update or delete on public.condominiums
  for each row execute function public.write_audit_log();

create trigger audit_documents
  after insert or update or delete on public.documents
  for each row execute function public.write_audit_log();

create trigger audit_email_drafts
  after insert or update or delete on public.email_drafts
  for each row execute function public.write_audit_log();

create trigger audit_company_members
  after insert or update or delete on public.company_members
  for each row execute function public.write_audit_log();

create trigger audit_integrations
  after insert or update or delete on public.integrations
  for each row execute function public.write_audit_log();
