import { describe, expect, it } from "vitest";
import { STATEMENT_TIMEOUT_NOTICE, isStatementTimeout, timeoutAttempt } from "@/lib/lab-run";

describe("isStatementTimeout", () => {
  it("matches sqlstate 57014 and the Postgres timeout text", () => {
    expect(isStatementTimeout({ code: "57014" })).toBe(true);
    expect(isStatementTimeout({ sqlstate: "57014" })).toBe(true);
    expect(isStatementTimeout({ message: "canceling statement due to statement timeout" })).toBe(true);
    expect(isStatementTimeout({ message: "HTTP 500" })).toBe(false);
    expect(isStatementTimeout({ message: "permission denied", code: "42501" })).toBe(false);
  });
});

describe("timeoutAttempt", () => {
  it("retries once, then asks the person to run it again", () => {
    expect(timeoutAttempt(false)).toBe("retry");
    expect(timeoutAttempt(true)).toBe("notice");
    expect(STATEMENT_TIMEOUT_NOTICE).toBe("The database took too long to answer. Run it again.");
  });
});
