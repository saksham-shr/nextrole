"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, useCallback, useRef, type ReactNode } from "react";
import { BrandWordmark } from "@/components/nextrole/brand";
import { Button } from "@/components/nextrole/ui";
import { quickActions } from "@/lib/nextrole-data";
import { signOut } from "@/app/actions/auth";
import { useCommandLauncher } from "@/components/nextrole/command-launcher";
import { canAccess } from "@/lib/ai/gates";
import { UpgradeModal } from "@/components/nextrole/upgrade-modal";
import { DashboardTour, type DashboardTourHandle } from "@/components/nextrole/dashboard-tour";
import type { UserTier } from "@/lib/db/types";

function trialDaysLeft(endsAt: string | null): number | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

type RequiredTier = "starter" | "pro" | "team";

type NavItem = {
  label: string;
  href: string;
  feature?: string;
  requiredTier?: RequiredTier;
};

type BucketId = "jobs" | "resume" | "prep" | "track" | "settings";

type Bucket = {
  id: BucketId;
  icon: "search" | "doc" | "mic" | "list" | "gear";
  label: string;
  items: NavItem[];
};

const BUCKETS: Bucket[] = [
  {
    id: "jobs",
    icon: "search",
    label: "Jobs",
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Pipeline", href: "/dashboard/pipeline" },
      { label: "Evaluate", href: "/dashboard/evaluate" },
      { label: "Scanner", href: "/dashboard/scanner" },
      { label: "Compare", href: "/dashboard/compare", feature: "job_comparison", requiredTier: "starter" },
      { label: "Batch", href: "/dashboard/batch", feature: "batch", requiredTier: "pro" },
      { label: "Reports", href: "/dashboard/reports", feature: "export", requiredTier: "starter" },
      { label: "Activity", href: "/dashboard/activity" },
    ],
  },
  {
    id: "resume",
    icon: "doc",
    label: "Resume",
    items: [
      { label: "My CV", href: "/dashboard/cv" },
      { label: "Tailored", href: "/dashboard/resumes", feature: "resume_tailor", requiredTier: "starter" },
    ],
  },
  {
    id: "prep",
    icon: "mic",
    label: "Prep",
    items: [
      { label: "Interview", href: "/dashboard/interview-prep", feature: "interview_prep", requiredTier: "starter" },
      { label: "Stories", href: "/dashboard/story-bank", feature: "story", requiredTier: "starter" },
      { label: "Apply", href: "/dashboard/apply", feature: "apply", requiredTier: "starter" },
      { label: "Follow-up", href: "/dashboard/followup", feature: "followup", requiredTier: "starter" },
      { label: "Contact", href: "/dashboard/contact", feature: "contact_draft", requiredTier: "starter" },
      { label: "Training", href: "/dashboard/training", feature: "training_eval", requiredTier: "starter" },
      { label: "Negotiate", href: "/dashboard/negotiate", feature: "negotiate", requiredTier: "pro" },
      { label: "Research", href: "/dashboard/deep", feature: "deep_research", requiredTier: "pro" },
      { label: "Project", href: "/dashboard/project", feature: "deep_research", requiredTier: "pro" },
      { label: "Patterns", href: "/dashboard/patterns", feature: "priority_queue", requiredTier: "pro" },
      { label: "Prompts", href: "/dashboard/prompts" },
    ],
  },
  {
    id: "track",
    icon: "list",
    label: "Track",
    items: [
      { label: "Tracker", href: "/dashboard/tracker" },
    ],
  },
  {
    id: "settings",
    icon: "gear",
    label: "Settings",
    items: [
      { label: "Profile", href: "/dashboard/profile" },
      { label: "Providers", href: "/dashboard/providers" },
      { label: "Settings", href: "/dashboard/settings" },
      { label: "Plan & billing", href: "/dashboard/billing" },
      { label: "Team", href: "/dashboard/team", feature: "team_dashboard", requiredTier: "team" },
    ],
  },
];

const TIER_LABELS: Record<UserTier, string> = {
  free:    "Free",
  starter: "Starter",
  pro:     "Pro",
  team:    "Team",
  byok:    "BYOK",
};


function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-50">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

type BucketIconName = "search" | "doc" | "mic" | "list" | "gear";

function BucketIcon({ name, size = 18 }: { name: BucketIconName; size?: number }) {
  const p = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor" as const,
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "search":
      return (
        <svg {...p}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      );
    case "doc":
      return (
        <svg {...p}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
      );
    case "mic":
      return (
        <svg {...p}>
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0" />
          <path d="M12 18v4" />
        </svg>
      );
    case "list":
      return (
        <svg {...p}>
          <path d="M8 6h13" />
          <path d="M8 12h13" />
          <path d="M8 18h13" />
          <circle cx="3.5" cy="6" r="1" />
          <circle cx="3.5" cy="12" r="1" />
          <circle cx="3.5" cy="18" r="1" />
        </svg>
      );
    case "gear":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
  }
}

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("nextrole-theme") === "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  function toggle() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("nextrole-theme", next ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
  }

  return { dark, toggle };
}

