import Link from "next/link";
import { BrandWordmark } from "@/components/nextrole/brand";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">

      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--line-soft)]">
        <BrandWordmark />
        <Link
          href="/dashboard"
          className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          Dashboard →
        </Link>
      </header>

      {/* Body */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">

        {/* Big number */}
        <span
          className="select-none leading-none text-[var(--accent)]"
          style={{
            fontFamily: "var(--font-caveat, var(--font-display, serif))",
            fontSize: "clamp(120px, 22vw, 220px)",
            fontWeight: 700,
            opacity: 0.15,
          }}
          aria-hidden="true"
        >
          404
        </span>

        {/* Text block */}
        <div className="-mt-8 sm:-mt-12">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--accent)] mb-3">
            Page not found
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[var(--foreground)] mb-4">
            This page doesn&apos;t exist.
          </h1>
          <p className="max-w-sm text-[var(--muted-foreground)] text-sm leading-relaxed mb-8">
            The link might be outdated or the page was removed. Head back to the
            dashboard to keep your job search on track.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-full bg-[var(--foreground)] px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--background)] hover:opacity-90 transition-opacity"
            >
              Go to dashboard
            </Link>
            <Link
              href="/dashboard/pipeline"
              className="rounded-full border border-[var(--line-soft)] px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--foreground)] hover:border-[var(--line)] transition-colors"
            >
              View pipeline
            </Link>
          </div>
        </div>

        {/* Decorative rule */}
        <div className="mt-16 flex items-center gap-4 opacity-30">
          <div className="h-px w-16 bg-[var(--line)]" />
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 5L17 12L8 19" />
          </svg>
          <div className="h-px w-16 bg-[var(--line)]" />
        </div>

      </main>
    </div>
  );
}
