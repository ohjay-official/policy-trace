# Tutorial

A walk through the five labs, with the SQL and the trace copy as they appear on the live site. Every run is a transaction that rolls back. Edits you type are not saved unless you create a share snapshot. No signup.

The identities are fixed:

| Who | Postgres role | `auth.uid()` |
| --- | --- | --- |
| anon | `anon` | null |
| Alice | `authenticated` | `11111111-1111-1111-1111-111111111111` |
| Bob | `authenticated` | `22222222-2222-2222-2222-222222222222` |
| Agent as Alice | `authenticated` | Alice's id, with `app_metadata.agent = true` |
| service_role | `service_role` | null, and the role bypasses row level security |

`service_role` is on the switch so the bypass is visible. When that identity is selected, the screen shows: "service_role bypasses row level security. Policies do not run for this role. A secret key in a browser can read every row the grants allow. This lab never asks for that key." The browser only ever uses the publishable key. There is no field for a secret key.

## 1. Missing grant

Open [/lab/missing-grant](https://policy-trace-gray.vercel.app/lab/missing-grant) as Alice. The default SQL is the owner policy with no grant:

```sql
alter table lab_sandbox.documents enable row level security;

create policy "owner reads own documents"
on lab_sandbox.documents
as permissive
for select
to authenticated
using ((select auth.uid()) = owner_id);
```

The result kicker is **Grant layer, not policy**. The card shows **42501** and **permission denied for table documents**. The detail is that the `SELECT` grant is missing for `authenticated`, so Postgres did not run the policies. The per-row trace is still drawn: Alice's "Q4 plan" shows `USING matched`, and Bob's "Hiring notes" shows `USING did not match`, with the note that the grant check failed first.

**Silent empty select** is the other half of the comparison:

```sql
alter table lab_sandbox.documents enable row level security;

grant select on lab_sandbox.documents to authenticated;
```

`sqlstate` is null. The query succeeds and returns no rows. The kicker is **Policy layer**. The result table lists both rows as **Filtered**. The trace detail is "The query succeeded and raised no error. Row level security filtered every row. An empty result is not a 42501." There are no policies, so the per-row policy checks are empty.

**Grant and owner policy** adds both layers. Alice gets "Q4 plan" only, marked **Returned**. The hidden row, "Hiring notes," is marked **Filtered**, and its trace says `USING did not match`.

## 2. Agent as Alice

Open [/lab/agent-as-alice](https://policy-trace-gray.vercel.app/lab/agent-as-alice). The scenario query is the `list_tasks` tool. The agent does not get a special Postgres role. It runs as Alice, with Alice's JWT, which is the same framing as [Supabase's 22 October 2026 post](https://supabase.com/blog/give-your-supabase-app-its-own-mcp-server): "your RLS policies decide what each agent can reach."

The default owner policy:

```sql
alter table lab_sandbox.tasks enable row level security;

grant select on lab_sandbox.tasks to authenticated;

create policy "owners read their tasks"
on lab_sandbox.tasks
as permissive
for select
to authenticated
using ((select auth.uid()) = owner_id);
```

As Agent as Alice, "Ship the grant fix" and "Record the demo" are marked **Returned**. Bob's "Review the hiring notes" is marked **Filtered**, and its trace says `USING did not match`.

**Add USING (true)** places a second permissive policy next to the owner policy. Permissive policies combine with `OR`, so the agent can now read every task, including Bob's.

## 3. USING (true)

Open [/lab/using-true](https://policy-trace-gray.vercel.app/lab/using-true) as Alice. Invoices carry a `secret`. The owner policy alone keeps Bob's invoice away from Alice. "Studio invoice" is marked **Returned**. "Retreat invoice" is marked **Filtered**.

**Add USING (true)** leaves the owner policy in place and adds a policy that matches every row:

```sql
alter table lab_sandbox.invoices enable row level security;

grant select on lab_sandbox.invoices to authenticated;

create policy "owners read their invoices"
on lab_sandbox.invoices
as permissive
for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "authenticated reads every invoice"
on lab_sandbox.invoices
as permissive
for select
to authenticated
using (true);
```

Both invoices are then marked **Returned**, including Bob's secret (`visa 4000`). The trace on Bob's row shows the owner policy's `USING` as false and the `USING (true)` policy as true. One permissive `USING (true)` is enough to leak the row.

## 4. Silent update

Open [/lab/silent-update](https://policy-trace-gray.vercel.app/lab/silent-update) as Alice. The scenario statement is:

```sql
update lab_sandbox.tickets
set status = 'closed'
where owner_id = (select auth.uid())
returning id, title, owner_id, status;
```

**Update policy only** grants `SELECT` and `UPDATE`, but only defines an `UPDATE` policy:

```sql
alter table lab_sandbox.tickets enable row level security;

grant select, update on lab_sandbox.tickets to authenticated;

create policy "owners update their tickets"
on lab_sandbox.tickets
as permissive
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);
```

The statement raises no error. `rowsAffected` is 0, and `RETURNING` is empty. The kicker is **Policy layer**. The trace detail is: "The statement raised no error. An UPDATE has to read the existing row, and without a SELECT policy that row is not visible, so the update matches nothing." On Alice's "Login bug," the row is marked **Filtered**, and `USING` and `WITH CHECK` both evaluate true. On Bob's "Billing question," the row is marked **Outside the query**, and both checks are false. The policy for the write is not enough by itself.

**Add a SELECT policy** is the repair:

```sql
alter table lab_sandbox.tickets enable row level security;

grant select, update on lab_sandbox.tickets to authenticated;

create policy "owners read their tickets"
on lab_sandbox.tickets
as permissive
for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "owners update their tickets"
on lab_sandbox.tickets
as permissive
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);
```

Alice's run marks "Login bug" **Updated**, with `status` `closed` in the Fields column. Bob still cannot close Alice's ticket.

**Revoke UPDATE** leaves the `SELECT` policy in place and drops the `UPDATE` grant. The same statement stops at `42501` (`permission denied for table tickets`) before either policy can apply. That is the grant layer again.

## 5. Team notes

Open [/lab/team-notes](https://policy-trace-gray.vercel.app/lab/team-notes) as Alice. A note is visible to its owner, or to a member of its team. Membership lives on `lab_sandbox.team_members`, which has its own `SELECT` policy, because the notes policy reads that table.

```sql
alter table lab_sandbox.notes enable row level security;
alter table lab_sandbox.team_members enable row level security;

grant select on lab_sandbox.notes to authenticated;
grant select on lab_sandbox.team_members to authenticated;

create policy "read own membership"
on lab_sandbox.team_members
as permissive
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "owner or teammate reads notes"
on lab_sandbox.notes
as permissive
for select
to authenticated
using (
  owner_id = (select auth.uid())
  or team_id in (
    select m.team_id
    from lab_sandbox.team_members m
    where m.user_id = (select auth.uid())
  )
);
```

Alice gets **Returned** on her private "Grocery list," her Acme "Sprint plan," and Bob's Acme "Launch checklist." Bob's private "1:1 notes" and Carol's "Roadmap" on the other team are marked **Filtered**. As Bob, the **Returned** set is "Sprint plan," "1:1 notes," and "Launch checklist."

**Owner only** drops the team check, so Alice no longer sees Bob's Acme note. **USING (true)** on the notes policy exposes Carol's roadmap.

**Copy SQL** when the editor shows the version you want to keep. **Share** writes a read-only snapshot. **Fork this** opens that SQL in the lab.
