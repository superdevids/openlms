import type { JSX, ReactNode } from "react";

/**
 * Layout grup (ppdb) — halaman publik PPDB (/, /daftar, /status) tanpa AppShell.
 * Memaksa tema terang apa pun tema sistem/dashboard via .landing-light
 * (globals.css) — konsisten dengan home dan grup (landing).
 */
export default function PPDBLayout({ children }: Readonly<{ children: ReactNode }>): JSX.Element {
  return <div className="landing-light min-h-screen bg-background">{children}</div>;
}
