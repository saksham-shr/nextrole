"use client";

import Link from "next/link";
import { CREDIT_COSTS, DAILY_CREDITS, FREE_DAILY_LIMITS } from "@/lib/ai/gates";

type AttentionItem = {
  title: string;
  body: string;
  href: string;
  tone: "warn" | "default";
};

type TaskRun = {
  id: string;
  type: string;
  status: string;
  progress_message: string | null;
  error: string | null;
  created_at: string;
};

type TopJob = {
  id: string;
  title: string;
  company: string;
  score: number | null;
  status: string;
};

const STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  completed: { bg: "var(--ok-bg)",   fg: "var(--ok)" },
  failed:    { bg: "var(--bad-bg)",  fg: "var(--bad)" },
  running:   { bg: "var(--warn-bg)", fg: "var(--warn)" },
  queued:    { bg: "var(--accent-bg)", fg: "var(--accent)" },
};

const STATUS_BADGE: Record<string, string> = {
  saved:     "Saved",
  applied:   "Applied",
  interview: "Interview",
  offer:     "Offer",
  skip:      "Skip",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function greeting(name: string): string {
  const h = new Date().getHours();
  const salutation = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${salutation}, ${name}.`;
}

function dateLabel(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

// Score pill matching design reference
function ScorePill({ score }: { score: number }) {
  const isHigh = score >= 4;
  const isMid = score >= 3;
  return (
    <span
      className="inline-flex items-center justify-center rounded-[4px] border"
      style={{
        fontFamily: "var(--font-mono-stack)",
        fontSize: 12,
        fontWeight: 500,
        width: 26,
        height: 22,
        background: isHigh ? "var(--ok-bg)" : isMid ? "var(--warn-bg)" : "var(--bad-bg)",
        color: isHigh ? "var(--ok)" : isMid ? "var(--warn)" : "var(--bad)",
        borderColor: isHigh ? "rgba(47,122,58,0.2)" : isMid ? "rgba(176,122,24,0.2)" : "rgba(181,58,58,0.2)",
      }}
    >
      {score}
    </span>
  );
}

// Company logo placeholder
function CompanyLogo({ name, size = 28 }: { name: string; size?: number }) {
  const initial = (name || "?").charAt(0);
  const colors = [
    { bg: "rgba(31,78,200,0.1)", fg: "#1f4ec8" },
    { bg: "rgba(47,122,58,0.1)", fg: "#2f7a3a" },
    { bg: "rgba(176,115,19,0.1)", fg: "#b07313" },
    { bg: "rgba(200,74,31,0.1)", fg: "#c84a1f" },
    { bg: "rgba(106,99,88,0.12)", fg: "#6b6358" },
    { bg: "rgba(136,80,180,0.1)", fg: "#7140a3" },
  ];
  const c = colors[(name || "").charCodeAt(0) % colors.length];
  return (
    <div
      className="inline-flex shrink-0 items-center justify-center"
      style={{
        width: size, height: size,
        borderRadius: Math.round(size * 0.18),
        background: c.bg, color: c.fg,
        fontFamily: "var(--font-mono-stack)",
        fontWeight: 500,
        fontSize: Math.round(size * 0.42),
        border: `1px solid ${c.fg}33`,
      }}
    >
      {initial}
    </div>
  );
}

type SetupStep = {
  label: string;
  description: string;
  href: string;
  done: boolean;
  active?: boolean;
};

function SetupChecklist({ steps }: { steps: SetupStep[] }) {
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  return (
    <div
      className="rounded-[8px] border border-[var(--line-soft)] bg-[var(--surface)]"
      style={{ padding: 20 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <div
            className="uppercase text-[var(--accent)]"
            style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10, letterSpacing: "0.12em", marginBottom: 4 }}
          >
            · Setup · {doneCount} of {steps.length}
          </div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Finish setting up to unlock AI features</div>
        </div>
        <span
          className="text-[var(--muted-foreground)]"
          style={{ fontFamily: "var(--font-mono-stack)", fontSize: 12 }}
        >
          {Math.round((doneCount / steps.length) * 100)}% complete
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {steps.map((step, i) => {
          const isActive = !step.done && steps.slice(0, i).every((s) => s.done);
          return (
            <a
              key={step.label}
              href={step.done ? undefined : step.href}
              className="block rounded-[6px] p-3 transition"
              style={{
                border: `1px solid ${isActive ? "var(--accent)" : "var(--line-soft)"}`,
                background: step.done ? "var(--background)" : isActive ? "var(--accent-bg)" : "var(--background)",
                cursor: step.done ? "default" : "pointer",
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="inline-flex shrink-0 items-center justify-center"
                  style={{
                    width: 16, height: 16, borderRadius: 4,
                    background: step.done ? "var(--ok)" : "transparent",
                    border: `1px solid ${step.done ? "var(--ok)" : "var(--line-soft)"}`,
                  }}
                >
                  {step.done && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5L20 7"/>
                    </svg>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 13,
                    color: step.done ? "var(--muted-foreground)" : "var(--foreground)",
                    textDecoration: step.done ? "line-through" : "none",
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  {step.label}
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

type PlanTier = "free" | "starter" | "pro";

function PlanBadge({ tier }: { tier: PlanTier }) {
  const STYLES: Record<string, { bg: string; badgeBg: string; badgeColor: string; border: string }> = {
    free:    { bg: "var(--accent-soft)", badgeBg: "var(--accent-soft)", badgeColor: "var(--accent)", border: "rgba(200,74,31,0.2)" },
    starter: { bg: "var(--surface)",     badgeBg: "rgba(31,78,200,0.08)", badgeColor: "#1f4ec8",       border: "var(--line-soft)" },
    pro:     { bg: "var(--surface)",     badgeBg: "var(--accent)",        badgeColor: "var(--surface)", border: "var(--line-soft)" },
    team:    { bg: "var(--surface)",     badgeBg: "var(--accent)",        badgeColor: "var(--surface)", border: "var(--line-soft)" },
    byok:    { bg: "var(--surface)",     badgeBg: "var(--accent)",        badgeColor: "var(--surface)", border: "var(--line-soft)" },
  };
  const s = STYLES[tier] ?? STYLES.free;
  const isPaid = tier !== "free";
  const label = tier === "pro" ? "★ PRO" : tier.toUpperCase();
  const desc = tier === "free" ? "Limited daily use" : tier === "starter" ? "100 credits / day" : "Everything unlocked";

  return (
    <div
      className="rounded-[8px] border flex items-center justify-between gap-2"
      style={{ padding: "12px 14px", background: s.bg, borderColor: s.border }}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center rounded-[4px] px-2 py-[3px] uppercase"
          style={{
            fontFamily: "var(--font-mono-stack)", fontSize: 10, fontWeight: 500,
            letterSpacing: "0.08em", background: s.badgeBg, color: s.badgeColor,
            border: `1px solid ${s.border}`,
          }}
        >
          {label}
        </span>
        <span className="text-[12.5px] text-[var(--muted-foreground)]">{desc}</span>
      </div>
      {!isPaid && (
        <Link href="/dashboard/billing" className="text-[12px] font-medium text-[var(--accent)] hover:underline">
          Upgrade →
        </Link>
      )}
    </div>
  );
}

function CostRow({ icon, label, cost, locked }: { icon: string; label: string; cost: string; locked?: boolean }) {
  const iconSvg = (name: string) => {
    const p = { width: 12, height: 12, viewBox: "0 0 24 24", fill: "none" as const, stroke: locked ? "var(--muted-foreground)" : "var(--muted-foreground)", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
    switch (name) {
      case "sparkle": return <svg {...p}><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M6.3 17.7l2.8-2.8M14.9 9.1l2.8-2.8"/></svg>;
      case "doc":     return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h4"/></svg>;
      case "bolt":    return <svg {...p}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>;
      case "lock":    return <svg {...p}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
      default:        return null;
    }
  };
  return (
    <div className="flex items-center justify-between" style={{ color: locked ? "var(--muted-foreground)" : "var(--foreground)" }}>
      <span className="flex items-center gap-2 text-[12.5px]">
        {iconSvg(icon)}
        {label}
      </span>
      <span style={{ fontFamily: "var(--font-mono-stack)", fontSize: 11, color: "var(--muted-foreground)" }}>
        {cost}
      </span>
    </div>
  );
}

function LimitBar({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  return (
    <div className="h-[6px] w-full overflow-hidden rounded-full" style={{ background: "var(--line-soft)" }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "var(--accent)" }} />
    </div>
  );
}

function minutesUntilMidnight(): string {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const ms = midnight.getTime() - now.getTime();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

function CreditsWidget({ tier, creditsRemaining }: { tier: PlanTier; creditsRemaining: number }) {
  const dailyTotal = DAILY_CREDITS[tier] ?? 0;
  const creditsUsed = Math.max(0, dailyTotal - creditsRemaining);
  const isLow = dailyTotal > 0 && creditsRemaining <= dailyTotal * 0.2;

  if (tier === "free") {
    return (
      <div className="rounded-[8px] border border-[var(--line-soft)] bg-[var(--surface)]" style={{ padding: 18 }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div
              className="uppercase text-[var(--muted-foreground)] mb-1"
              style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10, letterSpacing: "0.1em" }}
            >
              Free plan · daily limits
            </div>
            <div className="text-[13px] text-[var(--muted-foreground)]">
              {FREE_DAILY_LIMITS.evaluations} evaluations · {FREE_DAILY_LIMITS.resumes} resume per day
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            { label: "Evaluations", total: FREE_DAILY_LIMITS.evaluations },
            { label: "Resumes", total: FREE_DAILY_LIMITS.resumes },
          ].map(({ label, total }) => (
            <div key={label} className="rounded-[6px]" style={{ padding: 10, background: "var(--background)" }}>
              <div
                className="uppercase text-[var(--muted-foreground)] mb-1"
                style={{ fontFamily: "var(--font-mono-stack)", fontSize: 9, letterSpacing: "0.1em" }}
              >
                {label}
              </div>
              <div className="flex items-baseline gap-1">
                <span style={{ fontFamily: "var(--font-mono-stack)", fontSize: 18, fontWeight: 500 }}>{total}</span>
                <span className="text-[11.5px] text-[var(--muted-foreground)]">/ {total} today</span>
              </div>
            </div>
          ))}
        </div>
        <div className="h-px bg-[var(--line-soft)] mb-3" />
        <Link
          href="/dashboard/billing"
          className="flex w-full items-center justify-center gap-1.5 rounded-[6px] bg-[var(--accent)] px-3 py-2 text-[13px] font-medium text-[#fffdf8] transition hover:bg-[var(--accent-hover)]"
        >
          Upgrade for daily credits →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-[8px] border border-[var(--line-soft)] bg-[var(--surface)]" style={{ padding: 18 }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div
            className="uppercase text-[var(--muted-foreground)] mb-1"
            style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10, letterSpacing: "0.1em" }}
          >
            Daily credits
          </div>
          <div className="flex items-baseline gap-1.5">
            <span style={{ fontFamily: "var(--font-mono-stack)", fontSize: 22, fontWeight: 500 }}>{creditsRemaining}</span>
            <span className="text-[13px] text-[var(--muted-foreground)]">/ {dailyTotal} remaining</span>
          </div>
        </div>
        <span
          className="inline-flex items-center rounded-[4px] px-2 py-[3px] uppercase"
          style={{
            fontFamily: "var(--font-mono-stack)", fontSize: 10, fontWeight: 500, letterSpacing: "0.08em",
            background: tier === "pro" ? "var(--accent-soft)" : "rgba(31,78,200,0.08)",
            color: tier === "pro" ? "var(--accent)" : "#1f4ec8",
            border: `1px solid ${tier === "pro" ? "rgba(200,74,31,0.2)" : "rgba(31,78,200,0.18)"}`,
          }}
        >
          {tier.toUpperCase()}
        </span>
      </div>
      <LimitBar used={creditsUsed} total={dailyTotal} />
      <div className="mt-2 text-[12px] text-[var(--muted-foreground)]">
        Resets at midnight · {minutesUntilMidnight()}
      </div>
      {isLow && (
        <Link
          href="/dashboard/billing#topup"
          className="mt-2.5 flex items-center justify-between rounded-[6px] px-3 py-2 text-[12px] font-medium transition"
          style={{
            background: "rgba(220,38,38,0.07)",
            border: "1px solid rgba(220,38,38,0.25)",
            color: "#dc2626",
          }}
        >
          <span>Low on credits — top up</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </Link>
      )}
      <div className="mt-3 mb-3 h-px bg-[var(--line-soft)]" />
      <div className="flex flex-col gap-2">
        <CostRow icon="sparkle" label="AI evaluation" cost={`${CREDIT_COSTS.evaluate} credits`} />
        <CostRow icon="doc" label="Custom resume" cost={`${CREDIT_COSTS.resume_standard} credits`} />
        <CostRow
          icon="bolt"
          label={tier === "pro" ? "Autofill (unlimited)" : "Autofill basic fields"}
          cost={tier === "pro" ? `${CREDIT_COSTS.autofill} · plan` : "1 / day"}
        />
        {tier === "starter" && (
          <CostRow icon="lock" label="Direct resume upload" cost="Pro" locked />
        )}
      </div>
      {tier === "starter" && (
        <>
          <div className="h-px bg-[var(--line-soft)] my-3" />
          <div className="rounded-[6px] border p-3" style={{ background: "var(--accent-soft)", borderColor: "rgba(200,74,31,0.2)" }}>
            <div className="text-[12.5px] leading-[1.5] text-[var(--foreground)] mb-2">
              Pro fills all fields including cover letters and uploads your resume to the form.
            </div>
            <Link
              href="/dashboard/billing"
              className="flex w-full items-center justify-center rounded-[6px] bg-[var(--accent)] px-3 py-1.5 text-[12px] font-medium text-[#fffdf8] transition hover:bg-[var(--accent-hover)]"
            >
              See Pro features →
            </Link>
          </div>
        </>
      )}
      {tier === "pro" && (
        <>
          <div className="h-px bg-[var(--line-soft)] my-3" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase text-[var(--muted-foreground)]" style={{ fontFamily: "var(--font-mono-stack)", letterSpacing: "0.1em" }}>Top-up credits</span>
            <Link href="/dashboard/billing" className="text-[11px] text-[var(--accent)] hover:underline" style={{ fontFamily: "var(--font-mono-stack)" }}>Manage →</Link>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {([["100", "₹99"], ["300", "₹249"]] as const).map(([credits, price]) => (
              <Link
                key={credits}
                href="/dashboard/billing#topup"
                className="flex flex-col items-center rounded-[5px] border border-[var(--line-soft)] py-2 px-1 text-center transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
              >
                <span style={{ fontFamily: "var(--font-mono-stack)", fontSize: 14, fontWeight: 500 }}>{credits}</span>
                <span className="text-[10.5px] text-[var(--muted-foreground)]">credits</span>
                <span className="text-[10px] text-[var(--accent)] mt-0.5">{price}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const QUICK_ACTIONS = [
  {
    icon: "extension",
    title: "Browse with extension",
    desc: "Open a job board and let NextRole detect postings.",
    cta: "Get extension →",
    href: "https://chrome.google.com/webstore",
  },
  {
    icon: "sparkle",
    title: "Evaluate a job",
    desc: "Paste a URL or pick from your pipeline to score fit.",
    cta: "Start evaluation →",
    href: "/dashboard/evaluate",
  },
  {
    icon: "doc",
    title: "Tailor your resume",
    desc: "Generate a job-specific resume from your CV.",
    cta: "Open resume →",
    href: "/dashboard/profile",
  },
] as const;

function QuickActionIcon({ name }: { name: string }) {
  const p = { width: 17, height: 17, viewBox: "0 0 24 24", fill: "none" as const, stroke: "currentColor" as const, strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "extension": return <svg {...p}><path d="M5 5h6V3a2 2 0 0 1 4 0v2h4a2 2 0 0 1 2 2v4h-2a2 2 0 0 0 0 4h2v4a2 2 0 0 1-2 2h-4v-2a2 2 0 0 0-4 0v2H5a2 2 0 0 1-2-2v-4h2a2 2 0 0 0 0-4H3V7a2 2 0 0 1 2-2z"/></svg>;
    case "sparkle": return <svg {...p}><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M6.3 17.7l2.8-2.8M14.9 9.1l2.8-2.8"/></svg>;
    case "doc": return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h4"/></svg>;
    default: return null;
  }
}

export function DashboardHome({
  userName,
  hasCV,
  hasProvider: _hasProvider,
  hasJobs,
  tier = "free",
  creditsRemaining = 0,
  kpis,
  attentionItems,
  topJobs,
  recentRuns,
}: {
  userName: string;
  hasCV: boolean;
  hasProvider: boolean;
  hasJobs: boolean;
  tier?: PlanTier;
  creditsRemaining?: number;
  kpis: {
    active: number;
    interviews: number;
    offers: number;
    highScore: number;
    pending: number;
  };
  attentionItems: AttentionItem[];
  topJobs: TopJob[];
  recentRuns: TaskRun[];
}) {
  const setupSteps: SetupStep[] = [
    {
      label: "Install extension",
      description: "Add NextRole to Chrome in one click.",
      href: "https://chrome.google.com/webstore",
      done: false,
    },
    {
      label: "Add your CV",
      description: "Paste your base CV for AI evaluations.",
      href: "/dashboard/profile",
      done: hasCV,
    },
    {
      label: "Choose a plan",
      description: "Unlock daily AI credits on Starter or Pro.",
      href: "/dashboard/billing",
      done: _hasProvider,
    },
    {
      label: "Evaluate first job",
      description: "Score your first role for fit.",
      href: "/dashboard/evaluate",
      done: kpis.active > 0,
    },
  ];

  return (
    <div
      className="mx-auto"
      style={{
        maxWidth: 1280,
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 320px",
        gap: 24,
        alignItems: "start",
      }}
    >
      {/* ── Main column ── */}
      <div className="space-y-6 min-w-0">

      {/* ── Greeting row ── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div
            className="uppercase text-[var(--muted-foreground)]"
            style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10, letterSpacing: "0.12em", marginBottom: 6 }}
          >
            {dateLabel()}
          </div>
          <h1 style={{ fontSize: 26, letterSpacing: "-0.02em", fontWeight: 600, lineHeight: 1.2 }}>
            {greeting(userName)}
          </h1>
        </div>
        <span
          className="text-[var(--muted-foreground)]"
          style={{ fontFamily: "var(--font-mono-stack)", fontSize: 12 }}
        >
          {kpis.active} active · {kpis.interviews} interview{kpis.interviews !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Jobs saved", value: kpis.active,     sub: `${kpis.pending} to triage` },
          { label: "Applied",    value: kpis.offers,      sub: "tracked" },
          { label: "Interviews", value: kpis.interviews,  sub: "in flight" },
          { label: "Best fit",   value: kpis.highScore > 0 ? `${kpis.highScore}/5` : "—", sub: "top score" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-[8px] border border-[var(--line-soft)] bg-[var(--surface)]"
            style={{ padding: 16 }}
          >
            <div
              className="uppercase text-[var(--muted-foreground)]"
              style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10, letterSpacing: "0.12em", marginBottom: 10 }}
            >
              {s.label}
            </div>
            <div style={{ fontFamily: "var(--font-mono-stack)", fontSize: 28, fontWeight: 500, lineHeight: 1 }}>
              {s.value}
            </div>
            <div className="mt-1 text-[12px] text-[var(--muted-foreground)]">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Setup checklist ── */}
      <SetupChecklist steps={setupSteps} />

      {/* ── Attention items ── */}
      {attentionItems.length > 0 && (
        <div className="rounded-[8px] border border-[var(--line-soft)] bg-[var(--surface)]" style={{ padding: 20 }}>
          <div
            className="uppercase text-[var(--muted-foreground)] mb-4"
            style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10, letterSpacing: "0.12em" }}
          >
            Needs attention
          </div>
          <div className="space-y-3">
            {attentionItems.map((item) => (
              <div
                key={item.title}
                className="flex flex-wrap items-start justify-between gap-3 rounded-[6px] border border-[var(--line-soft)] bg-[var(--background)] p-3"
              >
                <div>
                  <p className="text-[14px] font-medium">{item.title}</p>
                  <p className="mt-0.5 text-[12.5px] text-[var(--muted-foreground)]">{item.body}</p>
                </div>
                <Link
                  href={item.href}
                  className="text-[12px] text-[var(--accent)] hover:underline"
                  style={{ fontFamily: "var(--font-mono-stack)" }}
                >
                  Open →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Quick actions ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <span
            className="uppercase text-[var(--muted-foreground)]"
            style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10, letterSpacing: "0.12em" }}
          >
            01
          </span>
          <span
            className="uppercase text-[var(--muted-foreground)]"
            style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10, letterSpacing: "0.12em" }}
          >
            Quick actions
          </span>
          <div className="flex-1 h-px bg-[var(--line-soft)]" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="block rounded-[8px] border border-[var(--line-soft)] bg-[var(--surface)] transition hover:border-[var(--line)]"
              style={{ padding: 20 }}
            >
              <div
                className="inline-flex items-center justify-center rounded-[6px] mb-4"
                style={{
                  width: 36, height: 36,
                  background: "var(--accent-bg)",
                  color: "var(--accent)",
                }}
              >
                <QuickActionIcon name={a.icon} />
              </div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{a.title}</div>
              <div className="text-[13px] text-[var(--muted-foreground)] leading-[1.55] mb-4">{a.desc}</div>
              <div className="text-[12.5px] font-medium text-[var(--accent)]">{a.cta}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Recent activity ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <span
            className="uppercase text-[var(--muted-foreground)]"
            style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10, letterSpacing: "0.12em" }}
          >
            02
          </span>
          <span
            className="uppercase text-[var(--muted-foreground)]"
            style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10, letterSpacing: "0.12em" }}
          >
            Recent activity
          </span>
          <div className="flex-1 h-px bg-[var(--line-soft)]" />
          <Link
            href="/dashboard/pipeline"
            className="text-[var(--accent)] hover:underline"
            style={{ fontFamily: "var(--font-mono-stack)", fontSize: 11 }}
          >
            View all →
          </Link>
        </div>

        {topJobs.length === 0 && recentRuns.length === 0 ? (
          <div
            className="nr-stripes rounded-[8px] border border-dashed border-[var(--line-soft)] text-center"
            style={{ padding: 48 }}
          >
            <p className="text-[14px] text-[var(--muted-foreground)] mb-4">No activity yet — add your first job to get started.</p>
            <div className="flex justify-center gap-2">
              <Link
                href="/dashboard/pipeline"
                className="inline-flex items-center gap-1.5 rounded-[6px] bg-[var(--accent)] px-3 py-2 text-[13px] font-medium text-[#fffdf8] transition hover:bg-[var(--accent-hover)]"
              >
                + Add job
              </Link>
              <Link
                href="/dashboard/evaluate"
                className="inline-flex items-center gap-1.5 rounded-[6px] border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--foreground)] transition hover:border-[var(--line)]"
              >
                Evaluate a job
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-[8px] border border-[var(--line-soft)] bg-[var(--surface)] overflow-hidden">
            {topJobs.slice(0, 5).map((job, i) => (
              <Link
                key={job.id}
                href="/dashboard/pipeline"
                className="grid items-center gap-4 transition"
                style={{
                  gridTemplateColumns: "32px 1fr 100px 100px 24px",
                  padding: "14px 18px",
                  borderTop: i === 0 ? "none" : "1px solid var(--line-soft)",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-soft)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <CompanyLogo name={job.company} size={28} />
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{job.title}</div>
                  <div className="text-[12.5px] text-[var(--muted-foreground)]">{job.company}</div>
                </div>
                {job.score !== null ? (
                  <ScorePill score={job.score} />
                ) : (
                  <span />
                )}
                <span
                  className="inline-flex items-center rounded-[4px] px-2 py-0.5 text-[10.5px] font-medium uppercase"
                  style={{
                    fontFamily: "var(--font-mono-stack)",
                    letterSpacing: "0.08em",
                    background: "rgba(42,38,32,0.06)",
                    color: "var(--muted-foreground)",
                    border: "1px solid var(--line-softer)",
                  }}
                >
                  {STATUS_BADGE[job.status] ?? job.status}
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 6l6 6-6 6"/>
                </svg>
              </Link>
            ))}

            {/* Recent task runs */}
            {recentRuns.slice(0, 3).map((run, i) => {
              const col = STATUS_COLOR[run.status] ?? { bg: "var(--accent-bg)", fg: "var(--accent)" };
              return (
                <div
                  key={run.id}
                  className="flex items-center gap-3"
                  style={{
                    padding: "12px 18px",
                    borderTop: "1px solid var(--line-soft)",
                  }}
                >
                  <span
                    className="inline-flex items-center rounded-[4px] px-2 py-0.5 text-[10.5px] uppercase"
                    style={{
                      fontFamily: "var(--font-mono-stack)",
                      letterSpacing: "0.08em",
                      background: col.bg,
                      color: col.fg,
                    }}
                  >
                    {run.status}
                  </span>
                  <span className="flex-1 text-[13px] text-[var(--muted-foreground)]">
                    {run.error ?? run.progress_message ?? run.type}
                  </span>
                  <span
                    className="shrink-0 text-[var(--muted-foreground)]"
                    style={{ fontFamily: "var(--font-mono-stack)", fontSize: 11 }}
                  >
                    {timeAgo(run.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>{/* end main column */}

      {/* ── Right rail ── */}
      <div className="hidden lg:flex flex-col gap-3 sticky top-0">
        <PlanBadge tier={tier} />
        <CreditsWidget tier={tier} creditsRemaining={creditsRemaining} />
      </div>
    </div>
  );
}
