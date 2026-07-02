"use client";

import Link from "next/link";
import type { DashboardRoute } from "@/lib/nextrole-data";

export function DashboardRoutePage({ route }: { route: DashboardRoute }) {
  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 className="nr-display" style={{ fontSize: 24, marginBottom: 4 }}>
          {route.title || "Page not found"}
        </h1>
        {route.subtitle && (
          <p style={{ fontSize: 14, color: "var(--muted-foreground)" }}>
            {route.subtitle}
          </p>
        )}
      </div>

      <div className="nr-card" style={{ padding: "40px 32px", textAlign: "center" }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--muted-foreground)] mb-3">
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
