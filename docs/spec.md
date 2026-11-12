# Policy Trace: spec

## Stack
Next.js App Router (TypeScript), Tailwind, deployed on Vercel from GitHub `ohjay-official/policy-trace`, running on Oh-Jay's own Supabase project. Tests use Vitest for the pure trace logic, plus SQL tests for the evaluator. CI runs typecheck, lint, test and build on every push.

## Routes
- `/` is a serious landing page: one sentence on what it is, the scenario picker, and a link to the README tutorial.
- `/lab/[slug]` is the product.
- `/share/[id]` is a read-only snapshot of a forked lab with a "fork this" button.

## How evaluation works (safe by construction)
- Each lab run happens inside a single Postgres transaction that is **always rolled back**. It is called through one `SECURITY DEFINER` RPC (`run_lab`) or an Edge Function. Inside the transaction it:
  1. creates or replaces the demo schema objects for the scenario, in a locked schema (`lab_sandbox`, never `public`),
  2. applies the user's policies and grants. These are **parsed and whitelisted**: only `CREATE POLICY`, `DROP POLICY`, `ALTER TABLE ... ENABLE/DISABLE ROW LEVEL SECURITY`, `GRANT` and `REVOKE` on sandbox tables. It rejects anything else, including multiple statements, function definitions, and references outside `lab_sandbox` and `auth.uid()` / `auth.jwt()`,
  3. does `SET LOCAL ROLE anon|authenticated|service_role` and sets `request.jwt.claims` for the chosen identity,
  4. runs the scenario query and captures the rows or the SQLSTATE (`42501`, etc.),
  5. for the trace, evaluates each policy's USING / WITH CHECK expression per row as the same role, plus `has_table_privilege` for the grant layer,
  6. rolls back.
- It never accepts arbitrary SQL. It never exposes or accepts a service_role key from the client. Statement timeout is 2s, and there is a size limit on the policy text.

## Data (public schema, RLS on)
- `scenarios`: public read, seeded.
- `labs`: a saved policy set. Writable only through the RPC.
- `lab_shares`: a tokenized read-only snapshot. Read by token.
Every table gets explicit GRANTs (the 2026 default means nothing is exposed automatically).

## UI
- Brand: #1C1C1C canvas, #F8F8F8 text, #3ECF8E used sparingly (the active identity, the pass state). Use the official Supabase logo SVGs unmodified from supabase.com/brand-assets with "built on" attribution. Do not imply the site is an official Supabase product. Fonts: Manrope for headings, Inter for body, Source Code Pro for code. Sentence case throughout. No gradients, glow, emoji icons or fake stats.
- Phone first. The identity switcher is a segmented control. The row grid shows a row card per row on mobile. The trace opens as a bottom sheet on mobile and a side drawer on desktop. Anti-pattern chips load known traps.
- Realtime (stretch): two windows on the same lab stay in sync for the demo video.

## Failure conditions to test
Rejected non-whitelisted SQL. `42501` vs empty result distinguished correctly. service_role shows its bypass warning. The rollback leaves no state behind. A share link works logged out.

## Phone setup
Repo, then Vercel project linked with env vars `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the publishable key). No secrets in files.
