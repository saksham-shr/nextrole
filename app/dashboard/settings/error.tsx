"use client";

import { useEffect } from "react";

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[settings error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
      <p className="text-[14px] font-medium text-[var(--foreground)]">Failed to load settings</p>
      <button
        onClick={reset}
        className="rounded-[6px] border border-[var(--line)] px-3 py-1.5 text-[13px] text-[var(--foreground)] hover:bg-[var(--surface-soft)]"
      >
        Reload
      </button>
    </div>
  );
}
