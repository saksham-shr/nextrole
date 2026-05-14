"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { BrandWordmark } from "@/components/nextrole/brand";
import { quickActions } from "@/lib/nextrole-data";
import { signOut } from "@/app/actions/auth";
import { useCommandLauncher } from "@/components/nextrole/command-launcher";
import { canAccess, type Tier } from "@/lib/ai/gates";
import { UpgradeModal } from "@/components/nextrole/upgrade-modal";
import { DashboardTour, type DashboardTourHandle } from "@/components/nextrole/dashboard-tour";
import type { UserTier } from "@/lib/db/types";

function trialDaysLeft(endsAt: string | null): number | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

type RequiredTier = "starter" | "pro";

const TOP_NAV = [
  { id: "home",     label: "Home",     href: "/dashboard" },
  { id: "pipeline", label: "Pipeline", href: "/dashboard/pipeline" },
  { id: "evaluate", label: "Evaluate", href: "/dashboard/evaluate" },
  { id: "resume",   label: "Resume",   href: "/dashboard/resumes" },
  { id: "settings", label: "Settings", href: "/dashboard/settings" },
] as const;

type NavId = typeof TOP_NAV[number]["id"];

function getActiveNav(pathname: string): NavId {
  if (pathname === "/dashboard") return "home";
  if (pathname.startsWith("/dashboard/pipeline")) return "pipeline";
  if (pathname.startsWith("/dashboard/evaluate")) return "evaluate";
  if (pathname.startsWith("/dashboard/resumes")) return "resume";
  if (
    pathname.startsWith("/dashboard/settings") ||
    pathname.startsWith("/dashboard/billing") ||
    pathname.startsWith("/dashboard/admin") ||
    pathname.startsWith("/dashboard/profile")
  ) return "settings";
  return "home";
}

const TIER_LABELS: Partial<Record<UserTier, string>> = {
  free:    "Free",
  starter: "Starter",
  pro:     "Pro",
};

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

// Mobile icon for bottom nav
function NavIcon({ id, size = 20 }: { id: NavId; size?: number }) {
  const p = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none" as const,
    stroke: "currentColor" as const, strokeWidth: 1.7,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
  };
  switch (id) {
    case "home":
      return <svg {...p}><path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/></svg>;
    case "pipeline":
      return <svg {...p}><rect x="3" y="5" width="18" height="3" rx="1"/><rect x="3" y="11" width="14" height="3" rx="1"/><rect x="3" y="17" width="10" height="3" rx="1"/></svg>;
    case "evaluate":
      return <svg {...p}><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M6.3 17.7l2.8-2.8M14.9 9.1l2.8-2.8"/></svg>;
    case "resume":
      return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h4"/></svg>;
    case "settings":
      return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
  }
}

