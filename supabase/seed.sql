-- Same rows as migrations/20261112120200_seed_scenarios.sql.
-- `supabase db reset` applies migrations, then this file. Both are idempotent.

-- Scenario catalog. Idempotent.
-- Chip SQL matches src/lib/scenarios.ts.
-- Safe to paste after the earlier migrations, and safe to run again.

insert into public.scenarios (
  slug, title, summary, sort_order, operation, default_sql, anti_patterns, fixture
) values (
  $s_missing_grant_slug$missing-grant$s_missing_grant_slug$,
  $s_missing_grant_title$Missing grant$s_missing_grant_title$,
  $s_missing_grant_summary$A missing GRANT returns 42501. A missing SELECT policy returns an empty result and no error.$s_missing_grant_summary$,
  1,
  $s_missing_grant_op$select$s_missing_grant_op$,
  $s_missing_grant_default$alter table lab_sandbox.documents enable row level security;

create policy "owner reads own documents"
on lab_sandbox.documents
as permissive
for select
to authenticated
using ((select auth.uid()) = owner_id);$s_missing_grant_default$,
  jsonb_build_array(
    jsonb_build_object(
      'id', $c_missing_grant_missing_grant_id$missing-grant$c_missing_grant_missing_grant_id$,
      'label', $c_missing_grant_missing_grant_label$Missing grant$c_missing_grant_missing_grant_label$,
      'detail', $c_missing_grant_missing_grant_detail$The owner policy is in place. authenticated has no SELECT grant, so Postgres stops at 42501.$c_missing_grant_missing_grant_detail$,
      'sql', $c_missing_grant_missing_grant_sql$alter table lab_sandbox.documents enable row level security;

create policy "owner reads own documents"
on lab_sandbox.documents
as permissive
for select
to authenticated
using ((select auth.uid()) = owner_id);$c_missing_grant_missing_grant_sql$
    ),
    jsonb_build_object(
      'id', $c_missing_grant_silent_empty_id$silent-empty$c_missing_grant_silent_empty_id$,
      'label', $c_missing_grant_silent_empty_label$Silent empty select$c_missing_grant_silent_empty_label$,
      'detail', $c_missing_grant_silent_empty_detail$SELECT is granted and row level security is on. No SELECT policy exists, so the query succeeds and returns nothing.$c_missing_grant_silent_empty_detail$,
      'sql', $c_missing_grant_silent_empty_sql$alter table lab_sandbox.documents enable row level security;

grant select on lab_sandbox.documents to authenticated;$c_missing_grant_silent_empty_sql$
    ),
    jsonb_build_object(
      'id', $c_missing_grant_owner_policy_id$owner-policy$c_missing_grant_owner_policy_id$,
      'label', $c_missing_grant_owner_policy_label$Grant and owner policy$c_missing_grant_owner_policy_label$,
      'detail', $c_missing_grant_owner_policy_detail$authenticated can select, and each person only receives their own rows.$c_missing_grant_owner_policy_detail$,
      'sql', $c_missing_grant_owner_policy_sql$alter table lab_sandbox.documents enable row level security;

grant select on lab_sandbox.documents to authenticated;

create policy "owner reads own documents"
on lab_sandbox.documents
as permissive
for select
to authenticated
using ((select auth.uid()) = owner_id);$c_missing_grant_owner_policy_sql$
    )
  ),
  $s_missing_grant_fixture$[{"id":"10000000-0000-4000-8000-000000000001","data":{"id":"10000000-0000-4000-8000-000000000001","title":"Q4 plan","owner_id":"11111111-1111-1111-1111-111111111111","body":"Ship the grant fix before the demo."}},{"id":"10000000-0000-4000-8000-000000000002","data":{"id":"10000000-0000-4000-8000-000000000002","title":"Hiring notes","owner_id":"22222222-2222-2222-2222-222222222222","body":"Bob's notes stay on Bob's side of the policy."}}]$s_missing_grant_fixture$::jsonb
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  sort_order = excluded.sort_order,
  operation = excluded.operation,
  default_sql = excluded.default_sql,
  anti_patterns = excluded.anti_patterns,
  fixture = excluded.fixture;

insert into public.scenarios (
  slug, title, summary, sort_order, operation, default_sql, anti_patterns, fixture
) values (
  $s_agent_as_alice_slug$agent-as-alice$s_agent_as_alice_slug$,
  $s_agent_as_alice_title$Agent as Alice$s_agent_as_alice_title$,
  $s_agent_as_alice_summary$An MCP tool call runs as the signed-in user. Alice's policies are the boundary for that call.$s_agent_as_alice_summary$,
  2,
  $s_agent_as_alice_op$select$s_agent_as_alice_op$,
  $s_agent_as_alice_default$alter table lab_sandbox.tasks enable row level security;

grant select on lab_sandbox.tasks to authenticated;

create policy "owners read their tasks"
on lab_sandbox.tasks
as permissive
for select
to authenticated
using ((select auth.uid()) = owner_id);$s_agent_as_alice_default$,
  jsonb_build_array(
    jsonb_build_object(
      'id', $c_agent_as_alice_owner_policy_id$owner-policy$c_agent_as_alice_owner_policy_id$,
      'label', $c_agent_as_alice_owner_policy_label$Owner policy$c_agent_as_alice_owner_policy_label$,
      'detail', $c_agent_as_alice_owner_policy_detail$The tool call is Alice. She receives her tasks and not Bob's.$c_agent_as_alice_owner_policy_detail$,
      'sql', $c_agent_as_alice_owner_policy_sql$alter table lab_sandbox.tasks enable row level security;

grant select on lab_sandbox.tasks to authenticated;

create policy "owners read their tasks"
on lab_sandbox.tasks
as permissive
for select
to authenticated
using ((select auth.uid()) = owner_id);$c_agent_as_alice_owner_policy_sql$
    ),
    jsonb_build_object(
      'id', $c_agent_as_alice_using_true_id$using-true$c_agent_as_alice_using_true_id$,
      'label', $c_agent_as_alice_using_true_label$Add USING (true)$c_agent_as_alice_using_true_label$,
      'detail', $c_agent_as_alice_using_true_detail$Permissive policies combine with OR. USING (true) beside the owner policy leaks every task to the agent.$c_agent_as_alice_using_true_detail$,
      'sql', $c_agent_as_alice_using_true_sql$alter table lab_sandbox.tasks enable row level security;

grant select on lab_sandbox.tasks to authenticated;

create policy "owners read their tasks"
on lab_sandbox.tasks
as permissive
for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "every signed-in user reads every task"
on lab_sandbox.tasks
as permissive
for select
to authenticated
using (true);$c_agent_as_alice_using_true_sql$
    ),
    jsonb_build_object(
      'id', $c_agent_as_alice_no_policy_id$no-policy$c_agent_as_alice_no_policy_id$,
      'label', $c_agent_as_alice_no_policy_label$Grant, no policy$c_agent_as_alice_no_policy_label$,
      'detail', $c_agent_as_alice_no_policy_detail$The grant remains. With row level security on and no policy, every row is denied and the result is empty.$c_agent_as_alice_no_policy_detail$,
      'sql', $c_agent_as_alice_no_policy_sql$alter table lab_sandbox.tasks enable row level security;

grant select on lab_sandbox.tasks to authenticated;$c_agent_as_alice_no_policy_sql$
    )
  ),
  $s_agent_as_alice_fixture$[{"id":"20000000-0000-4000-8000-000000000001","data":{"id":"20000000-0000-4000-8000-000000000001","title":"Ship the grant fix","owner_id":"11111111-1111-1111-1111-111111111111","status":"open"}},{"id":"20000000-0000-4000-8000-000000000002","data":{"id":"20000000-0000-4000-8000-000000000002","title":"Record the demo","owner_id":"11111111-1111-1111-1111-111111111111","status":"open"}},{"id":"20000000-0000-4000-8000-000000000003","data":{"id":"20000000-0000-4000-8000-000000000003","title":"Review the hiring notes","owner_id":"22222222-2222-2222-2222-222222222222","status":"open"}}]$s_agent_as_alice_fixture$::jsonb
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  sort_order = excluded.sort_order,
  operation = excluded.operation,
  default_sql = excluded.default_sql,
  anti_patterns = excluded.anti_patterns,
  fixture = excluded.fixture;

insert into public.scenarios (
  slug, title, summary, sort_order, operation, default_sql, anti_patterns, fixture
) values (
  $s_using_true_slug$using-true$s_using_true_slug$,
  $s_using_true_title$USING (true)$s_using_true_title$,
  $s_using_true_summary$One permissive USING (true) policy is combined with the others using OR, so every granted row leaks.$s_using_true_summary$,
  3,
  $s_using_true_op$select$s_using_true_op$,
  $s_using_true_default$alter table lab_sandbox.invoices enable row level security;

grant select on lab_sandbox.invoices to authenticated;

create policy "owners read their invoices"
on lab_sandbox.invoices
as permissive
for select
to authenticated
using ((select auth.uid()) = owner_id);$s_using_true_default$,
  jsonb_build_array(
    jsonb_build_object(
      'id', $c_using_true_owner_policy_id$owner-policy$c_using_true_owner_policy_id$,
      'label', $c_using_true_owner_policy_label$Owner policy$c_using_true_owner_policy_label$,
      'detail', $c_using_true_owner_policy_detail$Alice can read her invoice, including the secret. Bob's invoice stays hidden.$c_using_true_owner_policy_detail$,
      'sql', $c_using_true_owner_policy_sql$alter table lab_sandbox.invoices enable row level security;

grant select on lab_sandbox.invoices to authenticated;

create policy "owners read their invoices"
on lab_sandbox.invoices
as permissive
for select
to authenticated
using ((select auth.uid()) = owner_id);$c_using_true_owner_policy_sql$
    ),
    jsonb_build_object(
      'id', $c_using_true_or_leak_id$or-leak$c_using_true_or_leak_id$,
      'label', $c_using_true_or_leak_label$Add USING (true)$c_using_true_or_leak_label$,
      'detail', $c_using_true_or_leak_detail$The owner policy stays. The new permissive policy matches every row, so the OR leaks Bob's secret to Alice.$c_using_true_or_leak_detail$,
      'sql', $c_using_true_or_leak_sql$alter table lab_sandbox.invoices enable row level security;

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
using (true);$c_using_true_or_leak_sql$
    ),
    jsonb_build_object(
      'id', $c_using_true_only_true_id$only-true$c_using_true_only_true_id$,
      'label', $c_using_true_only_true_label$Only USING (true)$c_using_true_only_true_label$,
      'detail', $c_using_true_only_true_detail$anon and authenticated both have a grant and a policy that matches every row.$c_using_true_only_true_detail$,
      'sql', $c_using_true_only_true_sql$alter table lab_sandbox.invoices enable row level security;

grant select on lab_sandbox.invoices to anon, authenticated;

create policy "anyone reads every invoice"
on lab_sandbox.invoices
as permissive
for select
to anon, authenticated
using (true);$c_using_true_only_true_sql$
    )
  ),
  $s_using_true_fixture$[{"id":"30000000-0000-4000-8000-000000000001","data":{"id":"30000000-0000-4000-8000-000000000001","title":"Studio invoice","owner_id":"11111111-1111-1111-1111-111111111111","amount":"4200","secret":"visa 4242"}},{"id":"30000000-0000-4000-8000-000000000002","data":{"id":"30000000-0000-4000-8000-000000000002","title":"Retreat invoice","owner_id":"22222222-2222-2222-2222-222222222222","amount":"1800","secret":"visa 4000"}}]$s_using_true_fixture$::jsonb
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  sort_order = excluded.sort_order,
  operation = excluded.operation,
  default_sql = excluded.default_sql,
  anti_patterns = excluded.anti_patterns,
  fixture = excluded.fixture;

insert into public.scenarios (
  slug, title, summary, sort_order, operation, default_sql, anti_patterns, fixture
) values (
  $s_silent_update_slug$silent-update$s_silent_update_slug$,
  $s_silent_update_title$Silent update$s_silent_update_title$,
  $s_silent_update_summary$An UPDATE that can see no existing row changes nothing and raises no error. A SELECT policy is what makes the row visible.$s_silent_update_summary$,
  4,
  $s_silent_update_op$update$s_silent_update_op$,
  $s_silent_update_default$alter table lab_sandbox.tickets enable row level security;

grant select, update on lab_sandbox.tickets to authenticated;

create policy "owners update their tickets"
on lab_sandbox.tickets
as permissive
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);$s_silent_update_default$,
  jsonb_build_array(
    jsonb_build_object(
      'id', $c_silent_update_update_only_id$update-only$c_silent_update_update_only_id$,
      'label', $c_silent_update_update_only_label$Update policy only$c_silent_update_update_only_label$,
      'detail', $c_silent_update_update_only_detail$UPDATE is granted and the UPDATE policy would allow Alice's row. There is no SELECT policy, so the row is not visible and the update matches nothing.$c_silent_update_update_only_detail$,
      'sql', $c_silent_update_update_only_sql$alter table lab_sandbox.tickets enable row level security;

grant select, update on lab_sandbox.tickets to authenticated;

create policy "owners update their tickets"
on lab_sandbox.tickets
as permissive
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);$c_silent_update_update_only_sql$
    ),
    jsonb_build_object(
      'id', $c_silent_update_with_select_id$with-select$c_silent_update_with_select_id$,
      'label', $c_silent_update_with_select_label$Add a SELECT policy$c_silent_update_with_select_label$,
      'detail', $c_silent_update_with_select_detail$The SELECT policy lets the UPDATE see Alice's row. RETURNING comes back with status closed.$c_silent_update_with_select_detail$,
      'sql', $c_silent_update_with_select_sql$alter table lab_sandbox.tickets enable row level security;

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
with check ((select auth.uid()) = owner_id);$c_silent_update_with_select_sql$
    ),
    jsonb_build_object(
      'id', $c_silent_update_revoke_update_id$revoke-update$c_silent_update_revoke_update_id$,
      'label', $c_silent_update_revoke_update_label$Revoke UPDATE$c_silent_update_revoke_update_label$,
      'detail', $c_silent_update_revoke_update_detail$The policies are present. Without an UPDATE grant the statement stops at 42501, before the policies run.$c_silent_update_revoke_update_detail$,
      'sql', $c_silent_update_revoke_update_sql$alter table lab_sandbox.tickets enable row level security;

grant select on lab_sandbox.tickets to authenticated;

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
with check ((select auth.uid()) = owner_id);$c_silent_update_revoke_update_sql$
    )
  ),
  $s_silent_update_fixture$[{"id":"40000000-0000-4000-8000-000000000001","data":{"id":"40000000-0000-4000-8000-000000000001","title":"Login bug","owner_id":"11111111-1111-1111-1111-111111111111","status":"open"}},{"id":"40000000-0000-4000-8000-000000000002","data":{"id":"40000000-0000-4000-8000-000000000002","title":"Billing question","owner_id":"22222222-2222-2222-2222-222222222222","status":"open"}}]$s_silent_update_fixture$::jsonb
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  sort_order = excluded.sort_order,
  operation = excluded.operation,
  default_sql = excluded.default_sql,
  anti_patterns = excluded.anti_patterns,
  fixture = excluded.fixture;

insert into public.scenarios (
  slug, title, summary, sort_order, operation, default_sql, anti_patterns, fixture
) values (
  $s_team_notes_slug$team-notes$s_team_notes_slug$,
  $s_team_notes_title$Team notes$s_team_notes_title$,
  $s_team_notes_summary$A note is visible to its owner, or to a member of its team. Personal notes stay personal.$s_team_notes_summary$,
  5,
  $s_team_notes_op$select$s_team_notes_op$,
  $s_team_notes_default$alter table lab_sandbox.notes enable row level security;
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
);$s_team_notes_default$,
  jsonb_build_array(
    jsonb_build_object(
      'id', $c_team_notes_owner_or_team_id$owner-or-team$c_team_notes_owner_or_team_id$,
      'label', $c_team_notes_owner_or_team_label$Owner or teammate$c_team_notes_owner_or_team_label$,
      'detail', $c_team_notes_owner_or_team_detail$Alice sees her private note, her Acme note, and Bob's Acme note. Bob's private note and Carol's other team stay hidden.$c_team_notes_owner_or_team_detail$,
      'sql', $c_team_notes_owner_or_team_sql$alter table lab_sandbox.notes enable row level security;
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
);$c_team_notes_owner_or_team_sql$
    ),
    jsonb_build_object(
      'id', $c_team_notes_owner_only_id$owner-only$c_team_notes_owner_only_id$,
      'label', $c_team_notes_owner_only_label$Owner only$c_team_notes_owner_only_label$,
      'detail', $c_team_notes_owner_only_detail$Membership is ignored. Alice no longer sees the Acme note Bob wrote.$c_team_notes_owner_only_detail$,
      'sql', $c_team_notes_owner_only_sql$alter table lab_sandbox.notes enable row level security;
alter table lab_sandbox.team_members enable row level security;

grant select on lab_sandbox.notes to authenticated;
grant select on lab_sandbox.team_members to authenticated;

create policy "read own membership"
on lab_sandbox.team_members
as permissive
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "owner reads notes"
on lab_sandbox.notes
as permissive
for select
to authenticated
using ((select auth.uid()) = owner_id);$c_team_notes_owner_only_sql$
    ),
    jsonb_build_object(
      'id', $c_team_notes_using_true_id$using-true$c_team_notes_using_true_id$,
      'label', $c_team_notes_using_true_label$USING (true)$c_team_notes_using_true_label$,
      'detail', $c_team_notes_using_true_detail$The notes policy matches every row, including Carol's roadmap.$c_team_notes_using_true_detail$,
      'sql', $c_team_notes_using_true_sql$alter table lab_sandbox.notes enable row level security;
alter table lab_sandbox.team_members enable row level security;

grant select on lab_sandbox.notes to authenticated;
grant select on lab_sandbox.team_members to authenticated;

create policy "read own membership"
on lab_sandbox.team_members
as permissive
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "anyone reads notes"
on lab_sandbox.notes
as permissive
for select
to authenticated
using (true);$c_team_notes_using_true_sql$
    )
  ),
  $s_team_notes_fixture$[{"id":"50000000-0000-4000-8000-000000000001","data":{"id":"50000000-0000-4000-8000-000000000001","title":"Grocery list","owner_id":"11111111-1111-1111-1111-111111111111","team_id":null}},{"id":"50000000-0000-4000-8000-000000000002","data":{"id":"50000000-0000-4000-8000-000000000002","title":"Sprint plan","owner_id":"11111111-1111-1111-1111-111111111111","team_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}},{"id":"50000000-0000-4000-8000-000000000003","data":{"id":"50000000-0000-4000-8000-000000000003","title":"1:1 notes","owner_id":"22222222-2222-2222-2222-222222222222","team_id":null}},{"id":"50000000-0000-4000-8000-000000000004","data":{"id":"50000000-0000-4000-8000-000000000004","title":"Launch checklist","owner_id":"22222222-2222-2222-2222-222222222222","team_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}},{"id":"50000000-0000-4000-8000-000000000005","data":{"id":"50000000-0000-4000-8000-000000000005","title":"Roadmap","owner_id":"33333333-3333-3333-3333-333333333333","team_id":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}}]$s_team_notes_fixture$::jsonb
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  sort_order = excluded.sort_order,
  operation = excluded.operation,
  default_sql = excluded.default_sql,
  anti_patterns = excluded.anti_patterns,
  fixture = excluded.fixture;
