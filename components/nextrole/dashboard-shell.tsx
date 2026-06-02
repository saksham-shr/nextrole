"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef, type ReactNode } from "react";
import { signOut } from "@/app/actions/auth";
import type { UserTier } from "@/lib/db/types";

function trialDaysLeft(endsAt: string | null): number | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
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

function displayName(email: string): string {
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

const NAV_PRIMARY = [
  { label: "Home",      href: "/dashboard",          icon: HomeIcon },
  { label: "Profile",   href: "/dashboard/profile",  icon: ProfileIcon },
  { label: "Resumes",   href: "/dashboard/resumes",  icon: ResumeIcon },
  { label: "Evaluate",  href: "/dashboard/evaluate", icon: EvalIcon },
  { label: "Pipeline",  href: "/dashboard/pipeline", icon: PipelineIcon },
] as const;

const NAV_SECONDARY = [
  { label: "Settings",          href: "/dashboard/settings",          icon: SettingsIcon },
  { label: "Billing",           href: "/dashboard/billing",           icon: BillingIcon },
  { label: "Connect Extension", href: "/connect-extension",           icon: ExtIcon },
] as const;

function isActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

function Sidebar({
  email,
  isAdmin,
  tier,
  creditsRemaining,
  dark,
  toggleDark,
}: {
  email: string;
  isAdmin: boolean;
  tier: UserTier;
  creditsRemaining: number;
  dark: boolean;
  toggleDark: () => void;
}) {
  const pathname = usePathname();
  const dailyMax = tier === "pro" ? 300 : tier === "starter" ? 100 : 0;
  const creditPct = dailyMax > 0 ? Math.min(100, (creditsRemaining / dailyMax) * 100) : 0;
  const initials = displayName(email).charAt(0).toUpperCase();
  const name = displayName(email);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <aside
      style={{
        width: "var(--sidebar-w)",
        flexShrink: 0,
        background: "var(--surface)",
        borderRight: "1px solid var(--line-soft)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Brand */}
      <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid var(--line-softer)" }}>
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fffdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 17,
              letterSpacing: "-0.01em",
              color: "var(--foreground)",
            }}
          >
            NextRole
          </span>
        </Link>
      </div>

      {/* Primary nav */}
      <nav style={{ padding: "12px 10px 6px", flex: "0 0 auto" }}>
        {NAV_PRIMARY.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={"nr-nav-item" + (isActive(href, pathname) ? " active" : "")}
          >
            <Icon size={15} />
            {label}
          </Link>
        ))}
      </nav>

      <div style={{ margin: "8px 10px", borderTop: "1px solid var(--line-softer)" }} />

      {/* Secondary nav */}
      <nav style={{ padding: "0 10px", flex: "0 0 auto" }}>
        {NAV_SECONDARY.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={"nr-nav-item" + (isActive(href, pathname) ? " active" : "")}
          >
            <Icon size={15} />
            {label}
          </Link>
        ))}
        {isAdmin && (
          <Link
            href="/dashboard/admin"
            className={"nr-nav-item" + (isActive("/dashboard/admin", pathname) ? " active" : "")}
          >
            <AdminIcon size={15} />
            Admin
          </Link>
        )}
      </nav>

      <div style={{ flex: 1 }} />

      {/* Credits pill */}
      {(tier === "starter" || tier === "pro") && (
        <div style={{ padding: "0 10px 10px" }}>
          <Link
            href="/dashboard/billing"
            style={{
              display: "block",
              padding: "10px 12px",
              borderRadius: 8,
              background: "var(--background)",
              border: "1px solid var(--line-soft)",
              textDecoration: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span className="nr-small" style={{ fontFamily: "var(--font-mono-stack)", letterSpacing: "0.04em", textTransform: "uppercase", fontSize: 9 }}>
                Credits
              </span>
              <span className="nr-small" style={{ fontFamily: "var(--font-mono-stack)" }}>
                {creditsRemaining}/{dailyMax}
              </span>
            </div>
            <div className="nr-progress">
              <div style={{ width: `${creditPct}%` }} />
            </div>
          </Link>
        </div>
      )}

      {/* User footer */}
      <div ref={menuRef} style={{ padding: "0 10px 12px", position: "relative" }}>
        <div style={{ borderTop: "1px solid var(--line-softer)", paddingTop: 10 }}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "6px 6px",
              borderRadius: 6,
              cursor: "pointer",
              background: menuOpen ? "var(--surface-soft)" : "transparent",
              border: "none",
              transition: "background 0.12s",
            }}
            onMouseEnter={(e) => { if (!menuOpen) (e.currentTarget as HTMLElement).style.background = "var(--surface-soft)"; }}
            onMouseLeave={(e) => { if (!menuOpen) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <div
              className="nr-avatar"
              style={{ width: 26, height: 26, fontSize: 11 }}
            >
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {name}
              </div>
              <div className="nr-small" style={{ fontSize: 10, textTransform: "capitalize" }}>
                {tier}{isAdmin ? " · Admin" : ""}
              </div>
            </div>
            <ChevronIcon size={12} />
          </button>
        </div>

        {menuOpen && (
          <div
            className="nr-card"
            style={{
              position: "absolute",
              bottom: "calc(100% - 4px)",
              left: 10,
              right: 10,
              zIndex: 50,
              padding: "4px 0",
              boxShadow: "0 -4px 20px rgba(36,31,25,0.12)",
            }}
          >
            <div style={{ padding: "8px 12px 8px", borderBottom: "1px solid var(--line-softer)", marginBottom: 4 }}>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {email}
              </div>
            </div>
            {[
              { label: dark ? "Light mode" : "Dark mode", action: () => { toggleDark(); setMenuOpen(false); } },
            ].map(({ label, action }) => (
              <button
                key={label}
                onClick={action}
                style={{
                  display: "flex", width: "100%", padding: "7px 12px",
                  fontSize: 13, color: "var(--foreground)", background: "none", border: "none",
                  cursor: "pointer", textAlign: "left",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-soft)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {label}
              </button>
            ))}
            <form action={signOut}>
              <button
                type="submit"
                style={{
                  display: "flex", width: "100%", padding: "7px 12px",
                  fontSize: 13, color: "var(--muted-foreground)", background: "none", border: "none",
                  cursor: "pointer", textAlign: "left",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-soft)"; (e.currentTarget as HTMLElement).style.color = "var(--foreground)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--muted-foreground)"; }}
              >
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </aside>
  );
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
  const { dark, toggle: toggleDark } = useDarkMode();
  void trialDaysLeft(trialEndsAt); // reserved for future trial UI

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--background)" }}>
      <NavigationProgress />

      {/* Sidebar — hidden on mobile */}
      <div className="hidden md:flex" style={{ height: "100%" }}>
        <Sidebar
          email={user.email}
          isAdmin={isAdmin}
          tier={tier}
          creditsRemaining={creditsRemaining}
          dark={dark}
          toggleDark={toggleDark}
        />
      </div>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          overflow: "auto",
          background: "var(--background)",
          padding: 32,
        }}
      >
        {children}
      </main>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  );
}

