# Policy Trace

Policy Trace is an independent community project. It is not a Supabase product and it is not affiliated with Supabase Inc.

It is a lab for the two checks Postgres makes before a row comes back from the Data API: the **grant**, then the **policy**. A missing grant is `42501`. A missing `SELECT` policy is an empty result and no error.

## Tutorial

The five labs are seeded in order. Open one, switch identity, and press Run. Every run happens in a transaction that rolls back, so the sandbox never keeps your edits.

The identities are `anon`, Alice, Bob, an agent tool call signed in as Alice, and `service_role`. Alice and Bob are fixed users:

| Who | Postgres role | `auth.uid()` |
| --- | --- | --- |
| anon | `anon` | null |
| Alice | `authenticated` | `11111111-1111-1111-1111-111111111111` |
| Bob | `authenticated` | `22222222-2222-2222-2222-222222222222` |
| Agent as Alice | `authenticated` | Alice's id, with `app_metadata.agent = true` |
| service_role | `service_role` | null, and the role bypasses row level security |

`service_role` is on the switch so you can see the bypass. The browser only ever uses the publishable key. There is no field for a secret key.

### 1. Missing grant

Start on **Missing grant** as Alice. The owner policy is installed and `authenticated` has no `SELECT` grant. The grid becomes a `42501` card labelled grant layer, not policy. Policies have not run.

Switch the chip to **Silent empty select**. The grant is present, row level security is on, and there is no `SELECT` policy. The query succeeds and returns no rows. That empty array is the policy layer.

**Grant and owner policy** gives the grant back. Alice sees her document. Bob sees his. The trace on the hidden row says `USING` did not match.

### 2. Agent as Alice

The scenario query is the `list_tasks` tool. The agent does not get a special role. The handler uses Alice's client, so Postgres sees Alice's JWT. Bob's task stays out. **Add USING (true)** puts a second permissive policy next to the owner policy. Permissive policies combine with `OR`, so the agent can now read every task.

### 3. USING (true)

Invoices carry a secret. The owner policy keeps Bob's invoice away from Alice. **Add USING (true)** leaves the owner policy in place and adds a permissive policy that matches every row. Alice then sees Bob's secret. One `USING (true)` is enough.

### 4. Silent update

The statement sets Alice's ticket to `closed` and uses `RETURNING`. With only an `UPDATE` policy, Postgres still has to read the existing row. No `SELECT` policy means the row is not visible, the update matches nothing, and there is no error. **Add a SELECT policy** and `RETURNING` comes back with `closed`. **Revoke UPDATE** and the same statement stops at `42501` before either policy runs.

### 5. Team notes

A note is visible to its owner, or to a member of its team. Membership lives on `lab_sandbox.team_members`, with its own `SELECT` policy, because the notes policy reads that table. Alice sees her private note, her Acme note, and Bob's Acme note. She does not see Bob's private note or Carol's other team. **Owner only** drops the team check. **USING (true)** exposes Carol's roadmap.

Copy SQL when the editor shows the version you want to keep. Share writes a read-only snapshot. Fork opens that SQL in the lab.

## How a run stays safe

`public.run_lab` is `SECURITY DEFINER` and callable with the publishable key. It does not run the text you typed.

1. The text is limited to 8000 characters and tokenized.
2. The only statements accepted are `CREATE POLICY`, `DROP POLICY`, `ALTER TABLE ... ENABLE/DISABLE ROW LEVEL SECURITY`, `GRANT`, and `REVOKE`, on tables in `lab_sandbox` for the current scenario.
3. Expressions may use columns, literals, `auth.uid()`, and `auth.jwt()`, plus a single-level `EXISTS` or `IN (SELECT ...)` against `lab_sandbox`. Other functions and schemas are rejected.
4. The function executes the canonical SQL it emitted, inside `lab_sandbox`, then runs the scenario query.
5. Postgres will not `SET ROLE` inside a security definer function. The query and the per-row `USING` / `WITH CHECK` checks run in a second security definer function owned by `anon`, `authenticated`, or `service_role`, so grants and policies apply as that role. `has_table_privilege` records the grant layer.
6. The function raises a private exception. The subtransaction rolls back. Sandbox tables do not survive the call.

`lab_internal` is not an API schema. `public.labs` and `public.lab_shares` have row level security and no policies for the client roles. Snapshots are read with `get_lab_share(id)`.

## Apply the migrations

The project is empty until these files have been applied, in this order, on a fresh Supabase database. `supabase db push` does that. You can also paste each file into the SQL editor.

1. `supabase/migrations/20261112120000_schemas_tables.sql`
2. `supabase/migrations/20261112120100_evaluator.sql`
3. `supabase/migrations/20261112120200_seed_scenarios.sql`

They are written so pasting them again does not fail: tables use `if not exists`, policies are dropped before they are created, functions are replaced, and the seed upserts.

Do not run `supabase/tests/prelude.sql` on a Supabase project. It replaces `auth.uid()` for vanilla Postgres. Supabase already provides `auth.uid()` and `auth.jwt()`.

`supabase/seed.sql` repeats the catalog for `supabase db reset`, which runs migrations and then the seed.

The lab schema is `lab_sandbox`. Leave it out of the Data API exposed schemas. Tables there exist only inside the rolled-back transaction.

## Vercel

The site builds and renders when these are unset. Run then shows a configuration notice instead of calling the API.

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The publishable key (`sb_publishable_...`). Not the secret key and not `service_role`. |

Next.js inlines `NEXT_PUBLIC_` variables at build time, so they have to be present for the deployment build, not only at runtime. Copy `.env.example` to `.env.local` for `npm run dev`. Do not commit either file with a real key.

## Local checks

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run build
npm run test:sql
```

`npm run test:sql` needs PostgreSQL and applies the migrations twice before the assertions. Set `DATABASE_URL` to an admin database, or rely on local peer auth for the `postgres` user. The script creates and drops `policy_trace_test`.

The SQL tests cover rejected statements, `42501` versus an empty `SELECT`, the silent `UPDATE`, `USING (true)`, the team predicate, `service_role` bypass, rollback, and share links. Vitest covers the browser copy of the whitelist and the trace wording.

## Fonts and marks

The colors and the logo files follow the [Supabase brand page](https://supabase.com/brand). The wordmark and icon in `public/brand/` are the official files, unmodified, and they appear only next to the "Built on" line. The type stack matches the Supabase dashboard (Manrope, Inter, Source Code Pro) from the design system, not from the brand page. The brand page does not name typefaces.
