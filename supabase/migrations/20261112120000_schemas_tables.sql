-- Policy Trace schema, catalog tables, and grants.
-- Safe to re-run on a fresh Supabase project (Postgres 17, explicit grants).
-- Does not replace auth.uid() or auth.jwt(). Those already exist on Supabase.

do $$
begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end
$$;

create schema if not exists lab_sandbox;
create schema if not exists lab_internal;

revoke all on schema lab_sandbox from public, anon, authenticated, service_role;
grant usage on schema lab_sandbox to anon, authenticated, service_role;

revoke all on schema lab_internal from public, anon, authenticated, service_role;

alter default privileges in schema lab_sandbox
  revoke all on tables from public, anon, authenticated, service_role;

create table if not exists public.scenarios (
  slug text primary key,
  title text not null,
  summary text not null,
  sort_order integer not null,
  operation text not null,
  default_sql text not null,
  anti_patterns jsonb not null,
  fixture jsonb not null,
  created_at timestamptz not null default pg_catalog.now()
);

create table if not exists public.labs (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  scenario_slug text not null references public.scenarios (slug),
  policy_sql text not null,
  created_at timestamptz not null default pg_catalog.now()
);

create table if not exists public.lab_shares (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  lab_id uuid not null references public.labs (id),
  scenario_slug text not null references public.scenarios (slug),
  policy_sql text not null,
  created_at timestamptz not null default pg_catalog.now()
);

alter table public.scenarios enable row level security;
alter table public.labs enable row level security;
alter table public.lab_shares enable row level security;

drop policy if exists "scenarios are readable" on public.scenarios;
create policy "scenarios are readable"
  on public.scenarios
  for select
  to anon, authenticated
  using (true);

revoke all on table public.scenarios from public, anon, authenticated, service_role;
revoke all on table public.labs from public, anon, authenticated, service_role;
revoke all on table public.lab_shares from public, anon, authenticated, service_role;

grant select on table public.scenarios to anon, authenticated, service_role;
grant select, insert, update, delete on table public.labs to service_role;
grant select, insert, update, delete on table public.lab_shares to service_role;
