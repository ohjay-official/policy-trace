import Link from "next/link";
import { Faq } from "@/components/faq";
import { Reveal } from "@/components/reveal";
import { Stage } from "@/components/stage";

const tutorial = "https://github.com/ohjay-official/policy-trace#tutorial";

export default function HomePage() {
  return (
    <>
      <Stage />
      <Reveal className="runs-on" aria-labelledby="stack-title">
        <h2 id="stack-title" className="visually-hidden">
          What it runs on
        </h2>
        <div>
          <b>Supabase Postgres</b>
          <span>The database the lab runs against</span>
        </div>
        <div>
          <b>Row level security and grants</b>
          <span>The two checks before a row comes back</span>
        </div>
        <div>
          <b>Next.js on Vercel</b>
          <span>The site that calls the Data API</span>
        </div>
      </Reveal>

      <Reveal className="section" aria-labelledby="rules-title">
        <div className="section-head">
          <h2 id="rules-title">What the empty array will not tell you</h2>
          <p>The Data API can look quiet when a grant or a policy is the thing that stopped the row.</p>
        </div>
        <div className="glow-cards stagger">
          <article className="glow-card">
            <span className="gc-index">Grant</span>
            <h3>42501</h3>
            <p>A missing GRANT stops the query before any policy runs.</p>
          </article>
          <article className="glow-card">
            <span className="gc-index">Policy</span>
            <h3>No rows</h3>
            <p>A missing SELECT policy returns an empty result and no error.</p>
          </article>
          <article className="glow-card">
            <span className="gc-index">Rollback</span>
            <h3>Nothing sticks</h3>
            <p>Every run is a transaction that rolls back. The sandbox does not keep the edit.</p>
          </article>
        </div>
        <p className="aside">
          The walkthrough for each scenario is in the <a href={tutorial}>tutorial</a>.
        </p>
      </Reveal>

      <Faq />

      <section className="cta-band">
        <div>
          <h2>Open a scenario and run it.</h2>
          <p>Switch who is asking, edit the policy, and read the trace.</p>
        </div>
        <Link href="/lab/missing-grant" className="btn btn-lg">
          Open the lab
        </Link>
      </section>
    </>
  );
}
