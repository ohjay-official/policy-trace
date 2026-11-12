import {
  ALICE_ID,
  BOB_ID,
  CAROL_ID,
  TEAM_ACME,
  TEAM_OTHER,
} from "@/lib/people";
import type { IdentityId } from "@/lib/types";

export type ScenarioChip = {
  id: string;
  label: string;
  detail: string;
  sql: string;
};

export type PreviewRow = {
  id: string;
  data: Record<string, string | null>;
};

export type Scenario = {
  slug: string;
  title: string;
  summary: string;
  sortOrder: number;
  operation: "select" | "update";
  query: string;
  tables: string[];
  defaultIdentity: IdentityId;
  toolCall?: { name: string; detail: string };
  chips: ScenarioChip[];
  rows: PreviewRow[];
};

const missingGrantSql = `alter table lab_sandbox.documents enable row level security;

create policy "owner reads own documents"
on lab_sandbox.documents
as permissive
for select
to authenticated
using ((select auth.uid()) = owner_id);`;

const silentEmptySql = `alter table lab_sandbox.documents enable row level security;

grant select on lab_sandbox.documents to authenticated;`;

const ownerGrantSql = `alter table lab_sandbox.documents enable row level security;

grant select on lab_sandbox.documents to authenticated;

create policy "owner reads own documents"
on lab_sandbox.documents
as permissive
for select
to authenticated
using ((select auth.uid()) = owner_id);`;

const taskOwnerSql = `alter table lab_sandbox.tasks enable row level security;

grant select on lab_sandbox.tasks to authenticated;

create policy "owners read their tasks"
on lab_sandbox.tasks
as permissive
for select
to authenticated
using ((select auth.uid()) = owner_id);`;

const taskLeakSql = `alter table lab_sandbox.tasks enable row level security;

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
using (true);`;

const taskNoPolicySql = `alter table lab_sandbox.tasks enable row level security;

grant select on lab_sandbox.tasks to authenticated;`;

const invoiceOwnerSql = `alter table lab_sandbox.invoices enable row level security;

grant select on lab_sandbox.invoices to authenticated;

create policy "owners read their invoices"
on lab_sandbox.invoices
as permissive
for select
to authenticated
using ((select auth.uid()) = owner_id);`;

const invoiceOrLeakSql = `alter table lab_sandbox.invoices enable row level security;

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
using (true);`;

const invoiceOnlyTrueSql = `alter table lab_sandbox.invoices enable row level security;

grant select on lab_sandbox.invoices to anon, authenticated;

create policy "anyone reads every invoice"
on lab_sandbox.invoices
as permissive
for select
to anon, authenticated
using (true);`;

const updateOnlySql = `alter table lab_sandbox.tickets enable row level security;

grant select, update on lab_sandbox.tickets to authenticated;

create policy "owners update their tickets"
on lab_sandbox.tickets
as permissive
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);`;

const updateWithSelectSql = `alter table lab_sandbox.tickets enable row level security;

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
with check ((select auth.uid()) = owner_id);`;

const updateRevokeSql = `alter table lab_sandbox.tickets enable row level security;

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
with check ((select auth.uid()) = owner_id);`;

const teamSql = `alter table lab_sandbox.notes enable row level security;
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
);`;

const teamOwnerOnlySql = `alter table lab_sandbox.notes enable row level security;
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
using ((select auth.uid()) = owner_id);`;

const teamLeakSql = `alter table lab_sandbox.notes enable row level security;
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
using (true);`;

