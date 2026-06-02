"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: "var(--bad-bg)", color: "var(--bad)" }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div>
        <h2 className="text-[17px] font-semibold text-[var(--foreground)]">Something went wrong</h2>
        <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
          An unexpected error occurred. Refresh to try again.
        </p>
      </div>
      <button
        onClick={reset}
        className="rounded-[6px] bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-[#fffdf8] transition hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