export function DashboardShell({
  children,
  user,
  isAdmin = false,
  tier = "free",
  creditsRemaining = 0,
  trialEndsAt = null,
}: {
  children: ReactNode;
  user: { email: string };
  isAdmin?: boolean;
  tier?: UserTier;
  creditsRemaining?: number;
  trialEndsAt?: string | null;
}) {
  const daysLeft = trialDaysLeft(trialEndsAt);
  const inTrial = daysLeft !== null && daysLeft > 0 && !isAdmin;
  const pathname = usePathname();
  const activeNav = getActiveNav(pathname);
  const { modal, triggerOpen } = useCommandLauncher(tier);
  const { dark, toggle: toggleDark } = useDarkMode();
  const tourRef = useRef<DashboardTourHandle>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [upgradeModal, setUpgradeModal] = useState<{ feature: string; requiredTier: RequiredTier } | null>(null);
  const closeUpgradeModal = useCallback(() => setUpgradeModal(null), []);

  // Close user menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = displayName(user.email).charAt(0).toUpperCase();
  const tierLabel = TIER_LABELS[tier] ?? tier;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <NavigationProgress />
      {modal}
      {upgradeModal && (
        <UpgradeModal
          feature={upgradeModal.feature}
          requiredTier={upgradeModal.requiredTier}
          onClose={closeUpgradeModal}
        />
      )}

      {/* ── Top nav ── */}
      <header
        className="shrink-0 border-b border-[var(--line-soft)] bg-[var(--background)]"
        style={{ height: 56 }}
      >
        <div className="flex h-full items-center gap-6 px-7">

          {/* Left: Logo */}
          <Link href="/dashboard" className="shrink-0">
            <BrandWordmark size={20} />
          </Link>

          {/* Center: Nav links */}
          <nav className="hidden flex-1 justify-center gap-1 md:flex">
            {TOP_NAV.map((item) => {
              const active = activeNav === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  data-tour={
                    item.id === "home"     ? "bucket-jobs"     :
                    item.id === "pipeline" ? "bucket-track"    :
                    item.id === "evaluate" ? "bucket-prep"     :
                    item.id === "resume"   ? "bucket-resume"   :
                    item.id === "settings" ? "bucket-settings" :
                    undefined
                  }
                  className="rounded-[5px] px-3 py-[7px] text-[13.5px] font-medium transition"
                  style={{
                    color: active ? "var(--foreground)" : "var(--muted-foreground)",
                    background: active ? "var(--surface)" : "transparent",
                    border: active ? "1px solid var(--line-soft)" : "1px solid transparent",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: actions + avatar */}
          <div className="ml-auto flex items-center gap-2.5">

            {/* ⌘K trigger */}
            <button
              type="button"
              onClick={triggerOpen}
              data-tour="search-bar"
              className="hidden items-center gap-2 rounded-[6px] border border-[var(--line-soft)] bg-[var(--background)] px-3 py-1.5 xl:flex"
              style={{ fontFamily: "var(--font-mono-stack)", fontSize: 11, color: "var(--muted-foreground)", letterSpacing: "0.06em" }}
            >
              <span className="hidden lg:inline">⌘K</span>
              <span className="hidden xl:inline">· Search…</span>
            </button>

            {/* Add job */}
            <Link
              href={quickActions[0]?.href ?? "/dashboard/pipeline"}
              data-tour="add-job-btn"
              className="flex items-center gap-1.5 rounded-[6px] bg-[var(--accent)] px-3 py-1.5 text-[13px] font-medium text-[#fffdf8] transition hover:bg-[var(--accent-hover)]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              Add job
            </Link>

            {/* Tour button */}
            <button
              onClick={() => tourRef.current?.open()}
              title="Take a tour"
              className="hidden rounded-full border border-[var(--line-soft)] px-2.5 py-1 text-[var(--muted-foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] sm:block"
              style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10 }}
            >
              ?
            </button>

            {/* Avatar + menu */}
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-[rgba(200,74,31,0.2)] text-[var(--accent)] transition hover:border-[var(--accent)]"
                style={{
                  background: "var(--accent-soft)",
                  fontFamily: "var(--font-mono-stack)",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {initials}
              </button>

              {userMenuOpen && (
                <div
                  className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[180px] rounded-[8px] border border-[var(--line-soft)] bg-[var(--surface)] py-1"
                  style={{ boxShadow: "var(--shadow-md)" }}
                >
                  <div className="border-b border-[var(--line-soft)] px-4 py-2.5">
                    <div className="truncate text-[13px] font-medium text-[var(--foreground)]">
                      {displayName(user.email)}
                    </div>
                    <div
                      className="mt-0.5 uppercase text-[var(--muted-foreground)]"
                      style={{ fontFamily: "var(--font-mono-stack)", fontSize: 9.5, letterSpacing: "0.1em" }}
                    >
                      {tierLabel} plan{isAdmin ? " · Admin" : ""}
                    </div>
                  </div>

                  {/* Credits (paid tiers only — free tier has no credits) */}
                  {(tier === "starter" || tier === "pro") && (() => {
                    const dailyBase = tier === "pro" ? 300 : 100;
                    const daily     = Math.min(creditsRemaining, dailyBase);
                    const topup     = Math.max(0, creditsRemaining - dailyBase);
                    const pct       = dailyBase > 0 ? Math.min(100, (daily / dailyBase) * 100) : 0;
                    return (
                      <div className="border-b border-[var(--line-soft)] px-4 py-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] text-[var(--muted-foreground)]">Credits remaining</span>
                          <span className="text-[var(--foreground)]" style={{ fontFamily: "var(--font-mono-stack)", fontSize: 12 }}>
                            {creditsRemaining}
                          </span>
                        </div>
                        <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-[var(--line-soft)]">
                          <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
                          resets daily · {dailyBase} per day
                          {topup > 0 && <span className="ml-1.5 font-semibold text-[var(--ok)]">+{topup} top-up</span>}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Trial countdown */}
                  {inTrial && (
                    <div className="border-b border-[var(--line-soft)] px-4 py-2.5">
                      <p className="text-[12px] text-[var(--foreground)]">{daysLeft} {daysLeft === 1 ? "day" : "days"} left in trial</p>
                      <Link
                        href="/dashboard/billing"
                        className="text-[12px] text-[var(--accent)] hover:underline"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Upgrade →
                      </Link>
                    </div>
                  )}

                  <div className="px-1 pt-1">
                    <Link
                      href="/dashboard/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 rounded-[4px] px-3 py-2 text-[13px] text-[var(--foreground)] transition hover:bg-[var(--surface-soft)]"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                      My Profile
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/dashboard/admin"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 rounded-[4px] px-3 py-2 text-[13px] text-[var(--foreground)] transition hover:bg-[var(--surface-soft)]"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                        Admin panel
                      </Link>
                    )}
                    <Link
                      href="/dashboard/billing"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center rounded-[4px] px-3 py-2 text-[13px] text-[var(--foreground)] transition hover:bg-[var(--surface-soft)]"
                    >
                      {tier === "free" ? "Upgrade plan" : "Manage plan"}
                    </Link>
                    <button
                      onClick={() => { toggleDark(); setUserMenuOpen(false); }}
                      className="flex w-full items-center rounded-[4px] px-3 py-2 text-[13px] text-[var(--foreground)] transition hover:bg-[var(--surface-soft)]"
                    >
                      {dark ? "Light mode" : "Dark mode"}
                    </button>
                    <form action={signOut}>
                      <button
                        type="submit"
                        className="flex w-full items-center rounded-[4px] px-3 py-2 text-[13px] text-[var(--muted-foreground)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
                      >
                        Sign out
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="flex-1 overflow-y-auto bg-[var(--surface)] px-4 py-5 pb-20 sm:px-6 sm:py-6 md:pb-6">
        {children}
      </main>

      <DashboardTour ref={tourRef} />

      {/* ── Mobile bottom nav ── */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-[var(--line-soft)] bg-[var(--surface)] md:hidden">
        {TOP_NAV.map((item) => {
          const active = activeNav === item.id;
          return (
            <Link
              key={item.id}
              href={item.href}
              className="flex flex-1 flex-col items-center gap-1 py-2.5 transition"
              style={{ color: active ? "var(--accent)" : "var(--muted-foreground-2)" }}
            >
              <NavIcon id={item.id} size={20} />
              <span
                className="uppercase"
                style={{ fontFamily: "var(--font-mono-stack)", fontSize: 8, letterSpacing: "0.15em" }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
