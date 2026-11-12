# 07 — Verification of steered claims

**Research date:** 12 November 2026, afternoon Africa/Lagos (WAT, UTC+1).  
Each row was checked against the primary source, not against a secondary summary. "Verified" means the primary source supports the claim as written. "Partial" means part of the claim is true and part is not, or a date/role was conflated. "Not verified" / "Incorrect" means the primary source contradicts or does not contain the claim.

## Summary table

| ID | Claim as given | Verdict | Primary source |
| --- | --- | --- | --- |
| Role | [Ashby posting 26f7817d…](https://jobs.ashbyhq.com/supabase/26f7817d-ca92-4094-a2b5-f22e07a218c4) is an entry-level DevRel Engineer role, remote global, posted 11 Nov 2026, needing JS/TS, Postgres, React, and technical content | **Partial** | Official posting + [Ashby job-board API](https://api.ashbyhq.com/posting-api/job-board/supabase) |
| (a) | Changelog [45329](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically) is dated 30 Oct 2026; new public tables are not exposed to the Data API, so a missing GRANT returns `42501` instead of an empty array | **Partial** | Official changelog (JSON-LD `datePublished`: 2026-04-28) |
| (b) | Feature preview [RLS Tester](https://supabase.com/changelog/45233-feature-preview-rls-tester); claimed pulled in [PR 47866](https://github.com/supabase/supabase/pull/47866) | **Partial / corrected** | Changelog + the PR itself |
| (c) | Blog [Give your Supabase app its own MCP server](https://supabase.com/blog/give-your-supabase-app-its-own-mcp-server) frames RLS as the agent boundary | **Verified** | Official blog, 22 Oct 2026 |
| (d) | Brand page colors `#3ECF8E` / `#1C1C1C` / `#F8F8F8`; fonts; logo URLs `…/supabase-logo-green-white-transparent.svg` and `…/supabase-icon-green-transparent.svg`; usage rules | **Partial** (colors, logo URLs, and usage rules verified; fonts are **not** on the brand page) | [https://supabase.com/brand](https://supabase.com/brand) and HTTP HEAD of the asset URLs |

## Role posting

**Verified:**

- Title is "Developer Relations Engineer". Location is "Remote, Global". Department/team is Marketing. Employment type is FullTime. Workplace is Remote.
- `publishedAt` from the official Ashby API is `2026-11-11T22:44:19.400+00:00` = **11 November 2026, 23:44 Africa/Lagos**.
- `isListed: true` on 12 November 2026, and the role is also listed at [https://supabase.com/careers](https://supabase.com/careers).
- Requirements include "Strong engineering skills, especially with JavaScript or TypeScript, Postgres, and modern frontend frameworks (React, Svelte, Vue, etc.)" and "Experience creating technical content (written or video)".

**Not verified / corrected:**

- The official posting does **not** say "entry level". That label appears on some aggregator copies of related location variants, not on the Ashby or careers text. See [01-role.md](01-role.md).
- "Needs React" is slightly tighter than the official wording, which lists "React, Svelte, Vue, etc." as examples of modern frontend frameworks.

Quoted in full in [01-role.md](01-role.md). Application URL: [https://jobs.ashbyhq.com/supabase/26f7817d-ca92-4094-a2b5-f22e07a218c4/application](https://jobs.ashbyhq.com/supabase/26f7817d-ca92-4094-a2b5-f22e07a218c4/application).

## (a) Changelog 45329 — default grants / 42501

**Primary source:** [https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)  
**JSON-LD `datePublished`:** 2026-04-28 (not 30 October 2026).

**Verified in the changelog:**

- New tables in the `public` schema will no longer be exposed to the Data API automatically.
- Timeline as stated: opt-in at project creation from 28 April 2026; default for all **new** projects from 30 May 2026; applied to **all existing projects** on **30 October 2026**.
- "Once the change is rolled out to your project, new tables you create in `public` schema require an explicit opt-in (via a Postgres `grant`) before the Data API can see them. Existing tables are not affected in your project, they keep their current grants and stay reachable."
- "RLS behavior remains unchanged. Grants are a separate layer: they control whether a role can access a table at all, while RLS controls which rows that role can see."
- "If a grant is missing, PostgREST returns a clear error rather than a silent failure," with this example body:

```json
{
  "code": "42501",
  "message": "permission denied for table your_table",
  "hint": "Grant the required privileges to the current role with: GRANT SELECT ON public.your_table TO anon;"
}
```

**Corrected:**

- "Dated 30 Oct 2026" is not the publication date. 30 October 2026 is the **enforcement date for existing projects**. The post itself is from 28 April 2026.
- The 42501 vs empty-array distinction is about **missing grants**, which fail loudly, versus **RLS `USING` filters**, which (as official RLS docs also state) can return zero rows with no error. The changelog is explicit that the new default is about grants, not a change to RLS.

As of this research date (12 Nov 2026), the 30 October 2026 existing-project enforcement date has already passed, according to the published timeline. This pass did not independently confirm rollout completion on every existing project.

## (b) RLS Tester changelog and PR 47866

**Primary sources:**

- Changelog: [https://supabase.com/changelog/45233-feature-preview-rls-tester](https://supabase.com/changelog/45233-feature-preview-rls-tester) — JSON-LD `datePublished` **2026-04-24**.
- PR: [https://github.com/supabase/supabase/pull/47866](https://github.com/supabase/supabase/pull/47866) — title "Clean up RLS Tester artifacts"; **merged 13 July 2026** by joshenlim.

**Verified about the feature preview (changelog):**

- Supabase piloted a dashboard UI for RLS testing, using role impersonation.
- It could run a SQL query as a user (logged in / not), show which RLS policies were evaluated, and help debug misconfigured policies.
- Partial support for testing client-library code, inferred to SQL by the AI Assistant; "Given that this is by AI, as always do verify the output!"
- Only `SELECT` was supported in the preview, because mutation queries could trigger side effects.
- The changelog's "Related PR" for introducing the preview is [https://github.com/supabase/supabase/pull/45121](https://github.com/supabase/supabase/pull/45121), **not** #47866.

**What PR 47866 actually does (from the PR body, not from a summary):**

> As per PR title - we're pausing the development of the RLS Tester feature preview while we re-evaluate its direction. Have also updated the GH discussion here RE this!
>
> Removes the RLS Tester UI + Sandbox functionality

The PR is a removal: +4 / −3316 across 35 files, deleting the feature-preview entry, banner, RLS Tester UI, query-testing utilities, and the PGlite sandbox. It does **not** ship or land the tester.

**Corrected:** Saying the tester was "pulled in PR 47866" is easy to misread as "the feature landed in that PR." The PR **removed** a previously shipped preview and paused further development. The 2025 security retro still lists a future "security-focused test harness" as planned work for 2026 ([https://supabase.com/blog/supabase-security-2025-retro](https://supabase.com/blog/supabase-security-2025-retro), published 7 Jan 2026). Whether that planned harness is the same effort as the paused tester was **not** stated.

## (c) "Give your Supabase app its own MCP server" and RLS as the agent boundary

**Primary source:** [https://supabase.com/blog/give-your-supabase-app-its-own-mcp-server](https://supabase.com/blog/give-your-supabase-app-its-own-mcp-server)  
**JSON-LD:** published **22 October 2026**. Authors: Raúl Barroso, Greg Richardson, Saxon Fletcher.

**Verified — the post does frame RLS as the boundary for agent tool calls.** Direct quotes:

> They sign in with the account they already have. Every tool call runs as that user, so your RLS policies decide what each agent can reach.

> `withSupabase({ auth: 'user' })` verifies the token and supplies the handler with the user's Supabase client. Queries through that client run with the user's identity, so Postgres applies the table's RLS policies.

> The tool filters by task status. Your RLS policies decide which rows that user can reach.

The Select 2026 recap uses the same framing: "every tool call runs as that user, with your RLS policies deciding what it can reach." [https://supabase.com/blog/supabase-select-2026-recap](https://supabase.com/blog/supabase-select-2026-recap) (published 2 Oct 2026).

This is about **a customer's app exposing its own MCP server**, which is separate from the official Supabase MCP server that coding agents use to operate a Supabase project. The blog states that distinction.

## (d) Brand page, colors, fonts, logo URLs, usage rules

**Primary source:** [https://supabase.com/brand](https://supabase.com/brand)

**Colors — verified**, including token names:

| Name | Token | HEX |
| --- | --- | --- |
| Supabase green | `brand-default` | `#3ECF8E` |
| Dark gray | `gray-dark-200` | `#1C1C1C` |
| Light gray | `gray-light-200` | `#F8F8F8` |

The page also gives RGB, HSL, and OKLCH. It says: "The logo files already have the correct colors, so do not repaint the logo with these values."

**Logo asset URLs — verified** with HTTP HEAD on 12 Nov 2026, returning HTTP 200 and `content-type: image/svg+xml`:

- [https://supabase.com/brand-assets/supabase-logo-green-white-transparent.svg](https://supabase.com/brand-assets/supabase-logo-green-white-transparent.svg) (wordmark for dark backgrounds)
- [https://supabase.com/brand-assets/supabase-icon-green-transparent.svg](https://supabase.com/brand-assets/supabase-icon-green-transparent.svg) (icon, light or dark backgrounds)

Other official files listed on the same page include `supabase-logo-green-black-transparent.svg` (light backgrounds), plus black and white one-color wordmarks. All listed files have transparent backgrounds.

**Usage rules — verified** (paraphrase only where noted; quotes are from the page):

- Choose the file for the background where the logo appears, not for the browser or editor theme.
- If a request asks for "the Supabase logo", use the wordmark with black lettering on a light background; on a dark background, use white lettering.
- In small spaces or next to other brand icons, use the green icon.
- "There is no file with the lettering alone. Every wordmark file includes the symbol."
- "Write Supabase as one word, with a capital S. Do not write SupaBase or Supa Base."
- "Use the Supabase logos only to refer to Supabase. Do not change the files or the logo colors."
- "Supabase and the Supabase logo are trademarks of Supabase Inc."
- The Connect Supabase button kit "Do not use the button as a logo."

**Fonts — not on the brand page.** The official brand guidelines page fetched on 12 Nov 2026 does not name typefaces. Fonts were instead verified from a merged official design-system PR, [#48477](https://github.com/supabase/supabase/pull/48477) (merged 30 July 2026), which states the Studio / www / docs / design-system stack is:

- Inter for body (`--font-sans`)
- Manrope for headings (`--font-heading`)
- Source Code Pro for mono

The public typography docs page at [https://supabase.com/design-system/docs/typography](https://supabase.com/design-system/docs/typography) describes typography *variables and utilities* and did not, in the fetched content, name those typefaces. Do not cite the brand page as the font source.
