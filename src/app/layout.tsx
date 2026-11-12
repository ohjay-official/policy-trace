import type { Metadata, Viewport } from "next";
import { Inter, Manrope, Source_Code_Pro } from "next/font/google";
import { Attribution } from "@/components/attribution";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const sourceCode = Source_Code_Pro({
  subsets: ["latin"],
  variable: "--font-code",
  display: "swap",
});

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${inter.variable} ${sourceCode.variable}`}>
      <body className="min-h-screen bg-canvas text-ink antialiased">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-16">
          {children}
          <Attribution />
        </div>
      </body>
    </html>
  );
}
