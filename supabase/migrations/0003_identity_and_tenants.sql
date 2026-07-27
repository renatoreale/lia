-- =====================================================================
-- 0003_identity_and_tenants.sql
-- profiles, companies (tenant/account), company_members, condominiums,
-- condominium_members, owners, apartments.
--
-- NOTE on "users": Supabase manages authentication users in the
-- protected `auth.users` table. `public.profiles` is the public,
-- application-facing 1:1 extension of `auth.users` and is what the
-- rest of the schema (and RLS policies) refer to as "the user".
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles  (public extension of auth.users)
-- ---------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  locale text not null default 'it-IT',
  timezone text not null default 'Europe/Rome',
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

comment on table public.profiles is 'Public 1:1 extension of auth.users; the application-level "user" record.';

create index profiles_deleted_at_idx on public.profiles (deleted_at);

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------
-- companies  (the "account" of an amministratore di condominio)
-- ---------------------------------------------------------------------

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  vat_number text,
  fiscal_code text,
  billing_email text,
  address text,
  plan text not null default 'trial',
  owner_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

create index companies_owner_id_idx on public.companies (owner_id);
create index companies_deleted_at_idx on public.companies (deleted_at);

create trigger set_updated_at before update on public.companies
  for each row execute function public.set_updated_at();
create trigger set_created_by before insert on public.companies
  for each row execute function public.set_created_by();

-- ---------------------------------------------------------------------
-- company_members  (role of a profile within a company/account)
-- ---------------------------------------------------------------------

create table public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null default 'read_only',
  invited_by uuid references public.profiles (id),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id),
  unique (company_id, user_id)
);

create index company_members_company_id_idx on public.company_members (company_id);
create index company_members_user_id_idx on public.company_members (user_id);
create index company_members_deleted_at_idx on public.company_members (deleted_at);

create trigger set_updated_at before update on public.company_members
  for each row execute function public.set_updated_at();
create trigger set_created_by before insert on public.company_members
  for each row execute function public.set_created_by();

-- ---------------------------------------------------------------------
-- condominiums
-- ---------------------------------------------------------------------

create table public.condominiums (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  address text,
  city text,
  postal_code text,
  province text,
  fiscal_code text,
  administrator_name text,
  administrator_email text,
  administrator_phone text,
  units_count integer,
  cadastral_data jsonb not null default '{}'::jsonb,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

create index condominiums_company_id_idx on public.condominiums (company_id);
create index condominiums_fiscal_code_idx on public.condominiums (fiscal_code);
create index condominiums_deleted_at_idx on public.condominiums (deleted_at);
create index condominiums_name_trgm_idx on public.condominiums using gin (name gin_trgm_ops);

create trigger set_updated_at before update on public.condominiums
  for each row execute function public.set_updated_at();
create trigger set_created_by before insert on public.condominiums
  for each row execute function public.set_created_by();

-- ---------------------------------------------------------------------
-- condominium_members  (optional per-condominium role scoping, used to
-- restrict a Collaborator / Read Only user to a subset of condomini)
-- ---------------------------------------------------------------------

create table public.condominium_members (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null default 'read_only',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id),
  unique (condominium_id, user_id)
);

create index condominium_members_condo_id_idx on public.condominium_members (condominium_id);
create index condominium_members_user_id_idx on public.condominium_members (user_id);
create index condominium_members_deleted_at_idx on public.condominium_members (deleted_at);

create trigger set_updated_at before update on public.condominium_members
  for each row execute function public.set_updated_at();
create trigger set_created_by before insert on public.condominium_members
  for each row execute function public.set_created_by();

-- ---------------------------------------------------------------------
-- owners  (proprietari)
-- ---------------------------------------------------------------------

create table public.owners (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  fiscal_code text,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

create index owners_condominium_id_idx on public.owners (condominium_id);
create index owners_email_idx on public.owners (email);
create index owners_deleted_at_idx on public.owners (deleted_at);

create trigger set_updated_at before update on public.owners
  for each row execute function public.set_updated_at();
create trigger set_created_by before insert on public.owners
  for each row execute function public.set_created_by();

-- ---------------------------------------------------------------------
-- apartments  (unità immobiliari)
-- ---------------------------------------------------------------------

create table public.apartments (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums (id) on delete cascade,
  owner_id uuid references public.owners (id) on delete set null,
  interno text,
  floor text,
  category text,
  square_meters numeric(10, 2),
  millesimi numeric(10, 5),
  cadastral_reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

create index apartments_condominium_id_idx on public.apartments (condominium_id);
create index apartments_owner_id_idx on public.apartments (owner_id);
create index apartments_deleted_at_idx on public.apartments (deleted_at);

create trigger set_updated_at before update on public.apartments
  for each row execute function public.set_updated_at();
create trigger set_created_by before insert on public.apartments
  for each row execute function public.set_created_by();
