import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "@fontsource/inter/100.css";
import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/manrope/300.css";
import "@fontsource/manrope/400.css";
import "@fontsource/source-code-pro/400.css";
import "@fontsource/source-code-pro/500.css";
import { Mark } from "@/components/mark";
import { Nav } from "@/components/nav";
import { Preloader } from "@/components/preloader";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Policy Trace",
    template: "%s · Policy Trace",
  },
  description:
    "An independent lab for Postgres row level security and grants on Supabase. See whether a row was stopped by a grant or filtered by a policy.",
};

export const viewport: Viewport = {
  themeColor: "#1C1C1C",
  width: "device-width",
  initialScale: 1,
};

const BOOT = "document.documentElement.classList.add('js')";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      </head>
      <body>
        <a className="visually-hidden" href="#main">
          Skip to content
        </a>
        <Preloader />
        <header className="site-header">
          <div className="wrap">
            <Link href="/" className="brand">
              <Mark />
              Policy Trace
            </Link>
            <Nav />
          </div>
        </header>
        <main id="main" className="wrap">
          {children}
        </main>
        <footer className="site-footer">
          <div className="wrap">
            <div className="foot-top">
              <Link href="/" className="brand">
                <Mark />
                Policy Trace
              </Link>
              <div className="foot-links">
                <Link href="/lab/missing-grant">Open the lab</Link>
                <Link href="/privacy">Privacy policy</Link>
                <Link href="/terms">Terms and conditions</Link>
                <a href="https://github.com/ohjay-official/policy-trace">Source code</a>
              </div>
            </div>
            <p className="foot-copy">Built by Oh-Jay, 2026.</p>
            <p className="foot-copy">
              Policy Trace is an independent community project. It is not a Supabase product and it is not affiliated with Supabase Inc.
            </p>
            <p className="foot-logo">
              <span>Built on</span>
              <img
                src="/brand/supabase-logo-green-white-transparent.svg"
                alt="Supabase"
                width={116}
                height={23}
              />
            </p>
            <p className="foot-copy">
              Supabase and the Supabase logo are trademarks of Supabase Inc. The logo files are used unmodified, and only to say what this lab runs on.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
