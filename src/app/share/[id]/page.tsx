import type { Metadata } from "next";
import { ShareView } from "@/components/share-view";

export const metadata: Metadata = { title: "Shared lab" };

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ShareView id={id} />;
}
