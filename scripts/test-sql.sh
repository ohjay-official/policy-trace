#!/usr/bin/env bash
# Apply the migrations twice, then run the evaluator tests.
# DATABASE_URL targets an admin database (the script creates policy_trace_test).
# Without DATABASE_URL, the local peer-auth postgres superuser is used.
set -euo pipefail
cd "$(dirname "$0")/.."

psql_admin() {
  if [[ -n "${DATABASE_URL:-}" ]]; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 "$@"
  else
    sudo -u postgres psql -d postgres -v ON_ERROR_STOP=1 "$@"
  fi
}

psql_test() {
  if [[ -n "${DATABASE_URL:-}" ]]; then
    local base="${DATABASE_URL%/*}"
    psql "${base}/policy_trace_test" -v ON_ERROR_STOP=1 "$@"
  else
    sudo -u postgres psql -d policy_trace_test -v ON_ERROR_STOP=1 "$@"
  fi
}

psql_admin -c "DROP DATABASE IF EXISTS policy_trace_test WITH (FORCE);"
psql_admin -c "CREATE DATABASE policy_trace_test;"

# Hosted Supabase applies project migrations as postgres, and that role is not a
# superuser. It is a member of anon, authenticated, and service_role. Apply the
# files as hosted_postgres so a superuser-only success cannot hide a 42501.
psql_test <<'SQL'
do $$
begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'hosted_postgres') then
    create role hosted_postgres nologin nosuperuser createrole createdb bypassrls;
  end if;
end
$$;
grant anon, authenticated, service_role to hosted_postgres with admin option;
grant all on database policy_trace_test to hosted_postgres;
grant all on schema public to hosted_postgres;
SQL

apply_as_hosted() {
  local file="$1"
  { echo "SET ROLE hosted_postgres;"; cat "$file"; } | psql_test
}

apply() {
  apply_as_hosted supabase/migrations/20261112120000_schemas_tables.sql
  apply_as_hosted supabase/migrations/20261112120100_evaluator.sql
  apply_as_hosted supabase/migrations/20261112120200_seed_scenarios.sql
}

apply
apply
psql_test -f supabase/tests/prelude.sql
psql_test -f supabase/tests/evaluator.sql
echo "SQL evaluator tests passed"
