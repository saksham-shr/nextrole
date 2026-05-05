"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useCurrency, INR_PRICES } from "@/lib/hooks/use-currency";

type UpgradeTier = "starter" | "pro" | "team" | "byok";

const TIER_META: Record<UpgradeTier, { name: string; inrPrice: number; period: string; color: string }> = {
  starter: { name: "Starter", inrPrice: INR_PRICES.starter_monthly, period: "/mo", color: "var(--accent)" },
  pro:     { name: "Pro",     inrPrice: INR_PRICES.pro_monthly,     period: "/mo", color: "var(--ok)" },
  team:    { name: "Team",    inrPrice: INR_PRICES.team_monthly,    period: "/mo", color: "var(--ok)" },
  byok:    { name: "BYOK",   inrPrice: INR_PRICES.byok_monthly,    period: "/mo", color: "var(--accent)" },
};

export function UpgradeModal({
  feature,
  requiredTier,
  onClose,
}: {
  feature: string;
  requiredTier: UpgradeTier;
  onClose: () => void;
}) {
  const meta = TIER_META[requiredTier];
  const { price, loading } = useCurrency();
  const displayPrice = loading ? "—" : price(meta.inrPrice).display;

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-[var(--foreground)] opacity-40" />
      <div
        className="relative w-full max-w-sm rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-md)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-bg)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h2 className="font-['DM_Serif_Display'] text-xl text-[var(--foreground)]">
          Unlock {feature}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
          This feature requires the{" "}
          <span className="font-semibold" style={{ color: meta.color }}>
            {meta.name}
          </span>{" "}
          plan or above.
        </p>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Starting at{" "}
          <span className="font-semibold text-[var(--foreground)]">
            {displayPrice}{meta.period}
          </span>
          .
        </p>

        <div className="mt-5 flex gap-2">
          <Link
            href="/dashboard/billing"
            className="flex-1 rounded-full bg-[var(--accent)] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:opacity-90"
            onClick={onClose}
          >
            View plans
          </Link>
          <button
            onClick={onClose}
            className="rounded-full border border-[var(--line-soft)] px-4 py-2.5 text-sm text-[var(--muted-foreground)] transition hover:border-[var(--line)] hover:text-[var(--foreground)]"
          >
            Not now
          </button>
        </div>

        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[var(--muted-foreground-2)] transition hover:text-[var(--foreground)]"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
