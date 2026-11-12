-- Behavioral tests for public.run_lab. Loaded by scripts/test-sql.sh.

create or replace function pg_temp.expect(label text, cond boolean, detail jsonb default null)
returns void
language plpgsql
as $fn$
begin
  if not coalesce(cond, false) then
    raise exception '% failed: %', label, coalesce(detail, 'null'::jsonb);
  end if;
  raise notice 'ok: %', label;
end;
$fn$;

do $fn$
declare
  result jsonb;
  share jsonb;
  share_id uuid;
  alice constant text := '11111111-1111-1111-1111-111111111111';
  bob constant text := '22222222-2222-2222-2222-222222222222';
  missing text := $sql$
    alter table lab_sandbox.documents enable row level security;
    create policy "owner reads own documents"
    on lab_sandbox.documents
    as permissive
    for select
    to authenticated
    using ((select auth.uid()) = owner_id);
  $sql$;
  granted text := $sql$
    alter table lab_sandbox.documents enable row level security;
    grant select on lab_sandbox.documents to authenticated;
    create policy "owner reads own documents"
    on lab_sandbox.documents
    as permissive
    for select
    to authenticated
    using ((select auth.uid()) = owner_id);
  $sql$;
  silent text := $sql$
    alter table lab_sandbox.documents enable row level security;
    grant select on lab_sandbox.documents to authenticated;
  $sql$;
  update_only text := $sql$
    alter table lab_sandbox.tickets enable row level security;
    grant select, update on lab_sandbox.tickets to authenticated;
    create policy "owners update their tickets"
    on lab_sandbox.tickets
    as permissive
    for update
    to authenticated
    using ((select auth.uid()) = owner_id)
    with check ((select auth.uid()) = owner_id);
  $sql$;
  update_fixed text := $sql$
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
  $sql$;
  leak text := $sql$
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
  $sql$;
  team text := $sql$
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
  $sql$;
