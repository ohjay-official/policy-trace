# 03 — Supabase priorities: launches, RLS/security, AI tooling, brand

**Research date:** 12 November 2026, afternoon Africa/Lagos.  
Only items below with a URL are treated as stated facts. Numbered Launch Weeks after 15 were not found on the official site.

## A. Launch cadence through 2026

### Numbered Launch Weeks (official)

The official Launch Week hub fetched in this pass still presented **Launch Week 15** (14–18 July 2025): [https://supabase.com/launch-week](https://supabase.com/launch-week). No official Launch Week 16 page was confirmed.

**Launch Week 14** (late March–early April 2025), official "Top 10" recap: [https://supabase.com/blog/launch-week-14-top-10](https://supabase.com/blog/launch-week-14-top-10). Stated launches included:

1. Deploy Edge Functions from the Dashboard
2. Realtime Broadcast from database triggers
3. Route Data API requests to the nearest read replica
4. Official Supabase UI Library (shadcn/ui-based)
5. **Official MCP Server** (connect Claude, Cursor, and similar tools to create projects, fetch config, run SQL, and more)
6. Declarative schemas
7. Clerk as a Third-party Auth integration
8. Postgres Language Server
9. Dedicated poolers
10. Invitation to AI-builder partners (Lovable, Bolt, Tempo, and others)

Dashboard wrap for the same period: [https://supabase.com/changelog/34794-dashboard-updates-240225-070425](https://supabase.com/changelog/34794-dashboard-updates-240225-070425) (Edge Function tester, SQL/Table Editor tabs, multiple Assistant chats).

**Launch Week 15** (14–18 July 2025): [https://supabase.com/launch-week](https://supabase.com/launch-week). Stated main-stage items: JWT signing keys; Analytics Buckets with Iceberg; Branching 2.0; new observability features; persistent storage for Edge Functions. Build-stage items included the UI Platform Kit, Figma Make backend creation, stripe-sync-engine, **"Improved Security Controls and A New Home for Security"**, an Algolia connector, and Storage upload/egress changes.

### After numbered Launch Weeks: December 2025 and Select 2026

Supabase Wrapped 2025 lists a set of later announcements (Remote MCP Server, Solana/Ethereum login, AWS Marketplace, Metrics API, and others): [https://supabase.com/wrapped](https://supabase.com/wrapped). Individual item dates on that page were not fully extracted in this pass.

**Supabase Select 2026** is the company's conference and the main official 2026 "big launch" event found in this pass (not a numbered Launch Week). Recap published 2 October 2026: [https://supabase.com/blog/supabase-select-2026-recap](https://supabase.com/blog/supabase-select-2026-recap). Stated themes and launches:

- **Build anything:** local development without Docker (alpha); Declarative Schemas 2.0; Supabase Compute (private alpha); **your app's own MCP server** (Edge Function, Auth, RLS).
- **Operate with confidence:** agent health/security/performance prompts; Health Check Advisors; Database Connections UI; `query_logs` MCP tool and agent skill; Explorer and Notebooks; Enterprise-Managed Auth for MCP; scoped PATs; MCP Elicitations; Pipelines to new destinations.
- **Scale without limits:** Multigres (private alpha); OrioleDB (public beta); dbarena benchmarks.

Related official posts: [https://supabase.com/blog/give-your-supabase-app-its-own-mcp-server](https://supabase.com/blog/give-your-supabase-app-its-own-mcp-server) (22 Oct 2026); [https://supabase.com/blog/select-2026-operate-with-confidence](https://supabase.com/blog/select-2026-operate-with-confidence).

**Inference:** Through 2025 the company still ran numbered Launch Weeks. In 2026 the public "moment" that is clearly documented on the official blog is Select, plus ongoing changelogs, with a strong emphasis on agents, code-first operations, and security defaults.

## B. RLS, grants, roles, policies, Auth, and security tooling

### Safer defaults (2025–2026)

**"Supabase Security Retro: 2025"** — Bil Harmer and Paul Copplestone, 7 January 2026: [https://supabase.com/blog/supabase-security-2025-retro](https://supabase.com/blog/supabase-security-2025-retro).

Stated 2025 shipping, among other items:

- Option to disable the Data API, or to use a custom exposed schema, at project creation and on existing projects.
- New API keys (`publishable` / revocable `secret`) and asymmetric JWTs; legacy keys "will be removed in late 2026."
- Automatic revocation of leaked secret keys detected in public GitHub repos.
- **RLS enabled by default** for tables created via the dashboard; event triggers (and a one-click dashboard setup) to auto-enable RLS for other creation paths.
- Warning labels in the Table Editor when RLS is disabled; email and dashboard alerts for tables without RLS.
- **Security Advisors** using **Splinter**, an open-source Postgres security linter, checking patterns such as tables without RLS, overly loose policies, and exposed sensitive columns; weekly emails to org owners.
- Dashboard **Assistant** that can generate and apply RLS policies from Advisor alerts, in plain language.
- Advisors also available through the **MCP server**.
- Column-level privileges; custom JWT claims for RBAC; VPC / PrivateLink; fail2ban and IP allowlists; OpenAPI spec restricted with publishable keys.

Stated 2026 plans in the same post (plans, not necessarily shipped as of the January 2026 publish date):

- Grant toggles for exposed schemas in the dashboard (then "in staging").
- Exploring OpenFGA / Zanzibar-style authorization, Postgres-natively.
- GitHub push protection for secret keys.
- `pg_graphql` disabled by default on new projects.
- Expanded Security Advisor lints.
- Hardened project configurations.
- **"A dedicated test harness for security will help developers validate RLS policies, test authorization logic, and ensure security configurations are correct before deploying to production."**
- Assistant available in more surfaces (GitHub, Slack, email).
- Richer security alerts.

### Default grants no longer automatic (the April–October 2026 breaking change)

Official changelog, published **28 April 2026**: [https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically).

Stated timeline: opt-in 28 April 2026; default for new projects 30 May 2026; **enforced on existing projects 30 October 2026**. New `public` tables need an explicit `GRANT` before the Data API can see them. Missing grants return Postgres/PostgREST **`42501`** with a fix hint, "rather than a silent failure." RLS is unchanged and is a separate layer. The post frames this as necessary because "agents, CLI scripts, and AI platforms create tables too." Full quotes and the 42501 example are in [07-verification.md](07-verification.md).

As of 12 November 2026, that October 30 existing-project date is in the past according to the published timeline. Per-project completion was not independently verified.

### Official RLS Tester preview — shipped, then paused

- Announced as a feature preview on **24 April 2026**: [https://supabase.com/changelog/45233-feature-preview-rls-tester](https://supabase.com/changelog/45233-feature-preview-rls-tester). Role-impersonation UI, policy evaluation visibility, SELECT-only, optional AI-inferred client-library tests. Introduction PR cited: [#45121](https://github.com/supabase/supabase/pull/45121).
- **Removed / paused** on **13 July 2026** in [#47866](https://github.com/supabase/supabase/pull/47866): "we're pausing the development of the RLS Tester feature preview while we re-evaluate its direction." See [07-verification.md](07-verification.md).

**Inference:** Official docs now push `supabase test db` / pgTAP as the way to *know* policies work ([https://supabase.com/docs/guides/database/postgres/row-level-security](https://supabase.com/docs/guides/database/postgres/row-level-security)). An interactive dashboard tester existed briefly and was pulled back, while a "security-focused test harness" remains listed as planned work in the January 2026 retro. Whether those are the same program was not stated.

### Launch Week 15 security controls

"Improved Security Controls and A New Home for Security", 16 July 2025: [https://supabase.com/blog/improved-security-controls](https://supabase.com/blog/improved-security-controls). Centralized security docs (including RLS and Data API hardening); org-wide MFA enforcement; Realtime private-channels-only setting; ability to **disable specific Security and Performance Advisor rules** (example given: "RLS Disabled in Public" may not apply to a server-only project).

### Auth and MFA via RLS

Older but still official: MFA enforcement via RLS using AAL and AMR JWT claims, including the note that overlapping policies are permissive (`OR`) by default and that restrictive policies are needed to AND checks: [https://supabase.com/blog/mfa-auth-via-rls](https://supabase.com/blog/mfa-auth-via-rls).

Passkey sign-in for Supabase Auth was listed in the June 2026 developer update: [https://supabase.com/changelog/46689-developer-update-june-2026](https://supabase.com/changelog/46689-developer-update-june-2026).

### Postgres roles and grants in current docs

- RLS guide (grants vs policies, `anon` vs `authenticated`, default privileges, 42501): [https://supabase.com/docs/guides/database/postgres/row-level-security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- Roles: [https://supabase.com/docs/guides/database/postgres/roles](https://supabase.com/docs/guides/database/postgres/roles)
- Securing the API: [https://supabase.com/docs/guides/api/securing-your-api](https://supabase.com/docs/guides/api/securing-your-api)

## C. AI Assistant and official MCP server

- Official MCP server docs: [https://supabase.com/docs/guides/ai-tools/mcp](https://supabase.com/docs/guides/ai-tools/mcp)
- Feature page: [https://supabase.com/features/mcp-server](https://supabase.com/features/mcp-server)
- Remote MCP announcement (historical): [https://supabase.com/blog/remote-mcp-server](https://supabase.com/blog/remote-mcp-server)
- Advisors, including via agents: [https://supabase.com/docs/guides/observability/advisors](https://supabase.com/docs/guides/observability/advisors), [https://supabase.com/docs/guides/observability/automate-with-agents/security](https://supabase.com/docs/guides/observability/automate-with-agents/security)
- The Assistant can generate RLS policy SQL from Advisor findings (security retro, cited above).
- App-owned MCP servers, with RLS as the per-user agent boundary: [https://supabase.com/blog/give-your-supabase-app-its-own-mcp-server](https://supabase.com/blog/give-your-supabase-app-its-own-mcp-server) — verified in [07-verification.md](07-verification.md).

**Inference (not a product claim):** Across 2025–2026 official writing, "agents will create tables and call tools, so grants and RLS have to be explicit and testable" is a repeated platform theme.

## D. Brand and design guidelines

Official brand page: [https://supabase.com/brand](https://supabase.com/brand).

Verified there:

- Colors: Supabase green `#3ECF8E` (`brand-default`), dark gray `#1C1C1C` (`gray-dark-200`), light gray `#F8F8F8` (`gray-light-200`). Do not repaint logo files with these values.
- Logo files and usage rules (background-specific wordmarks, icon for small spaces, one-word capitalization "Supabase", no modification of files or logo colors, trademark notice).
- Asset URLs confirmed HTTP 200:
  - [https://supabase.com/brand-assets/supabase-logo-green-white-transparent.svg](https://supabase.com/brand-assets/supabase-logo-green-white-transparent.svg)
  - [https://supabase.com/brand-assets/supabase-icon-green-transparent.svg](https://supabase.com/brand-assets/supabase-icon-green-transparent.svg)
  - Also listed: green/black wordmark for light backgrounds, and one-color black/white wordmarks.

**Fonts are not documented on the brand page.** They are documented in merged official PR [#48477](https://github.com/supabase/supabase/pull/48477) (30 July 2026): Inter for body, Manrope for headings, Source Code Pro for mono. Design-system typography utilities: [https://supabase.com/design-system/docs/typography](https://supabase.com/design-system/docs/typography). Color usage docs: [https://supabase.com/design-system/docs/color-usage](https://supabase.com/design-system/docs/color-usage). Design system hub: [https://supabase.com/design-system](https://supabase.com/design-system).

Full verification notes: [07-verification.md](07-verification.md).
