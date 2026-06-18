"use client";

import Link from "next/link";
import { useState } from "react";
import { CreditsEarnTracker } from "@/components/nextrole/credits-earn-tracker";

type TopJob = {
  id: string;
  title: string;
  company: string;
  score: number | null;
  status: string;
};

const SCORE_CLASS = (score: number | null) => {
  if (!score) return "nr-pill-soft";
  if (score >= 70) return "nr-score-good";
  if (score >= 45) return "nr-score-mid";
  return "nr-score-bad";
};

// Normalize score — DB stores 0-5, design shows 0-100
function normalizeScore(score: number | null): number | null {
  if (score === null) return null;
  // If already in 0-100 range
  if (score > 10) return Math.round(score);
  // Convert from 0-5 scale
  return Math.round(score * 20);
}

const STATUS_PILL: Record<string, string> = {
  evaluated: "nr-pill-soft",
  applied:   "nr-pill-accent",
  interview: "nr-pill-warning",
  offer:     "nr-pill-success",
  ghosted:   "nr-pill-soft",
  rejected:  "nr-pill-danger",
  saved:     "nr-pill-soft",
  pending:   "nr-pill-soft",
};

function dateLabel() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function CompanyFavicon({ name, size = 22 }: { name: string; size?: number }) {
  const colors = [
    "#1f4ec8", "#2f7a3a", "#b07313", "#c84a1f", "#6b6358", "#7140a3",
  ];
  const bg = colors[(name || "").charCodeAt(0) % colors.length];
  const initial = (name || "?").charAt(0).toUpperCase();
  const r = Math.round(size * 0.18);
  return (
    <div style={{
      width: size, height: size, borderRadius: r,
      background: `${bg}18`, color: bg,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-mono-stack)", fontWeight: 600,
      fontSize: Math.round(size * 0.42),
      border: `1px solid ${bg}33`,
      flexShrink: 0,
    }}>
      {initial}
    </div>
  );
}

