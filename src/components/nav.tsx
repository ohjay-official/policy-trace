"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav() {
  const path = usePathname();
  const lab = path.startsWith("/lab");
  return (
    <nav className="nav" aria-label="Main">
      <Link href="/#how" aria-current={path === "/" ? "page" : undefined}>
        How it works
      </Link>
      <a href="https://github.com/ohjay-official/policy-trace">Source</a>
      <Link href="/lab/missing-grant" className="btn nav-cta" aria-current={lab ? "page" : undefined}>
        Open the lab
      </Link>
    </nav>
  );
}
