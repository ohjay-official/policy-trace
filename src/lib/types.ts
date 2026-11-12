export const IDENTITIES = [
  "anon",
  "alice",
  "bob",
  "agent-alice",
  "service_role",
] as const;

export type IdentityId = (typeof IDENTITIES)[number];

export function isIdentity(value: string | undefined): value is IdentityId {
  return IDENTITIES.includes(value as IdentityId);
}

export type PolicyCommand = "all" | "select" | "insert" | "update" | "delete";

export type PolicyDef = {
  table: string;
  name: string;
  command: PolicyCommand;
  permissive: boolean;
  roles: string[];
  applies: boolean;
  usingExpr: string | null;
  withCheckExpr: string | null;
};

export type PolicyCheck = {
  table: string;
  name: string;
  using: boolean | null;
  withCheck: boolean | null;
};

export type TraceRow = {
  data: Record<string, unknown>;
  queryPredicate: boolean;
  checks: PolicyCheck[];
};

export type GrantFact = {
  privilege: "SELECT" | "INSERT" | "UPDATE" | "DELETE";
  allowed: boolean;
};

export type LabSuccess = {
  ok: true;
  scenario: string;
  identity: {
    id: IdentityId;
    role: "anon" | "authenticated" | "service_role";
    sub: string | null;
    bypassesRls: boolean;
  };
  operation: "select" | "update";
  table: string;
  query: string;
  sqlstate: string | null;
  errorMessage: string | null;
  rlsEnabled: boolean;
  grants: GrantFact[];
  rowsAffected: number | null;
  returned: Record<string, unknown>[];
  rows: TraceRow[];
  policies: PolicyDef[];
};

export type LabFailure = {
  ok: false;
  error:
    | "rejected"
    | "apply_failed"
    | "invalid_identity"
    | "unknown_scenario"
    | "too_large"
    | "not_found"
    | "evaluator_failed";
  detail: string;
  position?: number;
  sqlstate?: string;
};

export type LabResult = LabSuccess | LabFailure;

export function isLabSuccess(value: unknown): value is LabSuccess {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    (value as { ok: unknown }).ok === true &&
    "rows" in value &&
    "grants" in value
  );
}

export function isLabFailure(value: unknown): value is LabFailure {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    (value as { ok: unknown }).ok === false &&
    "detail" in value
  );
}