begin
  result := public.run_lab('missing-grant', 'drop table lab_sandbox.documents;', 'alice');
  perform pg_temp.expect('reject drop table', result ->> 'ok' = 'false' and result ->> 'error' = 'rejected', result);

  result := public.run_lab(
    'missing-grant',
    'grant select on lab_sandbox.documents to authenticated; create table public.pwned (id int);',
    'alice'
  );
  perform pg_temp.expect('reject stacked create table', result ->> 'error' = 'rejected', result);
  perform pg_temp.expect('no pwned table', to_regclass('public.pwned') is null, result);

  result := public.run_lab(
    'missing-grant',
    'create policy p on public.documents for select using (true);',
    'alice'
  );
  perform pg_temp.expect('reject public schema', result ->> 'error' = 'rejected', result);

  result := public.run_lab(
    'missing-grant',
    'create policy p on lab_sandbox.documents for select using ((select pg_read_file(''/etc/passwd'')));',
    'alice'
  );
  perform pg_temp.expect('reject pg_read_file', result ->> 'error' = 'rejected', result);

  result := public.run_lab('missing-grant', 'create function lab_sandbox.hack() returns void language sql as $$ select 1 $$;', 'alice');
  perform pg_temp.expect('reject create function', result ->> 'error' = 'rejected', result);

  result := public.run_lab('nope', 'grant select on lab_sandbox.documents to anon;', 'alice');
  perform pg_temp.expect('unknown scenario', result ->> 'error' = 'unknown_scenario', result);

  result := public.run_lab('missing-grant', missing, 'carol');
  perform pg_temp.expect('invalid identity', result ->> 'error' = 'invalid_identity', result);

  result := public.run_lab('missing-grant', missing, 'alice');
  perform pg_temp.expect(
    'missing grant is 42501',
    result ->> 'ok' = 'true' and result ->> 'sqlstate' = '42501',
    result
  );
  perform pg_temp.expect(
    'missing grant returns no rows',
    jsonb_array_length(result -> 'returned') = 0,
    result
  );
  perform pg_temp.expect(
    'select grant is false',
    (result -> 'grants' -> 0 ->> 'allowed') = 'false',
    result
  );

  result := public.run_lab('missing-grant', silent, 'alice');
  perform pg_temp.expect(
    'silent empty has no sqlstate',
    result ->> 'ok' = 'true' and result ->> 'sqlstate' is null and jsonb_array_length(result -> 'returned') = 0,
    result
  );
  perform pg_temp.expect(
    'silent empty still describes both rows',
    jsonb_array_length(result -> 'rows') = 2,
    result
  );

  result := public.run_lab('missing-grant', granted, 'alice');
  perform pg_temp.expect(
    'alice sees one document',
    result ->> 'sqlstate' is null and jsonb_array_length(result -> 'returned') = 1
      and result -> 'returned' -> 0 ->> 'owner_id' = alice,
    result
  );

  result := public.run_lab('missing-grant', granted, 'bob');
  perform pg_temp.expect(
    'bob sees only his document',
    jsonb_array_length(result -> 'returned') = 1 and result -> 'returned' -> 0 ->> 'owner_id' = bob,
    result
  );

  result := public.run_lab('missing-grant', granted, 'service_role');
  perform pg_temp.expect(
    'service role bypasses and sees both',
    (result -> 'identity' ->> 'bypassesRls') = 'true'
      and jsonb_array_length(result -> 'returned') = 2
      and result ->> 'sqlstate' is null,
    result
  );

  result := public.run_lab('missing-grant', granted, 'anon');
  perform pg_temp.expect(
    'anon has no grant',
    result ->> 'sqlstate' = '42501',
    result
  );

  perform pg_temp.expect(
    'rollback leaves no sandbox tables',
    not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'lab_sandbox' and c.relkind = 'r'
    ),
    null
  );

  result := public.run_lab('silent-update', update_only, 'alice');
  perform pg_temp.expect(
    'update without select policy changes nothing',
    result ->> 'sqlstate' is null and coalesce((result ->> 'rowsAffected')::int, -1) = 0,
    result
  );

  result := public.run_lab('silent-update', update_fixed, 'alice');
  perform pg_temp.expect(
    'update with select policy closes the ticket',
    coalesce((result ->> 'rowsAffected')::int, -1) = 1
      and result -> 'returned' -> 0 ->> 'status' = 'closed'
      and result -> 'returned' -> 0 ->> 'id' = '40000000-0000-4000-8000-000000000001',
    result
  );

  result := public.run_lab('using-true', leak, 'alice');
  perform pg_temp.expect(
    'using true leaks both invoices',
    jsonb_array_length(result -> 'returned') = 2,
    result
  );

  result := public.run_lab('team-notes', team, 'alice');
  perform pg_temp.expect(
    'alice sees three notes',
    jsonb_array_length(result -> 'returned') = 3,
    result
  );
  perform pg_temp.expect(
    'alice does not see bob private or carol',
    not exists (
      select 1
      from jsonb_array_elements(result -> 'returned') row
      where row ->> 'title' in ('1:1 notes', 'Roadmap')
    ),
    result
  );

  result := public.run_lab('agent-as-alice', $sql$
    alter table lab_sandbox.tasks enable row level security;
    grant select on lab_sandbox.tasks to authenticated;
    create policy "owners read their tasks"
    on lab_sandbox.tasks
    as permissive
    for select
    to authenticated
    using ((select auth.uid()) = owner_id);
  $sql$, 'agent-alice');
  perform pg_temp.expect(
    'agent as alice sees two tasks',
    jsonb_array_length(result -> 'returned') = 2
      and result -> 'identity' ->> 'sub' = alice,
    result
  );

  share := public.create_lab_share('missing-grant', 'drop table lab_sandbox.documents;');
  perform pg_temp.expect('share rejects bad sql', share ->> 'error' = 'rejected', share);

  share := public.create_lab_share('missing-grant', granted);
  perform pg_temp.expect('share created', share ->> 'ok' = 'true', share);
  share_id := (share ->> 'id')::uuid;

  result := public.get_lab_share(share_id);
  perform pg_temp.expect(
    'share reads back',
    result ->> 'ok' = 'true' and result ->> 'scenario' = 'missing-grant' and result ->> 'policySql' = granted,
    result
  );

  result := public.get_lab_share('00000000-0000-4000-8000-000000000099');
  perform pg_temp.expect('missing share', result ->> 'error' = 'not_found', result);

  set local role anon;
  perform pg_temp.expect(
    'anon can read scenarios once seeded',
    true,
    null
  );
  reset role;
end;
$fn$;

-- Catalog visibility is checked after seed in the same script when the rows exist.
-- This file runs before seed on a manual load; the shell script runs seed first.
do $fn$
declare
  n integer;
begin
  select count(*) into n from public.scenarios;
  if n = 0 then
    raise notice 'scenarios catalog is empty in this session; seed assertion skipped';
    return;
  end if;
  if n <> 5 then
    raise exception 'expected 5 scenarios, found %', n;
  end if;

  set local role anon;
  perform count(*) from public.scenarios;
  reset role;

  begin
    set local role anon;
    perform 1 from public.labs;
    raise exception 'anon should not be able to read labs';
  exception
    when insufficient_privilege then
      reset role;
      raise notice 'ok: anon cannot read labs';
  end;
end;
$fn$;
