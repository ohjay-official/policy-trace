# Policy Trace: brief

**Problem.** Supabase RLS and grants fail quietly. A missing SELECT policy returns an empty array with no error, `USING (true)` leaks every row, and since the 2026 default-grants change (published 28 Apr 2026, enforced on existing projects 30 Oct 2026) a missing GRANT returns `42501` instead. Developers and their AI agents can't see *why* a row is or isn't visible.

**Solution.** A shareable "regex101 for Row Level Security". Pick a scenario, switch who you are, edit the policy, and watch rows appear or vanish, with a trace of each policy and grant that decided it.

## Must-haves
1. **Identity switcher plus live row grid.** The identities are anon, Alice, Bob, an agent acting as Alice through an MCP tool call, and service_role (shown with a loud warning that it bypasses RLS). Every query runs for real against Postgres as that role, with JWT claims set.
2. **Trace drawer.** For each row it shows which policy matched, whether it was USING or WITH CHECK, and why a row vanished. It tells the grant layer (`42501`, the request was refused) apart from the policy layer (empty result, rows filtered out).
3. **Editable policies plus share.** You can edit the policy in Source Code Pro, flip GRANT/REVOKE, copy the SQL, and fork the lab through a share link.

## Scenarios (in order of priority)
1. The missing-GRANT `42501` vs the silent empty SELECT. This is the headline and it's new as of 2026.
2. An agent or MCP tool call acting as Alice. It ties to "Every tool call runs as that user, so your RLS policies decide what each agent can reach" ([source](https://supabase.com/blog/give-your-supabase-app-its-own-mcp-server)).
3. The `USING (true)` trap.
4. An UPDATE that silently does nothing because the table has no SELECT policy.
5. Personal notes or a team workspace (the baseline).

## Defensible angle
Supabase shipped an RLS Tester preview (Apr 2026) and then removed it while they "re-evaluate its direction" ([PR 47866](https://github.com/supabase/supabase/pull/47866)). The existing third-party playgrounds don't simulate the API-layer `42501`. Policy Trace runs real Postgres roles on a real Supabase project.

## 15-second money shot
On a phone, switch from Alice to Bob and watch Alice's rows disappear while the trace explains why. Revoke SELECT and the grid turns into a red `42501` card labelled "grant layer, not policy". Add the missing GRANT and the rows come back.

## Out of scope
Scanning other people's databases, pasting a service_role key, generic dashboards, auth/sign-up for v1 (labs are anonymous and shared by token), and running arbitrary SQL.

## 60-second demo script (draft)
- 0 to 10s: the live lab on a phone, switching identity and watching rows change.
- 10 to 25s: the empty SELECT. Show the trace naming the missing policy.
- 25 to 40s: revoke the grant, the `42501` card appears, then fix it with one line.
- 40 to 52s: the agent acting as Alice can reach only Alice's rows. Then the `USING (true)` chip leaks everything.
- 52 to 60s: copy the SQL, share the link, and point to the README tutorial.
