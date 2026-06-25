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

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(pointer: fine)").matches : true
  );
  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
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
  { label: "Explore",   href: "/dashboard/explore",  icon: ExploreIcon },
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

function TopBar() {
  return (
    <div style={{
      display: "flex", alignItems: "center", flexShrink: 0,
      padding: "11px 20px",
      background: "var(--surface)",
      borderBottom: "1px solid var(--line-softer)",
    }}>
      <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7, background: "var(--accent)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fffdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
        </div>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--foreground)" }}>NextRole</span>
      </Link>
    </div>
  );
}

// ── Invite / Referral modal ───────────────────────────────────────────────

function InviteModal({ code, onClose }: { code: string; onClose: () => void }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => { setOrigin(window.location.origin); }, []);

  const link = origin ? `${origin}/signup?ref=${code}` : "";
  const shareText = encodeURIComponent("I'm using NextRole to manage my job search — evaluating roles, tailoring resumes, tracking applications. Try it free:");
  const shareUrl  = encodeURIComponent(link);

  const shares = [
    {
      label: "WhatsApp",
      color: "#25D366",
      href: `https://wa.me/?text=${shareText}%20${shareUrl}`,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      ),
    },
    {
      label: "X / Twitter",
      color: "#000",
      href: `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`,
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
    },
    {
      label: "LinkedIn",
      color: "#0A66C2",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      ),
    },
    {
      label: "Email",
      color: "#6B7280",
      href: `mailto:?subject=Join me on NextRole&body=I've been using NextRole to manage my job search and it's great. Try it free: ${link}`,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
        </svg>
      ),
    },
  ] as const;

  function copyLink() {
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.4)",
        animation: "fadeIn 0.15s ease",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          borderRadius: 20,
          padding: "28px 28px 24px",
          width: "min(480px, calc(100vw - 32px))",
          boxShadow: "0 12px 48px rgba(0,0,0,0.15)",
          animation: "scaleIn 0.2s ease",
          position: "relative",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16,
            background: "none", border: "none", cursor: "pointer",
            color: "var(--muted-foreground)", padding: 4, borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-soft)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", flexShrink: 0 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
            </svg>
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>Invite a friend</h2>
            <p style={{ margin: 0, fontSize: 12, color: "var(--muted-foreground)" }}>You both earn +50 credits when they use 10+ credits</p>
          </div>
        </div>

        {/* Referral link */}
        <div style={{ marginTop: 20 }}>
          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted-foreground)", fontFamily: "var(--font-mono-stack)" }}>Your referral link</p>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{
              flex: 1, minWidth: 0,
              border: "1px solid var(--line-soft)",
              borderRadius: 10,
              background: "var(--surface-soft)",
              padding: "9px 12px",
              fontSize: 12,
              fontFamily: "var(--font-mono-stack)",
              color: "var(--foreground)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {link || "Loading…"}
            </div>
            <button
              onClick={copyLink}
              style={{
                flexShrink: 0,
                background: copied ? "var(--ok)" : "var(--accent)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "9px 16px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--muted-foreground)" }}>
            Code: <span style={{ fontFamily: "var(--font-mono-stack)", fontWeight: 600, letterSpacing: "0.06em" }}>{code}</span>
          </p>
        </div>

        {/* Share */}
        <div style={{ marginTop: 20 }}>
          <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted-foreground)", fontFamily: "var(--font-mono-stack)" }}>Share via</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {shares.map(({ label, color, href, icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--line-soft)",
                  background: "var(--surface-soft)",
                  color: "var(--foreground)",
                  textDecoration: "none",
                  fontSize: 12,
                  fontWeight: 500,
                  transition: "background 0.15s, color 0.15s, border-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = color;
                  el.style.color = "#fff";
                  el.style.borderColor = color;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = "var(--surface-soft)";
                  el.style.color = "var(--foreground)";
                  el.style.borderColor = "var(--line-soft)";
                }}
              >
                {icon}
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Sidebar({
  email,
  isAdmin,
  tier,
  creditsRemaining,
  creditGrantsGiven,
  dark,
  toggleDark,
  collapsed,
  onToggle,
  referralCode,
}: {
  email: string;
  isAdmin: boolean;
  tier: UserTier;
  creditsRemaining: number;
  creditGrantsGiven: Record<string, boolean>;
  dark: boolean;
  toggleDark: () => void;
  collapsed: boolean;
  onToggle: () => void;
  referralCode: string | null;
}) {
  const pathname = usePathname();
  const dailyMax = tier === "pro" ? 300 : tier === "starter" ? 100 : 0;
  // Free tier earns up to 100 credits via actions; use that as the display cap
  const freeCap = 100;
  const creditPct = dailyMax > 0
    ? Math.min(100, (creditsRemaining / dailyMax) * 100)
    : Math.min(100, (creditsRemaining / freeCap) * 100);
  const initials = displayName(email).charAt(0).toUpperCase();
  const name = displayName(email);
  const [menuOpen, setMenuOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
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
        width: collapsed ? 60 : "var(--sidebar-w)",
        flexShrink: 0,
        background: "var(--surface)",
        borderRight: "1px solid var(--line-soft)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        transition: "width 0.2s ease",
      }}
    >
      {/* Brand */}
      <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid var(--line-softer)", display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between" }}>
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", minWidth: 0 }}>
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
          {!collapsed && (
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 17,
                letterSpacing: "-0.01em",
                color: "var(--foreground)",
                whiteSpace: "nowrap",
              }}
            >
              NextRole
            </span>
          )}
        </Link>
        <button
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 24, height: 24, borderRadius: 5, flexShrink: 0,
            background: "none", border: "none", cursor: "pointer",
            color: "var(--muted-foreground-2)",
            marginLeft: collapsed ? 0 : 4,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-soft)"; (e.currentTarget as HTMLElement).style.color = "var(--foreground)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = "var(--muted-foreground-2)"; }}
        >
          <CollapseIcon collapsed={collapsed} size={13} />
        </button>
      </div>

      {/* Primary nav */}
      <nav style={{ padding: "12px 10px 6px", flex: "0 0 auto" }}>
        {NAV_PRIMARY.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            title={collapsed ? label : undefined}
            className={"nr-nav-item" + (isActive(href, pathname) ? " active" : "")}
            style={collapsed ? { justifyContent: "center", padding: "8px 0" } : {}}
          >
            <Icon size={15} />
            {!collapsed && label}
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
            title={collapsed ? label : undefined}
            className={"nr-nav-item" + (isActive(href, pathname) ? " active" : "")}
            style={collapsed ? { justifyContent: "center", padding: "8px 0" } : {}}
          >
            <Icon size={15} />
            {!collapsed && label}
          </Link>
        ))}
        {isAdmin && (
          <Link
            href="/dashboard/admin"
            title={collapsed ? "Admin" : undefined}
            className={"nr-nav-item" + (isActive("/dashboard/admin", pathname) ? " active" : "")}
            style={collapsed ? { justifyContent: "center", padding: "8px 0" } : {}}
          >
            <AdminIcon size={15} />
            {!collapsed && "Admin"}
          </Link>
        )}
      </nav>

      <div style={{ flex: 1 }} />

      {/* Invite button */}
      {referralCode && (
        <div style={{ padding: "0 10px 8px" }}>
          <button
            onClick={() => setInviteOpen(true)}
            title={collapsed ? "Invite a friend" : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: 8,
              width: "100%",
              padding: collapsed ? "8px 0" : "8px 10px",
              borderRadius: 8,
              border: "1px solid var(--accent)33",
              background: "var(--accent-soft)",
              color: "var(--accent)",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent)1a"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent-soft)"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
            </svg>
            {!collapsed && "Invite & earn"}
          </button>
        </div>
      )}

      {/* Credits pill — shown for all tiers (free earns via actions, paid get daily refresh) */}
      {!collapsed && !isAdmin && (
        <div style={{ padding: "0 10px 10px" }}>
          <Link
            href={tier === "free" ? "/dashboard" : "/dashboard/billing"}
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
                {tier === "free" ? creditsRemaining : `${creditsRemaining}/${dailyMax}`}
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
            title={collapsed ? `${name} (${tier})` : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: collapsed ? "6px 0" : "6px 6px",
              justifyContent: collapsed ? "center" : undefined,
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
            {!collapsed && (
              <>
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {name}
                  </div>
                  <div className="nr-small" style={{ fontSize: 10, textTransform: "capitalize" }}>
                    {tier}{isAdmin ? " · Admin" : ""}
                  </div>
                </div>
                <ChevronIcon size={12} />
              </>
            )}
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
              ...(referralCode ? [{ label: "Invite & earn credits", action: () => { setInviteOpen(true); setMenuOpen(false); } }] : []),
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

        {inviteOpen && referralCode && (
          <InviteModal code={referralCode} onClose={() => setInviteOpen(false)} />
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
  referralCode = null,
  creditGrantsGiven = {},
}: {
  children: ReactNode;
  user: { email: string };
  isAdmin?: boolean;
  tier?: UserTier;
  creditsRemaining?: number;
  trialEndsAt?: string | null;
  referralCode?: string | null;
  creditGrantsGiven?: Record<string, boolean>;
}) {
  const { dark, toggle: toggleDark } = useDarkMode();
  const isDesktop = useIsDesktop();
  void trialDaysLeft(trialEndsAt); // reserved for future trial UI
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem("nextrole-sidebar-collapsed") === "true"
  );

  function toggleSidebar() {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem("nextrole-sidebar-collapsed", next ? "true" : "false");
  }

  const showTopBar = !isDesktop || sidebarCollapsed;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--background)" }}>
      <NavigationProgress />

      {/* Sidebar — desktop only (mouse/pointer: fine), collapsible */}
      {isDesktop && (
        <div style={{ height: "100%" }}>
          <Sidebar
            email={user.email}
            isAdmin={isAdmin}
            tier={tier}
            creditsRemaining={creditsRemaining}
            creditGrantsGiven={creditGrantsGiven}
            dark={dark}
            toggleDark={toggleDark}
            collapsed={sidebarCollapsed}
            onToggle={toggleSidebar}
            referralCode={referralCode}
          />
        </div>
      )}

      {/* Right pane */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar — shows on mobile/tablet and on desktop when sidebar is collapsed */}
        {showTopBar && <TopBar />}

        <main
          style={{
            flex: 1,
            overflow: "auto",
            background: "var(--background)",
            padding: 32,
            paddingBottom: !isDesktop ? 80 : 32,
          }}
        >
          {children}
        </main>
      </div>

      {/* Bottom nav — mobile/tablet only (touch devices) */}
      {!isDesktop && <MobileNav />}
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
function ExploreIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
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
function CollapseIcon({ collapsed, size = 14 }: { collapsed: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {collapsed
        ? <path d="M9 18l6-6-6-6"/>
        : <path d="M15 18l-6-6 6-6"/>
      }
    </svg>
  );
}
