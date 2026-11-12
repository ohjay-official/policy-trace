-- Local Postgres only. Do not run this file on a Supabase project.
-- Supabase already provides auth.uid() and auth.jwt(). Replacing them would
-- break the project. The test script loads this after the migrations so the
-- evaluator can impersonate a JWT on vanilla Postgres.

create schema if not exists auth;

create or replace function auth.uid()
returns uuid
language sql
stable
as $fn$
  select case
    when coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
    ) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
    )::uuid
    else null
  end
$fn$;

create or replace function auth.jwt()
returns jsonb
language sql
stable
as $fn$
  select case
    when coalesce(nullif(current_setting('request.jwt.claims', true), ''), '') = '' then null::jsonb
    else current_setting('request.jwt.claims', true)::jsonb
  end
$fn$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant execute on function auth.jwt() to anon, authenticated, service_role;
