import type { IdentityId, LabSuccess, PolicyCheck, PolicyCommand, PolicyDef, TraceRow } from "@/lib/types";

export type TraceTone = "danger" | "ok" | "muted" | "warn";

export type TraceSummary = {
  layer: "grant" | "policy" | "bypass";
  tone: TraceTone;
  kicker: string;
  headline: string;
  detail: string;
};

export type RowDecision = {
  label: string;
  tone: TraceTone;
  detail: string;
};

const IDENTITY_LABEL: Record<IdentityId, string> = {
  anon: "anon",
  alice: "Alice",
  bob: "Bob",
  "agent-alice": "Agent as Alice",
  service_role: "service_role",
};

export function identityLabel(id: IdentityId): string {
  return IDENTITY_LABEL[id];
}

export function formatTrace(result: LabSuccess): TraceSummary {
  const returned = result.returned.length;
  const affected = result.rowsAffected ?? returned;
  const privilege = requiredPrivilege(result);

  if (result.sqlstate === "42501") {
    return {
      layer: "grant",
      tone: "danger",
      kicker: "Grant layer, not policy",
      headline: "42501 permission denied",
      detail: result.identity.bypassesRls
        ? `${identityLabel(result.identity.id)} bypasses row level security, and it still needs a ${privilege} grant. The grant check failed before any policy could matter.`
        : `The ${privilege} grant is missing for ${result.identity.role}. Postgres raised 42501 and did not run the policies. This is the grant layer, not the policy layer.`,
    };
  }

  if (result.sqlstate) {
    return {
      layer: "policy",
      tone: "danger",
      kicker: result.sqlstate === "42501" ? "Grant layer, not policy" : "Postgres error",
      headline: result.sqlstate,
      detail: result.errorMessage ?? "The statement failed.",
    };
  }

  if (result.identity.bypassesRls) {
    return {
      layer: "bypass",
      tone: "warn",
      kicker: "RLS bypass",
      headline: `${returned} ${returned === 1 ? "row" : "rows"} returned`,
      detail:
        "service_role bypasses row level security. Policies did not decide this result. A grant is still required, and this lab never asks for the secret key.",
    };
  }

  if (!result.rlsEnabled) {
    return {
      layer: "policy",
      tone: "warn",
      kicker: "Policy layer",
      headline: "Row level security is off",
      detail: `The ${privilege} grant passed. Policies on this table are ignored while row level security is disabled, so every row the query matches comes back.`,
    };
  }

  if (result.operation === "update") {
    const targeted = result.rows.filter((row) => row.queryPredicate).length;
    if (targeted === 0) {
      return {
        layer: "policy",
        tone: "muted",
        kicker: "Policy layer",
        headline: "UPDATE changed 0 rows",
        detail:
          "The WHERE clause compares owner_id with auth.uid(). For this identity that comparison matched no rows, so there was nothing to update.",
      };
    }
    if (affected === 0) {
      return {
        layer: "policy",
        tone: "muted",
        kicker: "Policy layer",
        headline: "UPDATE changed 0 rows",
        detail:
          "The statement raised no error. An UPDATE has to read the existing row, and without a SELECT policy that row is not visible, so the update matches nothing.",
      };
    }
    return {
      layer: "policy",
      tone: "ok",
      kicker: "Policy layer",
      headline: `UPDATE changed ${affected} ${affected === 1 ? "row" : "rows"}`,
      detail:
        "A SELECT policy made the existing row visible, and the UPDATE policy allowed the new row.",
    };
  }

  if (returned === 0) {
    return {
      layer: "policy",
      tone: "muted",
      kicker: "Policy layer",
      headline: "0 rows returned",
      detail:
        "The query succeeded and raised no error. Row level security filtered every row. An empty result is not a 42501.",
    };
  }

  return {
    layer: "policy",
    tone: "ok",
    kicker: "Policy layer",
    headline: `${returned} ${returned === 1 ? "row" : "rows"} returned`,
    detail: "The grant allowed the query. Policies decided which rows came back.",
  };
}

export function describeRow(row: TraceRow, result: LabSuccess): RowDecision {
  const inResult = result.returned.some((item) => String(item.id) === String(row.data.id));

  if (result.sqlstate === "42501") {
    return {
      label: "Not reached",
      tone: "danger",
      detail: "The grant check failed before this row was tested against a policy.",
    };
  }

  if (result.identity.bypassesRls) {
    return inResult
      ? {
          label: "Returned",
          tone: "warn",
          detail: "Visible because service_role bypasses row level security, not because a policy matched.",
        }
      : {
          label: "Not returned",
          tone: "muted",
          detail: "The query predicate did not include this row.",
        };
  }

  if (!result.rlsEnabled) {
    return inResult
      ? {
          label: "Returned",
          tone: "warn",
          detail: "Row level security is disabled, so the policy list did not filter this row.",
        }
      : {
          label: "Outside the query",
          tone: "muted",
          detail: "The statement's own predicate excluded this row.",
        };
  }

  if (result.operation === "update" && !row.queryPredicate) {
    return {
      label: "Outside the query",
      tone: "muted",
      detail: "owner_id does not match auth.uid() for this identity, so the WHERE clause skipped it.",
    };
  }

  if (inResult && result.operation === "update") {
    return {
      label: "Updated",
      tone: "ok",
      detail: "The row was visible and the UPDATE policy allowed the write.",
    };
  }

  if (inResult) {
    return {
      label: "Returned",
      tone: "ok",
      detail: "At least one permissive policy matched, and every restrictive policy passed.",
    };
  }

  return {
    label: "Filtered",
    tone: "muted",
    detail:
      result.operation === "update"
        ? "The row matches the WHERE clause, but it is not visible to the UPDATE. No error is raised."
        : "The query succeeded. This row did not pass the policies for this role.",
  };
}

export function describeCheck(check: PolicyCheck, policy: PolicyDef | undefined, result: LabSuccess): string[] {
  if (!policy) return ["Policy metadata is missing."];
  const lines: string[] = [];
  const command = commandLabel(policy.command);
  lines.push(
    `${policy.permissive ? "Permissive" : "Restrictive"} ${command} policy for ${policy.roles.join(", ")}.`,
  );
  if (!policy.applies) {
    lines.push(`It does not apply to ${result.identity.role}.`);
  } else if (result.identity.bypassesRls) {
    lines.push("It does not run, because this role bypasses row level security.");
  } else if (result.sqlstate === "42501") {
    lines.push("It did not run. The grant check failed first.");
  }
  if (policy.usingExpr) {
    lines.push(
      `USING ${check.using === true ? "matched" : check.using === false ? "did not match" : "was not evaluated"}: ${policy.usingExpr}`,
    );
  }
  if (policy.withCheckExpr && result.operation === "update") {
    lines.push(
      `WITH CHECK ${check.withCheck === true ? "would pass" : check.withCheck === false ? "would fail" : "was not evaluated"}: ${policy.withCheckExpr}`,
    );
  }
  return lines;
}

function requiredPrivilege(result: LabSuccess): string {
  return result.operation === "update" ? "UPDATE" : "SELECT";
}

function commandLabel(command: PolicyCommand): string {
  return command.toUpperCase();
}

export function returnedIds(result: LabSuccess): Set<string> {
  return new Set(result.returned.map((row) => String(row.id)));
}
