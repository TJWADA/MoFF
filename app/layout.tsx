import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "MoFF — Mixture of Finfluencers",
  description:
    "Track how YouTube finance influencers' calls actually performed, and where they agree or disagree right now.",
};

const NAV = [
  { href: "/", label: "Consensus" },
  { href: "/influencers", label: "Influencers" },
  { href: "/feed", label: "My Feed" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <header className="sticky top-0 z-50 border-b border-ink-800/70 bg-ink-950/80 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-5">
            <Link href="/" className="group flex items-center gap-2.5">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-linear-to-br from-accent-500 to-bull-500 text-[11px] font-bold text-ink-950">
                M
              </span>
              <span className="text-sm font-semibold tracking-tight">
                MoFF
                <span className="ml-1.5 hidden font-normal text-ink-500 sm:inline">
                  Mixture of Finfluencers
                </span>
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-2.5 py-1.5 text-ink-300 transition-colors hover:bg-ink-850 hover:text-ink-100"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>

        <footer className="mt-16 border-t border-ink-800/70">
          <div className="mx-auto max-w-6xl px-5 py-6 text-xs leading-relaxed text-ink-500">
            <p className="font-medium text-ink-300">Not financial advice.</p>
            <p className="mt-1 max-w-3xl">
              Every return shown is a simulation: entry at the next session open
              after a video is published, exit at the stated horizon, measured
              against SPY over the identical window. No trades are placed on
              anyone&rsquo;s behalf and past performance says little about future
              results.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
