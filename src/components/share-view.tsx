"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LabView } from "@/components/lab-view";
import { getScenario } from "@/lib/scenarios";
import { getSupabase } from "@/lib/supabase";
import type { Scenario } from "@/lib/scenarios";

export function ShareView({ id }: { id: string }) {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [sql, setSql] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const client = getSupabase();
    if (!client) {
      setMessage(
        "Supabase is not configured, so this snapshot cannot be loaded. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      );
      return;
    }
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      setMessage("That share id is not a snapshot token.");
      return;
    }
    let cancelled = false;
    void client.rpc("get_lab_share", { p_id: id }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setMessage(error.message);
        return;
      }
      const payload = data as {
        ok?: boolean;
        scenario?: string;
        policySql?: string;
        detail?: string;
      };
      if (!payload.ok || !payload.scenario || typeof payload.policySql !== "string") {
        setMessage(payload.detail ?? "No share with that id.");
        return;
      }
      const found = getScenario(payload.scenario);
      if (!found) {
        setMessage("The snapshot names a scenario this build does not know.");
        return;
      }
      setScenario(found);
      setSql(payload.policySql);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!scenario || sql === null) {
    return (
      <div className="page-head">
        <p className="updated">Shared snapshot</p>
        <h1>Share</h1>
        <p>{message ?? "Loading the snapshot."}</p>
        <p>
          <Link href="/" className="btn">
            Back to the start
          </Link>
        </p>
      </div>
    );
  }

  return (
    <LabView
      scenario={scenario}
      initialIdentity={scenario.defaultIdentity}
      shareId={id}
      readOnly
      initialSql={sql}
    />
  );
}
