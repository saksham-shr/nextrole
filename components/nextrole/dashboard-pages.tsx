"use client";

import Link from "next/link";
import type { DashboardRoute } from "@/lib/nextrole-data";

export function DashboardRoutePage({ route }: { route: DashboardRoute }) {
  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
          NextRole workspace
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--foreground)]">
          {route.title || "Page not found"}
        </h1>
        {route.subtitle && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted-foreground)]">
            {route.subtitle}
          </p>
        )}
      </div>

      <div className="nr-card" style={{ padding: "40px 32px", textAlign: "center" }}>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted-foreground)] mb-3">
          Coming soon
        </p>
        <p className="text-sm text-[var(--muted-foreground)]">
          This page is not yet available.
        </p>
        <Link
          href="/dashboard"
          style={{ display: "inline-block", marginTop: 16, fontSize: 13, color: "var(--accent)", textDecoration: "none" }}
          className="hover:underline"
        >
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}
