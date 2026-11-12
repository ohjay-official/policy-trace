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

apply() {
  psql_test -f supabase/migrations/20261112120000_schemas_tables.sql
  psql_test -f supabase/migrations/20261112120100_evaluator.sql
  psql_test -f supabase/migrations/20261112120200_seed_scenarios.sql
}

apply
apply
psql_test -f supabase/tests/prelude.sql
psql_test -f supabase/tests/evaluator.sql
echo "SQL evaluator tests passed"