export function DashboardHome({
  userName,
  hasCV,
  hasProvider: _hasProvider,
  hasJobs,
  tier = "free",
  creditsRemaining = 0,
  kpis,
  attentionItems: _attentionItems,
  topJobs,
  creditGrantsGiven = {},
}: {
  userName: string;
  hasCV: boolean;
  hasProvider: boolean;
  hasJobs: boolean;
  tier?: "free" | "starter" | "pro";
  creditsRemaining?: number;
  kpis: {
    active: number;
    interviews: number;
    offers: number;
    highScore: number;
    pending: number;
  };
  attentionItems: Array<{ title: string; body: string; href: string; tone: "warn" | "default" }>;
  topJobs: TopJob[];
  creditGrantsGiven?: Record<string, boolean>;
}) {
  const [creditsOpen, setCreditsOpen] = useState(false);
  const dailyMax = tier === "pro" ? 300 : tier === "starter" ? 100 : 0;
  const creditPct = dailyMax > 0 ? Math.min(100, (creditsRemaining / dailyMax) * 100) : 0;
  const isEmpty = !hasJobs;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <header style={{ display: "flex", alignItems: "baseline", marginBottom: 24 }}>
        <h1 className="nr-display" style={{ fontSize: 26 }}>Welcome back, {userName}</h1>
        <span className="nr-small" style={{ marginLeft: "auto" }} suppressHydrationWarning>{dateLabel()}</span>
      </header>

      {/* Upgrade banner — free tier only */}
      {tier === "free" && (
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "11px 16px", marginBottom: 20,
          background: "var(--accent-soft)", border: "1px solid var(--accent-border)",
          borderRadius: 8,
        }}>
          <div style={{ flex: 1, fontSize: 13 }}>
            You&apos;re on the free plan — earn up to 100 credits via profile actions, or upgrade for 100–300 credits/day.
          </div>
          <Link href="/dashboard/billing" style={{
            flexShrink: 0, fontSize: 13, fontWeight: 600,
            color: "var(--accent)", textDecoration: "none", whiteSpace: "nowrap",
          }}>
            Upgrade →
          </Link>
        </div>
      )}

      {/* Extension nudge — only for new users */}
      {isEmpty && (
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "12px 16px", marginBottom: 24,
          background: "var(--warning-surface)", border: "1px solid var(--warning-border)",
          borderRadius: 8,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 6, background: "var(--warning-bg)", color: "var(--warn)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 5h6V3a2 2 0 0 1 4 0v2h4a2 2 0 0 1 2 2v4h-2a2 2 0 0 0 0 4h2v4a2 2 0 0 1-2 2h-4v-2a2 2 0 0 0-4 0v2H5a2 2 0 0 1-2-2v-4h2a2 2 0 0 0 0-4H3V7a2 2 0 0 1 2-2z"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Get 10× faster — install the NextRole extension</div>
            <div className="nr-small">Autofill applications on Greenhouse, Lever, Ashby, Workday, and more.</div>
          </div>
          <Link href="/connect-extension" className="nr-btn nr-btn-ghost nr-btn-sm" style={{ textDecoration: "none" }}>
            Install
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
        <div className="nr-card" style={{ padding: 20 }}>
          <div className="nr-label" style={{ marginBottom: 8 }}>Jobs evaluated</div>
          <div className="nr-display" style={{ fontSize: 36, marginBottom: 4 }}>{kpis.active}</div>
          <div className="nr-small">this month</div>
        </div>
        <div className="nr-card" style={{ padding: 20 }}>
          <div className="nr-label" style={{ marginBottom: 8 }}>Applications sent</div>
          <div className="nr-display" style={{ fontSize: 36, marginBottom: 4 }}>{kpis.offers + kpis.interviews}</div>
          <div className="nr-small">this month</div>
        </div>
        <div className="nr-card" style={{ padding: 20 }}>
          <div className="nr-label" style={{ marginBottom: 8 }}>Credits remaining</div>
          {tier === "free" ? (
            <>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
                <span className="nr-display" style={{ fontSize: 36 }}>{creditsRemaining}</span>
                <span className="nr-pill nr-pill-soft" style={{ fontSize: 11 }}>Free</span>
              </div>
              <div className="nr-small" style={{ marginBottom: 6 }}>Earn up to 100 cr via actions</div>
              <Link href="/dashboard/billing" style={{ fontSize: 13, color: "var(--accent)" }}>Upgrade for daily credits →</Link>
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
                <span className="nr-display" style={{ fontSize: 36 }}>{creditsRemaining}</span>
                <span className="nr-pill nr-pill-accent" style={{ fontSize: 11 }}>{tier === "pro" ? "Pro" : "Starter"}</span>
              </div>
              <div className="nr-progress" style={{ marginBottom: 8 }}>
                <div style={{ width: `${creditPct}%` }} />
              </div>
              <div className="nr-small">{creditsRemaining} / {dailyMax} remaining today</div>
            </>
          )}
        </div>
      </div>

      {/* Recent evaluations */}
      <div className="nr-card" style={{ padding: 0, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", padding: "16px 20px" }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Recent Activity</div>
          <Link href="/dashboard/pipeline" style={{ marginLeft: "auto", fontSize: 13, color: "var(--accent)", textDecoration: "none" }}>
            View all →
          </Link>
        </div>
        {topJobs.length === 0 ? (
          <div style={{ borderTop: "1px solid var(--line-softer)", padding: "48px 24px", textAlign: "center" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px" }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6M8 11h6"/>
            </svg>
            <div style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 12 }}>No evaluations yet</div>
            <Link href="/dashboard/evaluate" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none" }}>
              Evaluate your first job →
            </Link>
          </div>
        ) : (
          <table className="nr-table" style={{ borderTop: "1px solid var(--line-softer)" }}>
            <thead>
              <tr>
                <th style={{ paddingLeft: 20 }}>Company</th>
                <th>Role</th>
                <th style={{ width: 90 }}>Score</th>
                <th style={{ width: 110 }}>Status</th>
                <th style={{ width: 60, paddingRight: 20 }}></th>
              </tr>
            </thead>
            <tbody>
              {topJobs.map((job) => {
                const displayScore = normalizeScore(job.score);
                return (
                  <tr key={job.id}>
                    <td style={{ paddingLeft: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <CompanyFavicon name={job.company} />
                        <span style={{ fontWeight: 500 }}>{job.company}</span>
                      </div>
                    </td>
                    <td style={{ color: "var(--muted-foreground)" }}>{job.title}</td>
                    <td>
                      {displayScore !== null ? (
                        <span
                          className={`nr-pill ${SCORE_CLASS(displayScore)}`}
                          style={{ fontFamily: "var(--font-mono-stack)", fontWeight: 600 }}
                        >
                          {displayScore}
                        </span>
                      ) : <span className="nr-small">—</span>}
                    </td>
                    <td>
                      <span className={`nr-pill ${STATUS_PILL[job.status] ?? "nr-pill-soft"}`} style={{ textTransform: "capitalize" }}>
                        {job.status}
                      </span>
                    </td>
                    <td style={{ paddingRight: 20 }}>
                      <Link href={`/dashboard/pipeline`} style={{ color: "var(--accent)", textDecoration: "none", fontSize: 13 }}>→</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Earn credits tracker — free tier only */}
      {tier === "free" && (
        <CreditsEarnTracker creditGrantsGiven={creditGrantsGiven} />
      )}

      {/* How credits work — collapsible */}
      <div className="nr-card" style={{ marginBottom: 16, overflow: "hidden" }}>
        <button
          type="button"
          onClick={() => setCreditsOpen(v => !v)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            width: "100%", padding: "13px 20px", textAlign: "left",
            background: "none", border: "none", cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600 }}>How credits work</span>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="2"
            style={{ transform: creditsOpen ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {creditsOpen && (
          <div style={{ borderTop: "1px solid var(--line-softer)", padding: "14px 20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 14 }}>
              {[
                { tier: "Free", desc: "Earn up to 100 credits by completing profile actions. Never resets." },
                { tier: "Starter", desc: "100 credits refreshed daily while your subscription is active." },
                { tier: "Pro", desc: "300 credits refreshed daily + buy top-up packs anytime." },
              ].map(t => (
                <div key={t.tier} style={{ background: "var(--surface-soft)", borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono-stack)", marginBottom: 4 }}>{t.tier}</div>
                  <div className="nr-small">{t.desc}</div>
                </div>
              ))}
            </div>
            <div className="nr-small" style={{ color: "var(--muted-foreground)" }}>
              Credit costs: Evaluate 5 cr · Tailor resume 8 cr · Autofill 2 cr · Standard resume 10 cr
            </div>
          </div>
        )}
      </div>

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="nr-card" style={{ padding: 20 }}>
          <div className="nr-label" style={{ marginBottom: 8 }}>Resume</div>
          {hasCV ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Your base CV is ready</div>
              <div className="nr-small" style={{ marginBottom: 12 }}>Tailor it for a specific role or generate a generic one.</div>
              <Link href="/dashboard/resumes" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none" }}>
                Manage resumes →
              </Link>
            </>
          ) : (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>No CV uploaded yet</div>
              <div className="nr-small" style={{ marginBottom: 12 }}>Upload your CV in Profile to unlock AI evaluation and resume tailoring.</div>
              <Link href="/dashboard/profile" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none" }}>
                Upload CV →
              </Link>
            </>
          )}
        </div>
        <div className="nr-card" style={{ padding: 20 }}>
          <div className="nr-label" style={{ marginBottom: 14 }}>Pipeline</div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {([
              ["Evaluated", kpis.active],
              ["Applied",   kpis.offers + kpis.interviews],
              ["Interview", kpis.interviews],
              ["Offer",     kpis.offers],
            ] as [string, number][]).map(([n, c]) => (
              <div key={n} style={{ textAlign: "center" }}>
                <div className="nr-display" style={{ fontSize: 22 }}>{c}</div>
                <div className="nr-label" style={{ marginTop: 4 }}>{n}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
