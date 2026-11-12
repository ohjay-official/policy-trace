import { describe, expect, it } from "vitest";
import { ALICE_ID, BOB_ID } from "@/lib/people";
import { describeCheck, describeRow, formatTrace } from "@/lib/trace";
import type { LabSuccess, PolicyDef } from "@/lib/types";

const ownerPolicy: PolicyDef = {
  table: "documents",
  name: "owner reads own documents",
  command: "select",
  permissive: true,
  roles: ["authenticated"],
  applies: true,
  usingExpr: "((select auth.uid()) = owner_id)",
  withCheckExpr: null,
};

function success(overrides: Partial<LabSuccess> = {}): LabSuccess {
  return {
    ok: true,
    scenario: "missing-grant",
    identity: {
      id: "alice",
      role: "authenticated",
      sub: ALICE_ID,
      bypassesRls: false,
    },
    operation: "select",
    table: "documents",
    query: "select id, title, owner_id, body from lab_sandbox.documents order by id",
    sqlstate: null,
    errorMessage: null,
    rlsEnabled: true,
    grants: [
      { privilege: "SELECT", allowed: true },
      { privilege: "INSERT", allowed: false },
      { privilege: "UPDATE", allowed: false },
      { privilege: "DELETE", allowed: false },
    ],
    rowsAffected: null,
    returned: [],
    rows: [
      {
        data: { id: "1", title: "Q4 plan", owner_id: ALICE_ID },
        queryPredicate: true,
        checks: [{ table: "documents", name: ownerPolicy.name, using: true, withCheck: null }],
      },
      {
        data: { id: "2", title: "Hiring notes", owner_id: BOB_ID },
        queryPredicate: true,
        checks: [{ table: "documents", name: ownerPolicy.name, using: false, withCheck: null }],
      },
    ],
    policies: [ownerPolicy],
    ...overrides,
  };
}

describe("formatTrace", () => {
  it("labels a missing grant as the grant layer", () => {
    const summary = formatTrace(
      success({
        sqlstate: "42501",
        errorMessage: "permission denied for table documents",
        grants: [{ privilege: "SELECT", allowed: false }, { privilege: "INSERT", allowed: false }, { privilege: "UPDATE", allowed: false }, { privilege: "DELETE", allowed: false }],
      }),
    );
    expect(summary.layer).toBe("grant");
    expect(summary.kicker).toBe("Grant layer, not policy");
    expect(summary.headline).toContain("42501");
    expect(summary.detail).toContain("did not run the policies");
  });

  it("labels a successful empty select as the policy layer", () => {
    const summary = formatTrace(success());
    expect(summary.layer).toBe("policy");
    expect(summary.headline).toBe("0 rows returned");
    expect(summary.detail).toContain("not a 42501");
  });

  it("counts visible rows", () => {
    const summary = formatTrace(
      success({
        returned: [{ id: "1", title: "Q4 plan", owner_id: ALICE_ID }],
      }),
    );
    expect(summary.headline).toBe("1 row returned");
    expect(summary.tone).toBe("ok");
  });

  it("warns when service_role bypasses row level security", () => {
    const summary = formatTrace(
      success({
        identity: { id: "service_role", role: "service_role", sub: null, bypassesRls: true },
        returned: [{ id: "1" }, { id: "2" }],
      }),
    );
    expect(summary.layer).toBe("bypass");
    expect(summary.detail).toContain("bypasses row level security");
    expect(summary.detail).toContain("secret key");
  });

  it("explains an update that changes nothing", () => {
    const summary = formatTrace(
      success({
        scenario: "silent-update",
        operation: "update",
        rowsAffected: 0,
        rows: [
          {
            data: { id: "1", owner_id: ALICE_ID, status: "open" },
            queryPredicate: true,
            checks: [],
          },
          {
            data: { id: "2", owner_id: BOB_ID, status: "open" },
            queryPredicate: false,
            checks: [],
          },
        ],
      }),
    );
    expect(summary.headline).toBe("UPDATE changed 0 rows");
    expect(summary.detail).toContain("SELECT policy");
    expect(summary.detail).toContain("no error");
  });

  it("explains an update that returns the row", () => {
    const summary = formatTrace(
      success({
        operation: "update",
        rowsAffected: 1,
        returned: [{ id: "1", status: "closed" }],
      }),
    );
    expect(summary.headline).toBe("UPDATE changed 1 row");
    expect(summary.tone).toBe("ok");
  });
});

describe("describeRow", () => {
  it("marks a filtered row differently from a returned row", () => {
    const result = success({
      returned: [{ id: "1", title: "Q4 plan" }],
    });
    expect(describeRow(result.rows[0], result).label).toBe("Returned");
    expect(describeRow(result.rows[1], result).label).toBe("Filtered");
  });

  it("says the grant blocked the row before policy evaluation", () => {
    const result = success({ sqlstate: "42501" });
    expect(describeRow(result.rows[0], result).label).toBe("Not reached");
  });
});

describe("describeCheck", () => {
  it("names USING and says it did not run when the grant failed", () => {
    const result = success({ sqlstate: "42501" });
    const lines = describeCheck(result.rows[0].checks[0], ownerPolicy, result);
    expect(lines.join(" ")).toContain("USING matched");
    expect(lines.join(" ")).toContain("grant check failed first");
  });
});
