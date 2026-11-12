# 00 — Synthesis (research only, no feature ideas)

**Research date:** 12 November 2026, afternoon Africa/Lagos.  
This is a synthesis of [01](01-role.md)–[07](07-verification.md). It separates **stated facts** from **inferences**. It does not brainstorm product ideas, feature lists, or a spec.

## The situation in one paragraph

A **Developer Relations Engineer** role on Supabase's official board is **open** as of this pass: Remote, Global, Marketing, published **11 November 2026, 23:44 Africa/Lagos**, apply at [Ashby](https://jobs.ashbyhq.com/supabase/26f7817d-ca92-4094-a2b5-f22e07a218c4). The official text does **not** say "entry level." It asks for someone who ships full-stack work (JS/TS, Postgres, modern frontend), creates technical content (especially video), and is comfortable being public. A growing audience, prior DevRel/OSS, and prior Supabase use are bonuses. Location-specific twins in SF, NY, and London require living in those cities for in-person video shoots; the Global posting does not. That is the official "judge sheet." Everything else in this pack is context for how that team, that company, and that subject area actually behave in public.

## Opportunities (what the sources make visible)

1. **The official job is a builder-teacher role, not a pure community-manager role.** Stated deliverables are high-impact content (especially video), real apps with Next.js/React/Stripe, and "guides that others can follow and remix," plus community feedback and launch support. "Content that makes people want to open their code editor" is their phrase, not a paraphrase.

2. **Culture writing still privileges async shippers.** Ant Wilson (2022–2023) and Paul Copplestone (interviews) emphasize async work, low meeting load, autonomy, "why not now?", intellectual honesty, and "smart and gets things done," including from outside SF/London/NY. Wilson also wrote in 2023 that Supabase "very rarely hire[s] juniors" while still hiring younger people who "can out-ship people twice their age." That sentence is real and dated; it is not in the 2026 posting. **Inference:** a candidate who cannot point to shipped work and clear writing/teaching will be fighting both the posting and the culture essays; a candidate whose work is strong should not assume the 2023 "rarely juniors" line is an automatic screen on this requisition, because the requisition itself does not say that.

3. **Security, grants, and RLS are a multi-year platform priority, and the ground just shifted.** Official 2025–2026 work includes RLS-on-by-default, Advisors/Splinter, an Assistant that writes policies, explicit default-grant changes with `42501` hints aimed at humans *and* agents, and — as of the 22 October 2026 MCP post — RLS framed as the boundary for what an agent may do as a signed-in user. The existing-project grant change was scheduled for **30 October 2026**, two weeks before this research date.

4. **Official education is deep, and official interactive testing is a known hole.** The current RLS guide is unusually thorough on footguns (grants vs policies, `auth.uid()` wrapping, views, security definer, recursion, 42501 vs empty reads, pgTAP). The company's own April 2026 changelog called verifying policy correctness "a gap." They piloted an RLS Tester preview and **paused/removed it in July 2026**, while a January 2026 retro still listed a "security-focused test harness" as planned. That is a stated product-education tension, not a suggestion.

5. **The official program language already connects community teaching to employment.** SupaSquad's public page lists Content Creator / Contributor / Host / Speaker tracks and says there is "Room to grow from volunteer to paid contributor to paid employee." This pass could not name someone who walked that path into DevRel, but the company is willing to say the path exists.

6. **Remote-global is the posting that geographically fits a Nigeria-based builder.** That is stated by the contrast with the SF/NY/London variants, which require being based there for video shoots. "We hire globally" is official. Country-level exclusions were not found and also not ruled out (see [06-gaps.md](06-gaps.md)).

## What is already done (do not pretend it is empty land)

- Official docs already explain the important RLS/grants footguns, with test patterns, and official changelogs already explain the 2026 grant default.
- Advisors already lint common misconfigurations; the Assistant already drafts policy SQL inside a user's project.
- Studio can impersonate roles (to some degree); a dedicated official tester existed and was pulled back.
- Third parties already offer an in-browser WASM policy runner (iloveblogs playground), a commercial attack-vector tester (Clamp), and early policy DSLs (Rowguard and others).
- A large volume of static community tutorials and videos already exists; much of it may predate the 2026 grant change.
- Current DevRel staff already publish official content and talks; two recent hires are publicly associated with pre-existing creator audiences (evidence of *association*, not of a documented hiring recipe).

## Gaps (in the landscape, and in this research)

**Landscape gaps, as observed from sources:** there is no official, public, no-project teaching lab that lets a learner *see* grants and policies and Data API behavior together; third-party playgrounds generally do not simulate PostgREST/`42501`; older tutorials can be stale after the October 2026 grant default; the official interactive tester was withdrawn while the need is still acknowledged in official writing; agent-boundary framing of RLS is new official language (October 2026) without a large accompanying teaching corpus found in this pass.

**Research gaps:** no official "what a good DevRel application looks like" guide; no verified "this repo got me the job" story at Supabase or most peer companies; no complete org chart or interview-loop detail; official posting is not labeled entry-level; typography is not on the brand page (fonts come from the design-system PR); several people/tool/launch items remain unverified — full list in [06-gaps.md](06-gaps.md). Steered-claim checks are in [07-verification.md](07-verification.md).

## What kinds of portfolio pieces have the best chance

This is inference from the sources above, not a brief and not a feature list.

**Better-aligned with what is actually written down:**

- Work that is **shipped, public, and easy for a reviewer to try**, because the posting asks for demos and "guides that others can follow and remix," and because documented hire narratives at this company and at Vercel emphasize already-public teaching, not private artifacts.
- Work that **demonstrates the exact skill pairing in the posting**: TypeScript/Postgres/modern frontend engineering *and* teaching (written tutorial, and, officially "especially," video). A README-only repo or a video with nothing runnable is only half of the stated job.
- Work that is **technically current with 2026 platform reality** (explicit grants, 42501 vs silent empty reads, Advisors/Assistant/MCP framing, official footguns), because a large share of existing tutorials is static and, in many cases, pre-dates the default-grant change.
- Work that shows **self-directed, async, remixable craft** — the culture essays and the "self-directed, organized, excited to contribute to open source" fit line all point the same way.
- Distribution on **X / YouTube / similar**, if it exists, is officially a bonus, not a gate. Documented recent hires appear to have had audiences; the early Meyers path shows that a large audience is not the only historical route.

**Weaker alignment, based on the same sources:**

- A generic "another Supabase CRUD starter" that does not teach anything the official docs and Advisors do not already cover.
- Location-specific applications (SF/NY/London) that the candidate cannot geographically satisfy.
- Applying to the Senior Twitter Brand Rep requisition, which officially wants an already-known senior voice — a different job.
- Relying on aggregator "entry level" language, or on unverified "they hired someone for a similar lab" stories this pass could not find.
- Treating a hackathon-style playful demo as a substitute for the posting's teaching bar. Official hackathons reward polished demos with swag, not jobs; the DevRel posting's first bullet is educational content.

**No specific project is recommended here.** The next phase, if the builder wants it, is idea selection against this research — not before they have reviewed it.
