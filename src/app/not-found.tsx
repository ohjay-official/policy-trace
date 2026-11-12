import Link from "next/link";

export default function NotFound() {
  return (
    <main className="pt-16">
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="mt-3 text-sm text-muted">That scenario or share is not in this lab.</p>
      <p className="mt-6">
        <Link href="/" className="text-sm underline decoration-line underline-offset-4">
          Back to scenarios
        </Link>
      </p>
    </main>
  );
}
