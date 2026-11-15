import { describe, expect, it } from "vitest";
import { shareLoadOutcome } from "@/lib/share-load";

describe("shareLoadOutcome", () => {
  it("rejects a bad id without a payload", () => {
    expect(shareLoadOutcome("missing-grant", { invalid: true })).toEqual({
      sql: null,
      error: "This share link could not be loaded.",
    });
  });

  it("keeps an error from another scenario", () => {
    expect(
      shareLoadOutcome("missing-grant", {
        payload: { ok: true, scenario: "team-notes", policySql: "grant select on lab_sandbox.notes to authenticated;" },
      }),
    ).toEqual({
      sql: null,
      error: "This snapshot belongs to team-notes.",
    });
  });

  it("accepts SQL for the current scenario", () => {
    expect(
      shareLoadOutcome("missing-grant", {
        payload: { ok: true, scenario: "missing-grant", policySql: "grant select on lab_sandbox.documents to authenticated;" },
      }),
    ).toEqual({
      sql: "grant select on lab_sandbox.documents to authenticated;",
      error: null,
    });
  });
});
