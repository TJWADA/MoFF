import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "MoFF — find a YouTuber",
  description: "Search a YouTube channel and list its recent videos.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <header className="border-b border-line">
          <div className="mx-auto max-w-2xl px-5 py-6 text-center">
            <Link href="/" className="text-2xl font-medium tracking-tight">
              MoFF
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-5 py-10">{children}</main>
      </body>
    </html>
  );
}
