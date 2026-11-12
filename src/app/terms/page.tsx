import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms and conditions" };

export default function TermsPage() {
  return (
    <article className="page-head prose">
      <h1>Terms and conditions</h1>
      <p className="updated">Last updated 12 Nov 2026</p>
      <h2>What this is</h2>
      <p>
        Policy Trace is an independent community project. It is not a Supabase product and it is not affiliated with Supabase Inc. It is a lab for grants and row level security, not a place to scan a production database.
      </p>
      <h2>The sandbox</h2>
      <p>
        You may edit the seeded policies and grants. The editor accepts only those statements, on lab_sandbox. Runs roll back. Do not paste secrets into the editor. A share snapshot stores the SQL you submit, and anyone with the link can read it.
      </p>
      <h2>No warranty</h2>
      <p>The lab is provided as is. A result in the sandbox is not advice about a database you run in production.</p>
    </article>
  );
}
