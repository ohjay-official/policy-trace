export const STATEMENT_TIMEOUT_NOTICE = "The database took too long to answer. Run it again.";

export function isStatementTimeout(input: {
  message?: string | null;
  code?: string | null;
  sqlstate?: string | null;
}): boolean {
  const code = input.code ?? input.sqlstate ?? "";
  if (code === "57014") return true;
  const message = input.message ?? "";
  return /statement timeout/i.test(message) || /\b57014\b/.test(message);
}

export function timeoutAttempt(alreadyRetried: boolean): "retry" | "notice" {
  return alreadyRetried ? "notice" : "retry";
}