export const SCENARIOS: Scenario[] = [
  {
    slug: "missing-grant",
    title: "Missing grant",
    summary:
      "A missing GRANT returns 42501. A missing SELECT policy returns an empty result and no error.",
    sortOrder: 1,
    operation: "select",
    query:
      "select id, title, owner_id, body from lab_sandbox.documents order by id",
    tables: ["documents"],
    defaultIdentity: "alice",
    chips: [
      {
        id: "missing-grant",
        label: "Missing grant",
        detail:
          "The owner policy is in place. authenticated has no SELECT grant, so Postgres stops at 42501.",
        sql: missingGrantSql,
      },
      {
        id: "silent-empty",
        label: "Silent empty select",
        detail:
          "SELECT is granted and row level security is on. No SELECT policy exists, so the query succeeds and returns nothing.",
        sql: silentEmptySql,
      },
      {
        id: "owner-policy",
        label: "Grant and owner policy",
        detail:
          "authenticated can select, and each person only receives their own rows.",
        sql: ownerGrantSql,
      },
    ],
    rows: [
      {
        id: "10000000-0000-4000-8000-000000000001",
        data: {
          id: "10000000-0000-4000-8000-000000000001",
          title: "Q4 plan",
          owner_id: ALICE_ID,
          body: "Ship the grant fix before the demo.",
        },
      },
      {
        id: "10000000-0000-4000-8000-000000000002",
        data: {
          id: "10000000-0000-4000-8000-000000000002",
          title: "Hiring notes",
          owner_id: BOB_ID,
          body: "Bob's notes stay on Bob's side of the policy.",
        },
      },
    ],
  },
  {
    slug: "agent-as-alice",
    title: "Agent as Alice",
    summary:
      "An MCP tool call runs as the signed-in user. Alice's policies are the boundary for that call.",
    sortOrder: 2,
    operation: "select",
    query: "select id, title, owner_id, status from lab_sandbox.tasks order by id",
    tables: ["tasks"],
    defaultIdentity: "agent-alice",
    toolCall: {
      name: "list_tasks",
      detail:
        "The handler uses the signed-in user's client. Postgres sees Alice's JWT. There is no separate agent role.",
    },
    chips: [
      {
        id: "owner-policy",
        label: "Owner policy",
        detail:
          "The tool call is Alice. She receives her tasks and not Bob's.",
        sql: taskOwnerSql,
      },
      {
        id: "using-true",
        label: "Add USING (true)",
        detail:
          "Permissive policies combine with OR. USING (true) beside the owner policy leaks every task to the agent.",
        sql: taskLeakSql,
      },
      {
        id: "no-policy",
        label: "Grant, no policy",
        detail:
          "The grant remains. With row level security on and no policy, every row is denied and the result is empty.",
        sql: taskNoPolicySql,
      },
    ],
    rows: [
      {
        id: "20000000-0000-4000-8000-000000000001",
        data: {
          id: "20000000-0000-4000-8000-000000000001",
          title: "Ship the grant fix",
          owner_id: ALICE_ID,
          status: "open",
        },
      },
      {
        id: "20000000-0000-4000-8000-000000000002",
        data: {
          id: "20000000-0000-4000-8000-000000000002",
          title: "Record the demo",
          owner_id: ALICE_ID,
          status: "open",
        },
      },
      {
        id: "20000000-0000-4000-8000-000000000003",
        data: {
          id: "20000000-0000-4000-8000-000000000003",
          title: "Review the hiring notes",
          owner_id: BOB_ID,
          status: "open",
        },
      },
    ],
  },
  {
    slug: "using-true",
    title: "USING (true)",
    summary:
      "One permissive USING (true) policy is combined with the others using OR, so every granted row leaks.",
    sortOrder: 3,
    operation: "select",
    query:
      "select id, title, owner_id, amount, secret from lab_sandbox.invoices order by id",
    tables: ["invoices"],
    defaultIdentity: "alice",
    chips: [
      {
        id: "owner-policy",
        label: "Owner policy",
        detail: "Alice can read her invoice, including the secret. Bob's invoice stays hidden.",
        sql: invoiceOwnerSql,
      },
      {
        id: "or-leak",
        label: "Add USING (true)",
        detail:
          "The owner policy stays. The new permissive policy matches every row, so the OR leaks Bob's secret to Alice.",
        sql: invoiceOrLeakSql,
      },
      {
        id: "only-true",
        label: "Only USING (true)",
        detail:
          "anon and authenticated both have a grant and a policy that matches every row.",
        sql: invoiceOnlyTrueSql,
      },
    ],
    rows: [
      {
        id: "30000000-0000-4000-8000-000000000001",
        data: {
          id: "30000000-0000-4000-8000-000000000001",
          title: "Studio invoice",
          owner_id: ALICE_ID,
          amount: "4200",
          secret: "visa 4242",
        },
      },
      {
        id: "30000000-0000-4000-8000-000000000002",
        data: {
          id: "30000000-0000-4000-8000-000000000002",
          title: "Retreat invoice",
          owner_id: BOB_ID,
          amount: "1800",
          secret: "visa 4000",
        },
      },
    ],
  },
  {
    slug: "silent-update",
    title: "Silent update",
    summary:
      "An UPDATE that can see no existing row changes nothing and raises no error. A SELECT policy is what makes the row visible.",
    sortOrder: 4,
    operation: "update",
    query:
      "update lab_sandbox.tickets set status = 'closed' where owner_id = (select auth.uid()) returning id, title, owner_id, status",
    tables: ["tickets"],
    defaultIdentity: "alice",
    chips: [
      {
        id: "update-only",
        label: "Update policy only",
        detail:
          "UPDATE is granted and the UPDATE policy would allow Alice's row. There is no SELECT policy, so the row is not visible and the update matches nothing.",
        sql: updateOnlySql,
      },
      {
        id: "with-select",
        label: "Add a SELECT policy",
        detail:
          "The SELECT policy lets the UPDATE see Alice's row. RETURNING comes back with status closed.",
        sql: updateWithSelectSql,
      },
      {
        id: "revoke-update",
        label: "Revoke UPDATE",
        detail:
          "The policies are present. Without an UPDATE grant the statement stops at 42501, before the policies run.",
        sql: updateRevokeSql,
      },
    ],
    rows: [
      {
        id: "40000000-0000-4000-8000-000000000001",
        data: {
          id: "40000000-0000-4000-8000-000000000001",
          title: "Login bug",
          owner_id: ALICE_ID,
          status: "open",
        },
      },
      {
        id: "40000000-0000-4000-8000-000000000002",
        data: {
          id: "40000000-0000-4000-8000-000000000002",
          title: "Billing question",
          owner_id: BOB_ID,
          status: "open",
        },
      },
    ],
  },
  {
    slug: "team-notes",
    title: "Team notes",
    summary:
      "A note is visible to its owner, or to a member of its team. Personal notes stay personal.",
    sortOrder: 5,
    operation: "select",
    query:
      "select id, title, owner_id, team_id from lab_sandbox.notes order by id",
    tables: ["notes", "team_members"],
    defaultIdentity: "alice",
    chips: [
      {
        id: "owner-or-team",
        label: "Owner or teammate",
        detail:
          "Alice sees her private note, her Acme note, and Bob's Acme note. Bob's private note and Carol's other team stay hidden.",
        sql: teamSql,
      },
      {
        id: "owner-only",
        label: "Owner only",
        detail:
          "Membership is ignored. Alice no longer sees the Acme note Bob wrote.",
        sql: teamOwnerOnlySql,
      },
      {
        id: "using-true",
        label: "USING (true)",
        detail: "The notes policy matches every row, including Carol's roadmap.",
        sql: teamLeakSql,
      },
    ],
    rows: [
      {
        id: "50000000-0000-4000-8000-000000000001",
        data: {
          id: "50000000-0000-4000-8000-000000000001",
          title: "Grocery list",
          owner_id: ALICE_ID,
          team_id: null,
        },
      },
      {
        id: "50000000-0000-4000-8000-000000000002",
        data: {
          id: "50000000-0000-4000-8000-000000000002",
          title: "Sprint plan",
          owner_id: ALICE_ID,
          team_id: TEAM_ACME,
        },
      },
      {
        id: "50000000-0000-4000-8000-000000000003",
        data: {
          id: "50000000-0000-4000-8000-000000000003",
          title: "1:1 notes",
          owner_id: BOB_ID,
          team_id: null,
        },
      },
      {
        id: "50000000-0000-4000-8000-000000000004",
        data: {
          id: "50000000-0000-4000-8000-000000000004",
          title: "Launch checklist",
          owner_id: BOB_ID,
          team_id: TEAM_ACME,
        },
      },
      {
        id: "50000000-0000-4000-8000-000000000005",
        data: {
          id: "50000000-0000-4000-8000-000000000005",
          title: "Roadmap",
          owner_id: CAROL_ID,
          team_id: TEAM_OTHER,
        },
      },
    ],
  },
];

export function getScenario(slug: string): Scenario | undefined {
  return SCENARIOS.find((scenario) => scenario.slug === slug);
}
