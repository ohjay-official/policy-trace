import Link from "next/link";
import { SCENARIOS } from "@/lib/scenarios";

const tutorial = "https://github.com/ohjay-official/policy-trace#tutorial";

export default function HomePage() {
  return (
    <main className="pt-8">
      <header className="border-b border-line pb-8">
        <p className="text-sm text-muted">Independent community project</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Policy Trace</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed">
          See whether a row was stopped by a grant or filtered by a policy.
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          Pick a scenario, choose who is running the query, and edit the policies. The lab runs that SQL as the role, with JWT claims set, inside a transaction that always rolls back.
        </p>
        <p className="mt-6">
          <a className="text-sm underline decoration-line underline-offset-4" href={tutorial}>
            Read the tutorial
          </a>
        </p>
      </header>

      <section className="mt-8" aria-labelledby="scenarios-heading">
        <h2 id="scenarios-heading" className="text-xl font-semibold">
          Scenarios
        </h2>
        <ol className="mt-4 divide-y divide-line border-y border-line">
          {SCENARIOS.map((scenario, index) => (
            <li key={scenario.slug} className="py-5">
              <div className="flex items-baseline gap-4">
                <span className="w-8 font-mono text-sm text-muted">0{index + 1}</span>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold">
                    <Link href={`/lab/${scenario.slug}`} className="underline decoration-line underline-offset-4">
                      {scenario.title}
                    </Link>
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{scenario.summary}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
