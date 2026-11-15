import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LabView } from "@/components/lab-view";
import { getScenario } from "@/lib/scenarios";
import { isIdentity } from "@/lib/types";

export function generateStaticParams() {
  return [
    { slug: "missing-grant" },
    { slug: "agent-as-alice" },
    { slug: "using-true" },
    { slug: "silent-update" },
    { slug: "team-notes" },
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const scenario = getScenario(slug);
  return { title: scenario?.title ?? "Lab" };
}

export default async function LabPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ share?: string; as?: string; chip?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const scenario = getScenario(slug);
  if (!scenario) notFound();
  const initialIdentity = isIdentity(query.as) ? query.as : scenario.defaultIdentity;
  const initialChip = scenario.chips.some((chip) => chip.id === query.chip) ? (query.chip ?? null) : null;
  const search = new URLSearchParams();
  if (query.share) search.set("share", query.share);
  search.set("as", initialIdentity);
  if (initialChip) search.set("chip", initialChip);
  return (
    <LabView
      scenario={scenario}
      initialIdentity={initialIdentity}
      initialChip={initialChip}
      initialQuery={search.toString()}
      shareId={query.share ?? null}
      readOnly={false}
    />
  );
}
