# 04 — Existing RLS and grants educational content

**Research date:** 12 November 2026, afternoon Africa/Lagos.  
This file inventories official and community material. It does not propose a product. "Interactive" here means the learner can run or simulate policies and see results. "Static" means docs, blogs, or videos that explain without an in-page runner.

## A. Official Supabase documentation (mostly static, plus a CLI test path)

### Core guide — Row Level Security

[https://supabase.com/docs/guides/database/postgres/row-level-security](https://supabase.com/docs/guides/database/postgres/row-level-security)

The current official guide is substantially more complete than older "enable RLS and add a policy" pages. Stated content includes:

- **Grants vs policies.** "Postgres runs two checks before a client touches a table. Grants decide whether a role can run an operation on the table at all. Policies decide which rows that operation applies to. Set both for every table you expose."
- **Default grants** on existing projects: `anon`, `authenticated`, and `service_role` may still receive broad automatic privileges on new `public` tables, including `select/insert/update/delete/truncate/references/trigger` and, on Postgres 17, `maintain`. "Adding policies doesn't take those grants back." The same page points to default-privilege changes; the April 2026 changelog (see below) changes the default for projects after the rollout.
- **`42501` vs empty results.** "A missing grant raises a `42501` error before any policy runs." A `USING` clause that filters a row out "raises nothing, matches zero rows." Official test examples show `throws_ok` for missing grants and `with check` violations, and `is_empty` plus an integrity check for `USING` denials.
- **`anon` vs `authenticated`.** These are Postgres roles. "Using the `anon` Postgres role is different from an anonymous user in Supabase Auth. An anonymous user assumes the `authenticated` role… and can be differentiated… by checking the `is_anonymous` claim."
- **Views bypass RLS by default** because views are usually created as `security definer` by the `postgres` user. Fix on Postgres 15+: `security_invoker = true`. Older versions: revoke access or put the view in an unexposed schema.
- **Recommended procedure for every exposed table:** enable RLS; revoke then re-grant only needed privileges; write a policy per operation (`select` / `insert` / `update` / `delete`, not a vague `for all`); add a `supabase/tests/` pgTAP file; run `supabase test db`. "Until the suite passes, you don't know whether the policies do what you intended."
- **`auth.uid()` wrapping.** Prefer `(select auth.uid()) = user_id` so the optimizer can `initPlan` and cache the result per statement. "You can only use this technique if the results of the query or function do not change based on the row data."
- **`auth.uid()` is null when unauthenticated**, so `auth.uid() = user_id` "will silently fail for unauthenticated users" because `null = user_id` is false. Docs recommend an explicit `auth.uid() IS NOT NULL AND …` check (and, separately, a `to authenticated` clause so the policy does not even run for `anon`).
- **Always name the role** with `to authenticated` (or `to anon`) rather than a policy with no `TO` clause.
- **UPDATE needs a SELECT policy** as well; `USING` and `WITH CHECK` both matter so a user cannot reassign `user_id`.
- **Indexes** on policy filter columns; a column is usable as an index filter only when it is the leading column of a btree index.
- **`auth.jwt()` and `user_metadata` vs `app_metadata`.** Do not authorize on `user_metadata` (user-writable). JWTs can be stale; cookie size limits apply.
- **MFA** via `auth.jwt()->>'aal'` and restrictive policies.
- **Security definer functions:** useful, but they run as the creator and can `bypassrls` if owned by `postgres`. Required hygiene stated in the docs: put them in a non-exposed schema, `set search_path = ''`, schema-qualify names, check `auth.uid()` inside, revoke `EXECUTE` from roles that should not call them. "A `security definer` function in an exposed schema is callable over the Data API with the creator's privileges."
- **Recursive policies** (`42P17`) when two tables' policies read each other; break the cycle with a security definer helper. The helper only skips RLS if its owner can (`bypassrls`); otherwise recursion remains.
- **Bypassing RLS** via secret keys / `service_role` (`bypassrls`). "Never use a secret key in the browser." A secret key used *with* a user access token runs under that user's RLS.

This page is **static documentation**. The "interactive" official path it prescribes is **local `supabase test db` (pgTAP)**, not an in-browser lab.

### Performance guide

[https://supabase.com/docs/guides/database/postgres/row-level-security-performance](https://supabase.com/docs/guides/database/postgres/row-level-security-performance)

Stated points: policy cost scales with rows scanned; index filter columns; wrap functions in `select`; specify roles; diagnose with `explain analyze` under the request role and JWT claims; watch `Rows Removed by Filter`; also filter in the client query, even if that duplicates the policy; avoid joins in policy expressions (rewrite to `IN` subqueries); security definer helpers as an alternative. Optional PostgREST `.explain()` path, with a caution about enabling `pgrst.db_plan_enabled` in production.

**Static**, plus copy-paste SQL.

### Testing guides

- Test RLS with pgTAP: [https://supabase.com/docs/guides/database/postgres/testing-row-level-security](https://supabase.com/docs/guides/database/postgres/testing-row-level-security)
- Database testing (CLI workflow): linked from the main RLS page as "Testing your database"
- Community extension `supabase-test-helpers` (user creation and role impersonation helpers for pgTAP), linked from the official RLS page

These are **static docs around a local/CLI test runner**. They are not a hosted playground.

### Related official docs

- Database views and `security_invoker`: [https://supabase.com/docs/guides/database/views](https://supabase.com/docs/guides/database/views)
- Securing your API (grants, exposed schemas, pre-request checks): [https://supabase.com/docs/guides/api/securing-your-api](https://supabase.com/docs/guides/api/securing-your-api)
- Postgres roles: [https://supabase.com/docs/guides/database/postgres/roles](https://supabase.com/docs/guides/database/postgres/roles)
- Advisors: [https://supabase.com/docs/guides/observability/advisors](https://supabase.com/docs/guides/observability/advisors)
- Automate security checks with agents / MCP `get_advisors`: [https://supabase.com/docs/guides/observability/automate-with-agents/security](https://supabase.com/docs/guides/observability/automate-with-agents/security)
- Official agent-skills material also documents `(select auth.uid())` and security-definer hygiene: [https://github.com/supabase/agent-skills/blob/main/skills/supabase-postgres-best-practices/references/security-rls-performance.md](https://github.com/supabase/agent-skills/blob/main/skills/supabase-postgres-best-practices/references/security-rls-performance.md)

### Official product surfaces (interactive, but not a public teaching lab)

| Surface | What it does | Status as of this pass | Source |
| --- | --- | --- | --- |
| Security Advisors (Splinter) | Lints for missing RLS, loose policies, exposed columns; dashboard + weekly email + MCP | Shipped | [Security retro 2025](https://supabase.com/blog/supabase-security-2025-retro), [Advisors docs](https://supabase.com/docs/guides/observability/advisors) |
| Dashboard Assistant | Generate / apply RLS SQL from alerts, in natural language | Shipped | Same retro |
| Table Editor exposure / RLS-disabled labels | Warnings when a table is exposed without RLS | Shipped | Same retro |
| Role impersonation in Studio ("view data as user") | Inspect data / run SQL as a role or user | Referenced in [PR 45358](https://github.com/supabase/supabase/pull/45358); this pass did not independently walk the live dashboard | GitHub PR |
| RLS Tester feature preview | Run SELECT as a user, see which policies fired, optional AI-inferred client-library tests | **Announced 24 Apr 2026, removed/paused 13 Jul 2026** | [Changelog 45233](https://supabase.com/changelog/45233-feature-preview-rls-tester), [PR 47866](https://github.com/supabase/supabase/pull/47866) |
| Planned "security-focused test harness" | "Validate RLS policies, test authorization logic… before deploying" | Listed as 2026 planned work in a 7 Jan 2026 post; relationship to the paused tester **not stated** | [Security retro](https://supabase.com/blog/supabase-security-2025-retro) |

Studio policy editors and Advisor fix flows are **interactive for project owners**, not a public, shareable, no-account teaching lab.

## B. Official changelog / blog explainers on grants and policies

- Breaking change on automatic Data API exposure / explicit grants / `42501` hints (published 28 Apr 2026; existing-project enforcement 30 Oct 2026): [https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)
- MFA via RLS: [https://supabase.com/blog/mfa-auth-via-rls](https://supabase.com/blog/mfa-auth-via-rls)
- Security retro (defaults, advisors, Assistant, 2026 plans): [https://supabase.com/blog/supabase-security-2025-retro](https://supabase.com/blog/supabase-security-2025-retro)
- App MCP servers with RLS as the agent boundary (22 Oct 2026): [https://supabase.com/blog/give-your-supabase-app-its-own-mcp-server](https://supabase.com/blog/give-your-supabase-app-its-own-mcp-server)

These are **static** posts, some with copy-paste SQL.

## C. Community and third-party tools (interactive vs static)

### Interactive, in-browser policy runners

**Supabase RLS Playground (iloveblogs.blog)** — [https://www.iloveblogs.blog/tools/supabase-rls-playground](https://www.iloveblogs.blog/tools/supabase-rls-playground)

- **Interactive.** Compiles PostgreSQL to WebAssembly in the tab, applies the learner's schema and `CREATE POLICY` SQL, and runs the same query as `anon`, two signed-in users, and `service_role`.
- Stated design: `SET LOCAL ROLE` plus `FORCE ROW LEVEL SECURITY` so owner exemptions cannot fake a pass; shims `auth.uid()` / `auth.jwt()` / `auth.role()` / `auth.email()` from `request.jwt.claims`; grants to `anon` and `authenticated` "the way a real Supabase project grants them"; transactions roll back so INSERTs can be compared fairly; SQL "never leaves this tab."
- Stated scenarios include own-rows, `using (true)` accidents, `WITH CHECK` failures, infinite recursion, "query succeeds and returns nothing," and multi-tenant isolation.
- Stated limits: engine may be a major Postgres version ahead of a given Supabase project; **PostgREST, the API gateway, and Supabase Auth are not in the playground**, so it tests policy SQL, not HTTP-layer behavior.
- This is a **third-party** site, not an official Supabase product. Authorship, maintenance, and longevity were not independently verified beyond the live page fetch.

**Clamp** — [https://www.clampdb.com/](https://www.clampdb.com/)

- **Interactive / assisted testing**, marketed as "Test your RLS before hackers do." User supplies schema and policies; the product "automatically generate[s] and run[s] attack vectors." Claims "Works with Supabase," "No code changes required."
- Marketing page includes policy "before/after" examples (including a type-casting example). Those examples were not audited here for technical correctness.
- Commercial (free and Pro tiers mentioned). Not official.

### Policy builders / DSLs (generate SQL; limited or no full simulator)

**Rowguard** — unofficial TypeScript DSL in the `supabase-community` GitHub org (not the same as first-party `supabase/supabase` engineering). [https://github.com/supabase-community/rowguard](https://github.com/supabase-community/rowguard). Description: "Rowguard - TS to RLS helper." **7 stars**, last push 20 May 2026 (GitHub API, this pass). Docs: [https://supabase-community.github.io/rowguard/](https://supabase-community.github.io/rowguard/). Demo: [https://rowguard-demo.vercel.app/](https://rowguard-demo.vercel.app/). Experimental; generates idempotent policy SQL from typed helpers such as `owned()` and a fluent `PolicyBuilder`. **Mostly a generator**, with a demo site; not a full multi-role Postgres runner on the scale of the WASM playground.

**rls-builder (pvEASV)** — [https://github.com/pvEASV/rls-builder](https://github.com/pvEASV/rls-builder). Indexed as an open-source builder with linting/audit reports. **Not fully reviewed** in this pass.

**SandboxMax "Supabase RLS Policy Generator"** — [https://sandboxmax.com/tools/supabase-rls-builder/](https://sandboxmax.com/tools/supabase-rls-builder/). Third-party generator; page not fully reviewed.

**"The Postgres Guy" RLS Policy Builder** was indexed at `https://thepostgresguy.com/rls` but that URL returned **404** when fetched on 12 Nov 2026. Treat as unavailable unless a new URL is found.

### Official / community code that is not a teaching lab

- Studio "RLS Policy Playground UI" exploration: [https://github.com/supabase/supabase/pull/42346](https://github.com/supabase/supabase/pull/42346) (historical PR; not verified as currently shipped; the later official tester was removed in #47866).
- Splinter (linter behind Security Advisors) — detection, not a teaching simulator.

### Blogs, videos, and threads (static)

A large body of community blog posts, YouTube videos, and Reddit threads explains RLS (including the r/Supabase thread [https://www.reddit.com/r/Supabase/comments/157lnh2/row_level_security_tutorial/](https://www.reddit.com/r/Supabase/comments/157lnh2/row_level_security_tutorial/)). This pass did not attempt an exhaustive catalogue. Official YouTube and Jon Meyers / Tyler Shukert / other DevRel videos exist; individual video titles and dates were not inventoried here (see [06-gaps.md](06-gaps.md)).

## D. What is already well covered vs. where the gaps are

**Already well covered (mostly static, official, high quality as of this fetch):**

- The conceptual model: grants then policies; `anon` vs `authenticated` vs `service_role`; `USING` vs `WITH CHECK`.
- The well-known footguns: missing policies, missing grants vs silent empty reads, unwrapped `auth.uid()`, views as security definer, security definer search_path / exposure, recursive policies, JWT claim hygiene, performance (`initPlan`, indexes, joins in policies), client-side filters.
- How to *test correctly* with pgTAP, including the 42501 vs `is_empty` distinction.
- Dashboard linting (Advisors) and AI-assisted policy drafting (Assistant), inside a user's project.
- The new default-grant world, and the explicit 42501 error hint aimed at humans and agents.

**Already exists in interactive form, but not as official teaching product:**

- At least one third-party in-browser WASM playground that actually runs Postgres and compares four identities.
- At least one commercial attack-vector tester (Clamp).
- A small experimental TS DSL (Rowguard) and other generators.
- Studio role impersonation (for project owners).

**Gaps visible from this inventory (observations, not feature proposals):**

- The only official *dedicated* interactive RLS tester was a feature preview that was **paused and removed** in July 2026, while official writing still lists a future security test harness as desirable.
- Official education is excellent and long, but **read-and-copy** plus a local CLI test suite. There is no official, public, no-project, shareable lab that walks grants *and* policies *and* the Data API/`42501` vs empty-array distinction together.
- The WASM playground explicitly does **not** simulate PostgREST or Auth, which is exactly where "empty array vs 42501" shows up for client-library users.
- Community generators (Rowguard and similar) are early and lightly starred; they generate SQL more than they teach failure modes.
- Much community content predates the 2026 default-grant change, so older tutorials that say "just enable RLS and add a policy" can now be misleading on projects where grants are no longer implicit.
- Agent-facing explanations (RLS as the boundary for MCP tool calls) are official as of October 2026, but this pass did not find a substantial interactive teaching piece aimed at that framing.

No claim is made here about what a portfolio piece should build; see [00-synthesis.md](00-synthesis.md) for opportunity-level synthesis only.
