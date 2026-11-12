"use client";

import { useState } from "react";

const QA = [
  {
    q: "What does a run actually do?",
    a: "It runs the scenario query as the role you pick, with JWT claims set, inside a transaction that always rolls back. The SQL you edit is parsed first. Only policy and grant statements on lab_sandbox are accepted.",
  },
  {
    q: "Why is an empty result not an error?",
    a: "A missing SELECT policy, with the grant in place and row level security on, returns no rows and no error. A missing GRANT returns sqlstate 42501 before any policy runs.",
  },
  {
    q: "Does the agent have its own role?",
    a: "No. The list_tasks call uses Alice's client, so Postgres sees Alice's JWT. Her policies are the boundary. There is no separate agent role.",
  },
  {
    q: "Is my edit saved?",
    a: "A run rolls back, so the sandbox does not keep it. A share link stores a snapshot of the scenario and the policy SQL. There is no account.",
  },
  {
    q: "What key does the browser use?",
    a: "The publishable key only. The page never asks for the secret key. service_role on the switch is a role inside the sandbox, and the warning stays on screen.",
  },
  {
    q: "Who is this for?",
    a: "Developers, and the agents they run, who need to see whether a row was stopped by a grant or filtered by a policy.",
  },
];

export function Faq() {
  const [open, setOpen] = useState(() => new Set([0, 1]));
  const toggle = (i: number) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <section className="section faq" aria-labelledby="faq-title">
      <div className="section-head">
        <h2 id="faq-title">Questions people ask</h2>
        <p>
          Still unsure? Read the{" "}
          <a href="https://github.com/ohjay-official/policy-trace#tutorial">tutorial</a> or open an issue on{" "}
          <a href="https://github.com/ohjay-official/policy-trace/issues">GitHub</a>.
        </p>
      </div>
      <div className="faq-list">
        {QA.map(({ q, a }, i) => {
          const isOpen = open.has(i);
          return (
            <div key={q} className={`faq-item ${isOpen ? "open" : ""}`}>
              <h3>
                <button
                  type="button"
                  className="faq-q"
                  aria-expanded={isOpen}
                  aria-controls={`faq-a-${i}`}
                  id={`faq-q-${i}`}
                  onClick={() => toggle(i)}
                >
                  <span>{q}</span>
                  <i className="faq-icon" aria-hidden="true" />
                </button>
              </h3>
              <div className="faq-a" id={`faq-a-${i}`} role="region" aria-labelledby={`faq-q-${i}`}>
                <div>
                  <p>{a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
