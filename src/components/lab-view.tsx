"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { fieldLabel, formatField } from "@/lib/people";
import { parsePolicyScript } from "@/lib/sql-whitelist";
import { getSupabase, supabaseConfig } from "@/lib/supabase";
import type { Scenario } from "@/lib/scenarios";
import {
  describeCheck,
  describeRow,
  formatTrace,
  identityLabel,
  returnedIds,
} from "@/lib/trace";
import {
  IDENTITIES,
  isLabFailure,
  isLabSuccess,
  type IdentityId,
  type LabSuccess,
  type PolicyDef,
} from "@/lib/types";

const IDENTITY_ROLE: Record<IdentityId, string> = {
  anon: "anon",
  alice: "authenticated",
  bob: "authenticated",
  "agent-alice": "authenticated",
  service_role: "service_role",
};

const IDENTITY_SUB: Record<IdentityId, string | null> = {
  anon: null,
  alice: "11111111-1111-1111-1111-111111111111",
  bob: "22222222-2222-2222-2222-222222222222",
  "agent-alice": "11111111-1111-1111-1111-111111111111",
  service_role: null,
};

export function LabView({
  scenario,
  initialIdentity,
  shareId,
  readOnly,
  initialSql,
}: {
  scenario: Scenario;
  initialIdentity: IdentityId;
  shareId: string | null;
  readOnly: boolean;
  initialSql?: string;
}) {
  const [identity, setIdentity] = useState<IdentityId>(initialIdentity);
  const [sql, setSql] = useState(initialSql ?? scenario.chips[0]?.sql ?? "");
  const [generation, setGeneration] = useState(0);
  const [ready, setReady] = useState(!shareId);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<LabSuccess | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [traceOpen, setTraceOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sqlRef = useRef(sql);
  sqlRef.current = sql;
  const requestRef = useRef(0);

  const parsed = useMemo(
    () => parsePolicyScript(sql, scenario.tables),
    [sql, scenario.tables],
  );
  const configured = supabaseConfig() !== null;
  const activeChip = scenario.chips.find((chip) => chip.sql === sql)?.id ?? null;

  useEffect(() => {
    if (!shareId || initialSql) {
      setReady(true);
      return;
    }
    const client = getSupabase();
    if (!client || !/^[0-9a-f-]{36}$/i.test(shareId)) {
      setMessage("This share link could not be loaded.");
      setReady(true);
      return;
    }
    let cancelled = false;
    void client.rpc("get_lab_share", { p_id: shareId }).then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data || typeof data !== "object") {
        setMessage(error?.message ?? "This share link could not be loaded.");
      } else {
        const payload = data as { ok?: boolean; scenario?: string; policySql?: string; detail?: string };
        if (payload.ok && payload.scenario === scenario.slug && typeof payload.policySql === "string") {
          setSql(payload.policySql);
          setGeneration((value) => value + 1);
        } else if (payload.ok && payload.scenario && payload.scenario !== scenario.slug) {
          setMessage(`This snapshot belongs to ${payload.scenario}.`);
        } else {
          setMessage(payload.detail ?? "This share link could not be loaded.");
        }
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [shareId, scenario.slug, initialSql]);

  useEffect(() => {
    if (!ready) return;
    const currentSql = sqlRef.current;
    const local = parsePolicyScript(currentSql, scenario.tables);
    if (!local.ok) {
      setResult(null);
      setMessage(local.detail);
      setRunning(false);
      return;
    }
    const client = getSupabase();
    if (!client) {
      setResult(null);
      setMessage(
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. The SQL above was checked in the browser and has not been executed.",
      );
      setRunning(false);
      return;
    }
    const requestId = ++requestRef.current;
    setRunning(true);
    setMessage(null);
    void client
      .rpc("run_lab", {
        p_scenario_slug: scenario.slug,
        p_policy_sql: currentSql,
        p_identity: identity,
      })
      .then(({ data, error }) => {
        if (requestId !== requestRef.current) return;
        setRunning(false);
        if (error) {
          setResult(null);
          const missing = /function .* does not exist|PGRST202|schema cache/i.test(error.message);
          setMessage(
            missing
              ? "The evaluator is not installed on this project yet. Apply the SQL migrations, then run again."
              : error.message,
          );
          return;
        }
        if (isLabSuccess(data)) {
          setResult(data);
          setMessage(null);
          return;
        }
        if (isLabFailure(data)) {
          setResult(null);
          setMessage(data.detail);
          return;
        }
        setResult(null);
        setMessage("The evaluator returned an unexpected payload.");
      });
  }, [ready, generation, identity, scenario.slug, scenario.tables]);

  function runNow() {
    setGeneration((value) => value + 1);
  }

  async function share() {
    setShareNote(null);
    const client = getSupabase();
    if (!client) {
      setShareNote("Sharing needs the Supabase project.");
      return;
    }
    if (!parsed.ok) {
      setShareNote(parsed.detail);
      return;
    }
    const { data, error } = await client.rpc("create_lab_share", {
      p_scenario_slug: scenario.slug,
      p_policy_sql: sql,
    });
    if (error) {
      setShareNote(error.message);
      return;
    }
    const payload = data as { ok?: boolean; id?: string; detail?: string };
    if (!payload.ok || !payload.id) {
      setShareNote(payload.detail ?? "The share could not be created.");
      return;
    }
    const url = `${window.location.origin}/share/${payload.id}`;
    setShareUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      setShareNote("Share link copied.");
    } catch {
      setShareNote("Share link ready. Copy it from the field.");
    }
  }

  async function copySql() {
    try {
      await navigator.clipboard.writeText(sql);
      setShareNote("SQL copied.");
    } catch {
      setShareNote("Clipboard is unavailable in this browser.");
    }
  }

  const summary = result ? formatTrace(result) : null;
  const visible = result ? returnedIds(result) : new Set<string>();
  const sub = IDENTITY_SUB[identity];

  return (
    <div className="pt-6 pb-24 lg:pb-0">
      <header className="border-b border-line pb-4">
        <p className="text-sm text-muted">Independent community project</p>
        <p className="mt-2 text-sm">
          <Link href="/" className="underline decoration-line underline-offset-4">
            Policy Trace
          </Link>
        </p>
      </header>

      <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{scenario.title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{scenario.summary}</p>

          <fieldset className="mt-6">
            <legend className="text-sm">Who is running the query</legend>
            <div
              role="radiogroup"
              aria-label="Who is running the query"
              className="mt-2 flex flex-wrap border border-line"
            >
              {IDENTITIES.map((id) => {
                const selected = id === identity;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`px-3 py-2 text-sm ${selected ? "text-brand" : "text-ink"}`}
                    style={selected ? { boxShadow: "inset 0 -2px 0 #3ecf8e" } : undefined}
                    onClick={() => setIdentity(id)}
                  >
                    {identityLabel(id)}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 font-mono text-xs text-muted">
              role {IDENTITY_ROLE[identity]}
              {sub ? ` · sub ${sub}` : " · no sub"}
            </p>
          </fieldset>

          {identity === "service_role" ? (
            <div className="mt-4 border border-danger px-3 py-3 text-sm" role="status">
              <p className="font-semibold">service_role bypasses row level security</p>
              <p className="mt-1 text-muted">
                Policies do not run for this role. A secret key in a browser can read every row the grants allow. This lab never asks for that key.
              </p>
            </div>
          ) : null}

          {scenario.toolCall ? (
            <div className="mt-4 border border-line bg-surface px-3 py-3 text-sm">
              <p className="font-mono text-xs text-brand">{scenario.toolCall.name}</p>
              <p className="mt-2 leading-relaxed">{scenario.toolCall.detail}</p>
            </div>
          ) : null}

          {!configured ? (
            <p className="mt-4 border border-line px-3 py-3 text-sm text-muted">
              This page renders without a project. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to execute the lab. Use the publishable key, never the secret key.
            </p>
          ) : null}

          <section className="mt-6" aria-labelledby="result-heading">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="result-heading" className="text-lg font-semibold">
                Result
              </h2>
              <p className="font-mono text-xs text-muted">{running ? "Running" : summary ? summary.kicker : "Not run"}</p>
            </div>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap border border-line bg-inset p-3 text-xs leading-relaxed text-muted">
              {scenario.query}
            </pre>
            <div className="mt-3">
              {result && result.sqlstate === "42501" ? (
                <div className="border border-danger px-4 py-4">
                  <p className="font-mono text-sm text-danger">42501</p>
                  <p className="mt-2 text-lg font-semibold">Grant layer, not policy</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{summary?.detail}</p>
                  {result.errorMessage ? (
                    <p className="mt-3 font-mono text-xs">{result.errorMessage}</p>
                  ) : null}
                </div>
              ) : (
                <RowList
                  scenario={scenario}
                  result={result}
                  visible={visible}
                  selectedId={selectedId}
                  onSelect={(id) => {
                    setSelectedId(id);
                    setTraceOpen(true);
                  }}
                />
              )}
            </div>
            {message ? <p className="mt-3 text-sm text-danger">{message}</p> : null}
          </section>

          <section className="mt-8" aria-labelledby="editor-heading">
            <h2 id="editor-heading" className="text-lg font-semibold">
              Policies and grants
            </h2>
            <label className="mt-3 block text-sm text-muted" htmlFor="policy-sql">
              {readOnly ? "Snapshot. Fork it to edit." : "Only policy and grant statements on lab_sandbox are accepted."}
            </label>
            <textarea
              id="policy-sql"
              className="mono mt-2 min-h-64 w-full border border-line bg-inset p-3 text-sm leading-relaxed"
              spellCheck={false}
              value={sql}
              readOnly={readOnly}
              onChange={(event) => setSql(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && !readOnly) {
                  event.preventDefault();
                  runNow();
                }
              }}
            />
            <p className={`mt-2 text-sm ${parsed.ok ? "text-muted" : "text-danger"}`}>
              {parsed.ok ? "SQL is allowed." : parsed.detail}
            </p>
            {readOnly ? null : (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {scenario.chips.map((chip) => {
                  const selected = chip.id === activeChip;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      className={`shrink-0 border px-3 py-2 text-left text-sm ${selected ? "border-brand text-brand" : "border-line"}`}
                      onClick={() => {
                        setSql(chip.sql);
                        setGeneration((value) => value + 1);
                      }}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            )}
            {activeChip ? (
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {scenario.chips.find((chip) => chip.id === activeChip)?.detail}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="bg-brand px-4 py-2 text-sm font-semibold text-canvas" onClick={runNow}>
                Run
              </button>
              <button type="button" className="border border-line px-4 py-2 text-sm" onClick={() => void copySql()}>
                Copy SQL
              </button>
              {readOnly ? (
                <Link
                  href={`/lab/${scenario.slug}?share=${shareId ?? ""}`}
                  className="border border-line px-4 py-2 text-sm"
                >
                  Fork this
                </Link>
              ) : (
                <button type="button" className="border border-line px-4 py-2 text-sm" onClick={() => void share()}>
                  Share
                </button>
              )}
            </div>
            {shareUrl ? (
              <p className="mt-3 break-all font-mono text-xs">
                <a href={shareUrl} className="underline decoration-line underline-offset-4">
                  {shareUrl}
                </a>
              </p>
            ) : null}
            {shareNote ? <p className="mt-2 text-sm text-muted">{shareNote}</p> : null}
          </section>
        </div>

        <TracePanel
          result={result}
          summaryKicker={summary?.kicker ?? "Trace"}
          summaryDetail={summary?.detail ?? "Run the lab to see which grant and which policy decided each row."}
          selectedId={selectedId}
          open={traceOpen}
          onOpenChange={setTraceOpen}
        />
      </div>
    </div>
  );
}

function RowList({
  scenario,
  result,
  visible,
  selectedId,
  onSelect,
}: {
  scenario: Scenario;
  result: LabSuccess | null;
  visible: Set<string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const rows = result
    ? result.rows.map((row) => ({
        id: String(row.data.id),
        data: row.data,
        decision: describeRow(row, result).label,
      }))
    : scenario.rows.map((row) => ({
        id: row.id,
        data: row.data,
        decision: "Not run",
      }));

  return (
    <>
      <ul className="grid gap-3 md:hidden">
        {rows.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => onSelect(row.id)}
              className="w-full border border-line bg-surface px-3 py-3 text-left"
              style={{
                boxShadow: visible.has(row.id) ? "inset 2px 0 0 #3ecf8e" : undefined,
              }}
            >
              <RowBody title={String(row.data.title ?? row.id)} decision={row.decision} data={row.data} selected={selectedId === row.id} />
            </button>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto border border-line md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Decision</th>
              <th className="px-3 py-2 font-medium">Title</th>
              <th className="px-3 py-2 font-medium">Fields</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer border-t border-line"
                onClick={() => onSelect(row.id)}
              >
                <td className="px-3 py-3 align-top" style={{ color: visible.has(row.id) ? "#3ecf8e" : undefined }}>
                  {row.decision}
                </td>
                <td className="px-3 py-3 align-top">{String(row.data.title ?? "")}</td>
                <td className="px-3 py-3 align-top">
                  <FieldList data={row.data} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function RowBody({
  title,
  decision,
  data,
  selected,
}: {
  title: string;
  decision: string;
  data: Record<string, unknown>;
  selected: boolean;
}) {
  return (
    <>
      <p className="text-xs text-muted">{decision}{selected ? " · trace" : ""}</p>
      <p className="mt-1 font-semibold">{title}</p>
      <div className="mt-2">
        <FieldList data={data} />
      </div>
    </>
  );
}

function FieldList({ data }: { data: Record<string, unknown> }) {
  return (
    <dl className="space-y-1">
      {Object.entries(data)
        .filter(([key]) => key !== "title")
        .map(([key, value]) => (
          <div key={key} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2 text-xs">
            <dt className="text-muted">{fieldLabel(key)}</dt>
            <dd className={`min-w-0 font-mono ${key === "body" ? "" : "overflow-x-auto whitespace-nowrap"}`}>
              {formatField(key, value)}
            </dd>
          </div>
        ))}
    </dl>
  );
}

function TracePanel({
  result,
  summaryKicker,
  summaryDetail,
  selectedId,
  open,
  onOpenChange,
}: {
  result: LabSuccess | null;
  summaryKicker: string;
  summaryDetail: string;
  selectedId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const body = (
    <div>
      <h2 className="text-lg font-semibold">Trace</h2>
      {result ? <p className="mt-1 text-sm text-brand">{summaryKicker}</p> : null}
      <p className="mt-3 text-sm leading-relaxed">{summaryDetail}</p>
      {result ? (
        <>
          <h3 className="mt-5 text-sm font-semibold">Grants on {result.table}</h3>
          <ul className="mt-2 space-y-1 font-mono text-xs">
            {result.grants.map((grant) => (
              <li key={grant.privilege} className="flex justify-between gap-4 border-b border-line py-1">
                <span>{grant.privilege}</span>
                <span className={grant.allowed ? "text-brand" : "text-danger"}>
                  {grant.allowed ? "allowed" : "denied"}
                </span>
              </li>
            ))}
          </ul>
          <h3 className="mt-5 text-sm font-semibold">Rows</h3>
          <div className="mt-2 space-y-4">
            {result.rows.map((row) => {
              const id = String(row.data.id);
              const decision = describeRow(row, result);
              const focused = selectedId === id;
              return (
                <article key={id} className={`border px-3 py-3 ${focused ? "border-brand" : "border-line"}`}>
                  <p className="text-sm font-semibold">{String(row.data.title ?? id)}</p>
                  <p className="mt-1 text-xs text-muted">{decision.label}. {decision.detail}</p>
                  <ul className="mt-3 space-y-3">
                    {row.checks.map((check) => {
                      const policy = result.policies.find(
                        (item) => item.table === check.table && item.name === check.name,
                      );
                      return (
                        <li key={`${check.table}:${check.name}`} className="text-xs leading-relaxed">
                          <p className="font-mono">{check.name}</p>
                          {describeCheck(check, policy, result).map((line) => (
                            <p key={line} className="mt-1 text-muted">
                              {line}
                            </p>
                          ))}
                        </li>
                      );
                    })}
                  </ul>
                </article>
              );
            })}
          </div>
          <OtherPolicies policies={result.policies} table={result.table} />
        </>
      ) : null}
    </div>
  );

  return (
    <>
      <aside className="sticky top-4 mt-8 hidden border border-line bg-surface p-4 lg:mt-0 lg:block">{body}</aside>
      <div className="lg:hidden">
        <button
          type="button"
          className="fixed inset-x-4 bottom-4 z-20 border border-line bg-canvas px-4 py-3 text-left text-sm"
          onClick={() => onOpenChange(true)}
        >
          {result ? `Trace · ${summaryKicker}` : "Open trace"}
        </button>
        {open ? (
          <div className="fixed inset-0 z-30 flex items-end bg-black/60" role="presentation" onClick={() => onOpenChange(false)}>
            <div
              role="dialog"
              aria-label="Trace"
              className="max-h-[78vh] w-full overflow-auto border-t border-line bg-canvas p-4"
              onClick={(event) => event.stopPropagation()}
            >
              <button type="button" className="mb-4 text-sm underline" onClick={() => onOpenChange(false)}>
                Close trace
              </button>
              {body}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

function OtherPolicies({ policies, table }: { policies: PolicyDef[]; table: string }) {
  const others = policies.filter((policy) => policy.table !== table);
  if (others.length === 0) return null;
  return (
    <>
      <h3 className="mt-5 text-sm font-semibold">Other tables</h3>
      <ul className="mt-2 space-y-2 text-xs text-muted">
        {others.map((policy) => (
          <li key={`${policy.table}:${policy.name}`}>
            <span className="font-mono text-ink">{policy.table}</span> · {policy.name} · {policy.command.toUpperCase()}
            {policy.usingExpr ? <p className="mt-1 font-mono">{policy.usingExpr}</p> : null}
          </li>
        ))}
      </ul>
    </>
  );
}