function NavigationProgress() {
  const pathname = usePathname();
  return (
    <div
      key={pathname}
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[2.5px] origin-left animate-[nav-progress_0.7s_ease-out_forwards] bg-[var(--accent)]"
    />
  );
}

function displayName(email: string) {
  const local = email.split("@")[0] ?? email;
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export function DashboardShell({
  children,
  user,
  isAdmin = false,
  tier = "free",
  creditsRemaining = 0,
  trialEndsAt = null,
  pendingInvite = null,
}: {
  children: ReactNode;
  user: { email: string };
  isAdmin?: boolean;
  tier?: UserTier;
  creditsRemaining?: number;
  trialEndsAt?: string | null;
  pendingInvite?: { id: string; ownerEmail: string } | null;
}) {
  const daysLeft = trialDaysLeft(trialEndsAt);
  const inTrial = daysLeft !== null && daysLeft > 0;
  const pathname = usePathname();
  const { modal, triggerOpen } = useCommandLauncher(tier);
  const { dark, toggle: toggleDark } = useDarkMode();
  const tourRef = useRef<DashboardTourHandle>(null);

  const [upgradeModal, setUpgradeModal] = useState<{ feature: string; requiredTier: RequiredTier } | null>(null);
  const closeUpgradeModal = useCallback(() => setUpgradeModal(null), []);

  function isAccessible(item: NavItem): boolean {
    if (!item.feature) return true;
    return canAccess(tier, item.feature);
  }

  function handleLockedClick(item: NavItem) {
    if (item.requiredTier) {
      setUpgradeModal({ feature: item.label, requiredTier: item.requiredTier });
    }
  }

  // Build buckets, injecting admin item if needed
  const buckets = useMemo<Bucket[]>(() => {
    if (!isAdmin) return BUCKETS;
    return BUCKETS.map((b) => {
      if (b.id !== "settings") return b;
      return {
        ...b,
        items: [...b.items, { label: "Admin", href: "/dashboard/admin" }],
      };
    });
  }, [isAdmin]);

  // Determine which bucket is active based on current pathname
  const activeBucketId = useMemo<BucketId>(() => {
    for (const bucket of buckets) {
      for (const item of bucket.items) {
        if (item.href === "/dashboard") {
          if (pathname === "/dashboard") return bucket.id;
        } else if (pathname.startsWith(item.href)) {
          return bucket.id;
        }
      }
    }
    return "jobs";
  }, [pathname, buckets]);

  function renderSubItem(item: NavItem) {
    const accessible = isAccessible(item);
    const active =
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href));

    if (!accessible) {
      return (
        <button
          key={item.href}
          onClick={() => handleLockedClick(item)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[var(--muted-foreground-2)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--muted-foreground)]"
        >
          <LockIcon />
          <span className="flex-1 text-left">{item.label}</span>
        </button>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition ${
          active
            ? "border-l-2 border-[var(--accent)] pl-[6px] text-[var(--accent)]"
            : "text-[var(--muted-foreground)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
        }`}
      >
        {item.label}
      </Link>
    );
  }

  return (
    // h-screen + overflow-hidden keeps the whole shell viewport-locked so the
    // sidebar and header pin in place while only the main content area scrolls.
    <div className="h-screen overflow-hidden">
      <NavigationProgress />
      {modal}
      {upgradeModal && (
        <UpgradeModal
          feature={upgradeModal.feature}
          requiredTier={upgradeModal.requiredTier}
          onClose={closeUpgradeModal}
        />
      )}

      {/* Pending team invite banner */}
      {pendingInvite && (
        <div className="fixed inset-x-0 top-0 z-[300] flex items-center justify-center gap-3 bg-[var(--accent)] px-4 py-2.5 text-white">
          <span className="text-[12px]">
            <strong>{pendingInvite.ownerEmail}</strong> invited you to their team.
          </span>
          <Link
            href={`/dashboard/team/accept?invite=${pendingInvite.id}`}
            className="rounded-full bg-white px-3 py-0.5 font-mono text-[11px] font-semibold text-[var(--accent)] transition hover:opacity-90"
          >
            View invite →
          </Link>
        </div>
      )}

      <div className="flex h-full overflow-hidden bg-[var(--surface)]" style={pendingInvite ? { paddingTop: "40px" } : undefined}>

        {/* ── Desktop Sidebar ── */}
        <aside className="hidden w-56 shrink-0 flex-col border-r border-[var(--line-soft)] bg-[var(--background)] md:flex">
          {/* Logo — never shrinks */}
          <div className="shrink-0 px-5 py-5">
            <BrandWordmark labelClassName="text-3xl" />
          </div>

          {/* Bucket list — scrolls independently */}
          <div className="flex-1 overflow-y-auto px-3 py-1">
            {buckets.map((bucket) => {
              const isActive = bucket.id === activeBucketId;
              const firstHref = bucket.items[0]?.href ?? "/dashboard";
              return (
                <div key={bucket.id} className="mb-1">
                  <Link
                    href={firstHref}
                    data-tour={`bucket-${bucket.id}`}
                    className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-[14.5px] font-semibold transition-all ${
                      isActive
                        ? "bg-[var(--accent)] text-white"
                        : "text-[var(--muted-foreground)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    <BucketIcon name={bucket.icon} size={17} />
                    <span>{bucket.label}</span>
                  </Link>

                  {/* Sub-items — expand when active */}
                  {isActive && bucket.items.length > 1 && (
                    <div className="ml-4 mt-1 space-y-0.5 border-l border-[var(--line-soft)] pl-3">
                      {bucket.items.map(renderSubItem)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom widget — never shrinks */}
          <div className="shrink-0 border-t border-[var(--line-soft)] px-4 py-4 space-y-3">

            {/* Trial countdown */}
            {inTrial && (
              <div>
                <p className="text-[11px] font-semibold text-[var(--foreground)]">
                  {daysLeft} {daysLeft === 1 ? "day" : "days"} left in trial
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                  Free trial ends soon.{" "}
                  <Link href="/dashboard/billing" className="text-[var(--accent)] hover:underline">
                    Upgrade →
                  </Link>
                </p>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[var(--line-soft)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-all"
                    style={{ width: `${Math.min(100, ((daysLeft ?? 0) / 14) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Credits bar (non-byok, non-trial) */}
            {tier !== "byok" && !inTrial && creditsRemaining > 0 && (
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--muted-foreground)]">AI credits</span>
                  <span className="text-[11px] font-medium text-[var(--foreground)]">{creditsRemaining}</span>
                </div>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[var(--line-soft)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-all"
                    style={{ width: `${Math.min(100, (creditsRemaining / 500) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Plan + admin label */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[var(--muted-foreground)]">
                {TIER_LABELS[tier]} plan{isAdmin ? " · Admin" : ""}
              </span>
              <Link
                href="/dashboard/billing"
                className="text-[11px] text-[var(--muted-foreground)] transition hover:text-[var(--accent)]"
              >
                Manage
              </Link>
            </div>

            {/* Sign out + dark mode */}
            <div className="flex items-center justify-between pt-1">
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-[12px] text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
                >
                  Sign out
                </button>
              </form>
              <button
                onClick={toggleDark}
                className="text-[12px] text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
              >
                {dark ? "Light mode" : "Dark mode"}
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main column ── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Header — pinned because the parent flex-col doesn't scroll */}
          <header className="shrink-0 border-b border-[var(--line-soft)] bg-[var(--surface)]/95 backdrop-blur z-10">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={triggerOpen}
                  data-tour="search-bar"
                  className="w-full rounded-xl border border-[var(--line-soft)] bg-[var(--background)] px-4 py-2.5 text-left font-['DM_Mono'] text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)] transition hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                >
                  <span className="hidden sm:inline">⌘K · </span>Search pages, actions, tools...
                </button>
              </div>
              <div className="hidden gap-2 xl:flex">
                {quickActions.slice(0, 3).map((action, index) => (
                  <span key={action.href} {...(index === 0 ? { "data-tour": "add-job-btn" } : {})}>
                    <Button href={action.href} tone={index === 0 ? "accent" : "default"}>
                      {action.label}
                    </Button>
                  </span>
                ))}
              </div>
              <button
                onClick={() => tourRef.current?.open()}
                title="Take a tour"
                className="rounded-full border border-[var(--line-soft)] px-2.5 py-1 font-['DM_Mono'] text-[10px] text-[var(--muted-foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                ?
              </button>
            </div>
          </header>

          {/* Content — only this area scrolls */}
          <main className="flex-1 overflow-y-auto px-4 py-5 pb-20 sm:px-6 sm:py-6 md:pb-6">
            {children}
          </main>
        </div>
      </div>

      <DashboardTour ref={tourRef} />

      {/* ── Mobile bottom nav ── */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-[var(--line-soft)] bg-[var(--surface)] md:hidden">
        {buckets.map((bucket) => {
          const isActive = bucket.id === activeBucketId;
          const firstHref = bucket.items[0]?.href ?? "/dashboard";
          return (
            <Link
              key={bucket.id}
              href={firstHref}
              className="flex flex-1 flex-col items-center gap-1 py-2.5 transition"
              style={{ color: isActive ? "var(--accent)" : "var(--muted-foreground-2)" }}
            >
              <BucketIcon name={bucket.icon} size={20} />
              <span className="font-['DM_Mono'] text-[8px] uppercase tracking-[0.15em]">
                {bucket.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
