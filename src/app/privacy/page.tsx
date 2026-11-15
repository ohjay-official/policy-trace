import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <article className="page-head prose">
      <h1>Privacy policy</h1>
      <p className="updated">Last updated 12 Nov 2026</p>
      <h2>No accounts</h2>
      <p>Policy Trace has no sign-up and no user account. The browser uses the publishable Supabase key to call the lab. It never asks for a secret key.</p>
      <h2>What a run stores</h2>
      <p>A run happens in a transaction that rolls back. The sandbox tables do not keep your edit.</p>
      <h2>Share snapshots</h2>
      <p>
        If you press Share, the site stores a snapshot: the scenario id and the policy SQL you wrote. Anyone with that link can read the snapshot. There is no account attached to it.
      </p>
      <h2>Logs</h2>
      <p>The host (Vercel, and Supabase for the database) may keep ordinary request logs. This page does not add its own analytics.</p>
    </article>
  );
}
