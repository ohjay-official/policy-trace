'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Main">
      <Link href="/method" aria-current={path === '/method' ? 'page' : undefined}>
        Method
      </Link>
      <a href="https://github.com/ohjay-official/the-panel">Source</a>
      <Link href="/panel" className="btn nav-cta" aria-current={path === '/panel' ? 'page' : undefined}>
        Score a project
      </Link>
    </nav>
  );
}
