import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SCENARIOS } from "@/lib/scenarios";
import { parsePolicyScript } from "@/lib/sql-whitelist";

const tables = ["documents", "tasks", "invoices", "tickets", "notes", "team_members"];

function parse(sql: string, allowed = ["documents"]) {
  return parsePolicyScript(sql, allowed);
}

describe("parsePolicyScript", () => {
  it("accepts every seeded scenario script", () => {
    for (const scenario of SCENARIOS) {
      for (const chip of scenario.chips) {
        const result = parsePolicyScript(chip.sql, scenario.tables);
        expect(result.ok, `${scenario.slug}/${chip.id} ${result.ok ? "" : result.detail}`).toBe(
          true,
        );
      }
    }
  });

  it("canonicalizes an owner policy", () => {
    const result = parse(
      `CREATE POLICY "owner reads own documents" ON lab_sandbox.documents FOR SELECT TO authenticated USING ((select auth.uid()) = owner_id);`,
    );
    expect(result).toEqual({
      ok: true,
      statements: [
        'create policy "owner reads own documents" on lab_sandbox.documents as permissive for select to authenticated using (((select auth.uid()) = owner_id))',
      ],
    });
  });

  it("canonicalizes the team predicate", () => {
    const result = parsePolicyScript(
      `create policy "owner or teammate reads notes" on lab_sandbox.notes for select to authenticated using (
        owner_id = (select auth.uid())
        or team_id in (
          select m.team_id from lab_sandbox.team_members m where m.user_id = (select auth.uid())
        )
      );`,
      ["notes", "team_members"],
    );
    expect(result).toEqual({
      ok: true,
      statements: [
        'create policy "owner or teammate reads notes" on lab_sandbox.notes as permissive for select to authenticated using (((owner_id = (select auth.uid())) or (team_id in (select m.team_id from lab_sandbox.team_members m where (m.user_id = (select auth.uid()))))))',
      ],
    });
  });

  it("canonicalizes grant, revoke, alter, and drop", () => {
    const result = parse(`
      GRANT SELECT, UPDATE ON lab_sandbox.documents TO authenticated;
      revoke all privileges on table lab_sandbox.documents from public;
      alter table lab_sandbox.documents disable row level security;
      drop policy if exists "owner reads own documents" on lab_sandbox.documents;
    `);
    expect(result).toEqual({
      ok: true,
      statements: [
        "grant select, update on table lab_sandbox.documents to authenticated",
        "revoke all on table lab_sandbox.documents from public",
        "alter table lab_sandbox.documents disable row level security",
        'drop policy if exists "owner reads own documents" on lab_sandbox.documents',
      ],
    });
  });

  it("allows auth.jwt claim access and a cast", () => {
    const result = parse(
      `create policy sub on lab_sandbox.documents for select to authenticated using ((auth.jwt() ->> 'sub')::uuid = owner_id);`,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.statements[0]).toContain("((auth.jwt() ->> 'sub')::uuid = owner_id)");
    }
  });

  it("treats an omitted TO clause as public", () => {
    const result = parse(
      `create policy open_read on lab_sandbox.documents for select using (true);`,
    );
    expect(result).toEqual({
      ok: true,
      statements: [
        "create policy open_read on lab_sandbox.documents as permissive for select to public using (true)",
      ],
    });
  });

  it("allows an empty script", () => {
    expect(parse("  -- nothing\n/* still nothing */")).toEqual({ ok: true, statements: [] });
  });

  it.each([
    ["drop table", "drop table lab_sandbox.documents;"],
    ["select", "select * from lab_sandbox.documents;"],
    ["insert", "insert into lab_sandbox.documents (id) values ('10000000-0000-4000-8000-000000000001');"],
    ["create function", "create function lab_sandbox.hack() returns void language sql as $$ select 1 $$;"],
    ["stacked statement", "grant select on lab_sandbox.documents to authenticated; drop table lab_sandbox.documents;"],
    ["public table", "grant select on public.scenarios to anon;"],
    ["unknown table", "grant select on lab_sandbox.secrets to anon;"],
    ["unknown role", "grant select on lab_sandbox.documents to postgres;"],
    ["other function", "create policy p on lab_sandbox.documents for select using (auth.uid() = owner_id or now() > now());"],
    ["catalog subquery", "create policy p on lab_sandbox.documents for select using (exists (select 1 from pg_catalog.pg_class));"],
    ["dollar quote", "create policy p on lab_sandbox.documents for select using ($tag$true$tag$);"],
    ["copy", "copy lab_sandbox.documents from program 'id';"],
    ["alter drop column", "alter table lab_sandbox.documents drop column title;"],
    ["comment does not hide a second statement", "grant select on lab_sandbox.documents to authenticated; /* harmless */ delete from lab_sandbox.documents;"],
  ])("rejects %s", (_name, sql) => {
    const result = parse(sql, tables);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("rejected");
  });

  it("keeps the seed migration aligned with the scenario scripts", () => {
    const seed = readFileSync("supabase/migrations/20261112120200_seed_scenarios.sql", "utf8");
    for (const scenario of SCENARIOS) {
      expect(seed).toContain(scenario.slug);
      expect(seed).toContain(scenario.summary);
      for (const chip of scenario.chips) {
        expect(seed).toContain(chip.sql);
      }
    }
  });
});
