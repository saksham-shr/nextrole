"use client";

import Link from "next/link";
import { useState } from "react";

const ACTIONS: Array<{
  key: string;
  label: string;
  credits: number;
  href: string;
  cta: string;
}> = [
  { key: "signup",            label: "Create your account",      credits: 10, href: "/dashboard/profile",   cta: "Done" },
  { key: "cv_upload",         label: "Upload your CV",           credits: 20, href: "/dashboard/profile",   cta: "Upload →" },
  { key: "profile_complete",  label: "Complete your profile",    credits: 15, href: "/dashboard/profile",   cta: "Profile →" },
  { key: "work_experience",   label: "Add work experience",      credits: 10, href: "/dashboard/profile",   cta: "Profile →" },
  { key: "extension_connect", label: "Connect the extension",    credits: 25, href: "/connect-extension",   cta: "Install →" },
  { key: "first_job",         label: "Track your first job",     credits: 10, href: "/dashboard/pipeline",  cta: "Pipeline →" },
  { key: "first_evaluation",  label: "Evaluate your first job",  credits: 10, href: "/dashboard/evaluate",  cta: "Evaluate →" },
];

const TOTAL_EARNABLE = ACTIONS.reduce((s, a) => s + a.credits, 0);

export function CreditsEarnTracker({
  creditGrantsGiven,
}: {
  creditGrantsGiven: Record<string, boolean>;
}) {
  const [open, setOpen] = useState(true);

  const earned = ACTIONS.filter(a => creditGrantsGiven[a.key]).reduce((s, a) => s + a.credits, 0);
  const pct = Math.round((earned / TOTAL_EARNABLE) * 100);
  const allDone = earned >= TOTAL_EARNABLE;

  return (
    <div className="nr-card" style={{ marginBottom: 16, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          width: "100%", padding: "14px 20px", textAlign: "left",
          background: "none", border: "none", cursor: "pointer",
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
            Earn free credits
          </div>
          <div className="nr-small">{earned} / {TOTAL_EARNABLE} credits earned</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 100, height: 4, borderRadius: 4, background: "var(--line-soft)", overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "var(--ok)", borderRadius: 4, transition: "width 0.4s" }} />
          </div>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="2"
            style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid var(--line-softer)" }}>
          {ACTIONS.map((action, i) => {
            const done = !!creditGrantsGiven[action.key];
            return (
              <div
                key={action.key}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 20px",
                  borderBottom: i < ACTIONS.length - 1 ? "1px solid var(--line-softer)" : undefined,
                  opacity: done ? 0.6 : 1,
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: done ? "var(--ok)" : "var(--surface-soft)",
                  border: done ? "none" : "1px solid var(--line-soft)",
                }}>
                  {done && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 13 l4 4 L19 7" />
                    </svg>
                  )}
                </div>
                <span style={{ flex: 1, fontSize: 13 }}>{action.label}</span>
                <span className="nr-small" style={{
                  fontFamily: "var(--font-mono-stack)",
                  color: done ? "var(--ok)" : "var(--muted-foreground)",
                }}>
                  +{action.credits} cr
                </span>
                {!done && action.key !== "signup" && (
                  <Link
                    href={action.href}
                    style={{
                      fontSize: 12, color: "var(--accent)", textDecoration: "none",
                      fontFamily: "var(--font-mono-stack)",
                    }}
                  >
                    {action.cta}
                  </Link>
                )}
              </div>
            );
          })}

          {allDone && (
            <div style={{ padding: "14px 20px", background: "var(--accent-soft)", textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)", marginBottom: 4 }}>
                All free credits earned!
              </div>
              <div className="nr-small" style={{ marginBottom: 10 }}>
                Upgrade for 100–300 credits refreshed daily.
              </div>
              <Link href="/dashboard/billing" className="nr-btn nr-btn-accent nr-btn-sm" style={{ textDecoration: "none" }}>
                Upgrade now →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