function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        display: "flex",
        borderTop: "1px solid var(--line-soft)",
        background: "var(--surface)",
      }}
      className="md:hidden"
    >
      {NAV_PRIMARY.map(({ label, href, icon: Icon }) => {
        const active = isActive(href, pathname);
        return (
          <Link
            key={href}
            href={href}
            style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", gap: 3, padding: "10px 0",
              color: active ? "var(--accent)" : "var(--muted-foreground-2)",
              textDecoration: "none",
              transition: "color 0.12s",
            }}
          >
            <Icon size={20} />
            <span style={{
              fontFamily: "var(--font-mono-stack)",
              fontSize: 8, letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/* ── SVG Icons ─────────────────────────────────────────────── */
function HomeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/>
    </svg>
  );
}
function ProfileIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  );
}
function ResumeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h4"/>
    </svg>
  );
}
function EvalIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M6.3 17.7l2.8-2.8M14.9 9.1l2.8-2.8"/>
    </svg>
  );
}
function PipelineIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="3" rx="1"/><rect x="3" y="11" width="14" height="3" rx="1"/><rect x="3" y="17" width="10" height="3" rx="1"/>
    </svg>
  );
}
function SettingsIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}
function BillingIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
    </svg>
  );
}
function ExtIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 5h6V3a2 2 0 0 1 4 0v2h4a2 2 0 0 1 2 2v4h-2a2 2 0 0 0 0 4h2v4a2 2 0 0 1-2 2h-4v-2a2 2 0 0 0-4 0v2H5a2 2 0 0 1-2-2v-4h2a2 2 0 0 0 0-4H3V7a2 2 0 0 1 2-2z"/>
    </svg>
  );
}
function AdminIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
    </svg>
  );
}
function ChevronIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6"/>
    </svg>
  );
}
