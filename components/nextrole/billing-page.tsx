"use client";

import Link from "next/link";
import { useState } from "react";
import type { UserTier } from "@/lib/db/types";
import { useCurrency, INR_PRICES } from "@/lib/hooks/use-currency";
import { TOPUP_PACKS } from "@/lib/ai/gates";

const LS_URLS = {
  starter: process.env.NEXT_PUBLIC_LS_STARTER_URL ?? "",
  pro:     process.env.NEXT_PUBLIC_LS_PRO_URL     ?? "",
};

const VARIANT_IDS = {
  starter_monthly: process.env.NEXT_PUBLIC_LS_STARTER_MONTHLY_ID ?? "",
  starter_yearly:  process.env.NEXT_PUBLIC_LS_STARTER_YEARLY_ID  ?? "",
  pro_monthly:     process.env.NEXT_PUBLIC_LS_PRO_MONTHLY_ID     ?? "",
  pro_yearly:      process.env.NEXT_PUBLIC_LS_PRO_YEARLY_ID      ?? "",
};

function checkoutUrl(plan: "starter" | "pro", period: "monthly" | "yearly", email: string): string | null {
  const base = LS_URLS[plan];
  const id = VARIANT_IDS[`${plan}_${period}`];
  if (!base || !id) return null;
  const emailParam = email ? `&checkout[email]=${encodeURIComponent(email)}` : "";
  return `${base}?variant=${id}${emailParam}`;
}

// ── Icons ──────────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-[2px] shrink-0">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-[2px] shrink-0 opacity-40">
      <rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
    </svg>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────

interface UsageData {
  creditsRemaining: number;
  autofillsToday: number;
  resumesToday: number;
  evaluationsToday: number;
}

interface CreditLogEntry {
  id: string;
  task_type: string;
  credits_used: number;
  created_at: string;
}

interface BillingPageProps {
  tier: UserTier;
  email: string;
  trialEndsAt: string | null;
  subscriptionStatus: string | null;
  renewsAt: string | null;
  usage: UsageData;
  portalUrl?: string | null;
  creditLog?: CreditLogEntry[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function trialDaysLeft(endsAt: string | null): number | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86_400_000);
}

const DAILY_BASE: Record<string, number> = { starter: 100, pro: 300 };
const PLAN_NAME:  Record<string, string>  = { free: "Free", starter: "Starter", pro: "Pro" };

// ── Component ──────────────────────────────────────────────────────────────

const TASK_LABELS: Record<string, string> = {
  evaluate:       "Job evaluation",
  resume_standard:"Standard resume",
  resume_premium: "Premium resume",
  autofill:       "Autofill",
  compare:        "Job comparison",
  interview_prep: "Interview prep",
  cover_letter:   "Cover letter",
  topup:          "Top-up purchase",
};

function taskLabel(type: string) {
  return TASK_LABELS[type] ?? type.replace(/_/g, " ");
}

function CreditLog({ entries }: { entries: CreditLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--surface)] p-6">
        <h3 className="mb-2 text-[14px] font-semibold">Credit usage log</h3>
        <p className="text-[13px] text-[var(--muted-foreground)]">No AI actions recorded yet. Run an evaluation or generate a resume to see activity here.</p>
      </div>
    );
  }

  const totalSpent = entries
    .filter((e) => e.task_type !== "topup")
    .reduce((s, e) => s + e.credits_used, 0);

  return (
    <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--surface)] p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[14px] font-semibold">Credit usage log</h3>
        <span className="font-mono text-[11px] text-[var(--muted-foreground)]">{totalSpent} credits · last {entries.length} actions</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-[var(--line-soft)]">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[var(--line-soft)] bg-[var(--surface-soft)]">
              <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Action</th>
              <th className="px-4 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Credits</th>
              <th className="px-4 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line-soft)]">
            {entries.map((e) => {
              const d = new Date(e.created_at);
              const now = Date.now();
              const diff = now - d.getTime();
              const mins = Math.floor(diff / 60_000);
              const hrs = Math.floor(diff / 3_600_000);
              const days = Math.floor(diff / 86_400_000);
              const when = days > 0
                ? d.toLocaleDateString("en", { month: "short", day: "numeric" })
                : hrs > 0 ? `${hrs}h ago`
                : mins > 0 ? `${mins}m ago`
                : "just now";
              return (
                <tr key={e.id} className="hover:bg-[var(--surface-soft)] transition-colors">
                  <td className="px-4 py-3">{taskLabel(e.task_type)}</td>
                  {e.task_type === "topup" ? (
                    <td className="px-4 py-3 text-right font-mono text-[var(--ok)]">+{Math.abs(e.credits_used)}</td>
                  ) : (
                    <td className="px-4 py-3 text-right font-mono text-[var(--accent)]">−{e.credits_used}</td>
                  )}
                  <td className="px-4 py-3 text-right text-[var(--muted-foreground)]">{when}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function BillingPage({ tier, email, trialEndsAt, subscriptionStatus, renewsAt, usage, portalUrl, creditLog = [] }: BillingPageProps) {
  const [period, setPeriod]       = useState<"monthly" | "yearly">("monthly");
  const [topupLoading, setTopupLoading] = useState<string | null>(null);
  const { price, loading: currencyLoading } = useCurrency();

  const daysLeft = trialDaysLeft(trialEndsAt);
  // Only show trial badge when subscription is actively trialing
  const inTrial  = daysLeft !== null && daysLeft > 0 && subscriptionStatus === "trialing";
  const dailyBase = DAILY_BASE[tier] ?? 0;

  async function handleTopup(packId: string) {
    setTopupLoading(packId);
    try {
      const res = await fetch("/api/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack_id: packId }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) window.location.href = data.url;
    } finally {
      setTopupLoading(null);
    }
  }

  return (
    <div className="mx-auto max-w-[860px] px-6 py-8">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Plan</div>
      <h1 className="mb-8 text-[24px] font-normal tracking-[-0.02em]">Plan & credits</h1>

      {/* ── Current plan card ── */}
      <div className="mb-6 rounded-2xl border border-[var(--line-soft)] bg-[var(--surface)] p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Current plan</div>
            <div className="flex items-center gap-3">
              <span className={`rounded-md px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.1em] font-medium ${
                tier === "pro"     ? "bg-[var(--accent)] text-white" :
                tier === "starter" ? "bg-[var(--surface-soft)] border border-[var(--line-soft)] text-[var(--foreground)]" :
                "bg-[var(--accent)]/10 text-[var(--accent)]"
              }`}>
                {tier === "pro" ? "★ " : ""}{PLAN_NAME[tier] ?? tier}
              </span>
              {renewsAt && !inTrial && (
                <span className="text-[13px] text-[var(--muted-foreground)]">
                  renews {new Date(renewsAt).toLocaleDateString("en", { month: "short", day: "numeric" })}
                </span>
              )}
              {inTrial && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
                  Trial · {daysLeft} {daysLeft === 1 ? "day" : "days"} left
                </span>
              )}
              {subscriptionStatus === "cancelled" && (
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-medium text-red-700">
                  Cancels {renewsAt ? new Date(renewsAt).toLocaleDateString("en", { month: "short", day: "numeric" }) : "soon"}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            {portalUrl && (
              <a href={portalUrl} className="rounded-lg border border-[var(--line-soft)] px-3 py-1.5 text-[13px] text-[var(--muted-foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
                Manage billing
              </a>
            )}
            {tier !== "pro" && (
              <Link href="#plans" className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[13px] font-medium text-white transition hover:opacity-90">
                Upgrade →
              </Link>
            )}
          </div>
        </div>

        {/* Usage grid */}
        {tier === "free" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <UsageCell label="Evaluations today" value={`${5 - usage.evaluationsToday} / 5`} sub="5 free per day" warn={usage.evaluationsToday >= 5} />
            <UsageCell label="Resumes today"     value={`${1 - usage.resumesToday} / 1`}     sub="1 free per day" warn={usage.resumesToday >= 1} />
            <UsageCell label="Autofill"           value="—"                                   sub="Starter required" locked />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {/* Credit bar */}
            {(() => {
              const topup = Math.max(0, usage.creditsRemaining - dailyBase);
              const daily = Math.min(usage.creditsRemaining, dailyBase);
              const dailyPct = dailyBase > 0 ? Math.min(100, (daily / dailyBase) * 100) : 0;
              return (
                <div className="col-span-2 sm:col-span-1 rounded-xl border border-[var(--line-soft)] p-4">
                  <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Credits remaining</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-[22px] font-medium leading-none">{usage.creditsRemaining}</span>
                    <span className="text-[13px] text-[var(--muted-foreground)]">total</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--line-soft)]">
                    <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${dailyPct}%` }} />
                  </div>
                  <div className="mt-1.5 text-[11px] text-[var(--muted-foreground)]">
                    {daily} / {dailyBase} daily
                    {topup > 0 && <span className="ml-1.5 rounded-full bg-[var(--ok-bg)] px-1.5 py-0.5 font-mono text-[9px] font-semibold text-[var(--ok)]">+{topup} top-up</span>}
                  </div>
                </div>
              );
            })()}
            <UsageCell
              label="Autofills today"
              value={tier === "pro" ? "∞" : `${Math.max(0, 1 - usage.autofillsToday)} / 1`}
              sub={tier === "pro" ? "unlimited" : "1 per day"}
            />
            <UsageCell label="Credit costs" value="5 · 10 · 25" sub="eval · resume · premium" />
          </div>
        )}
      </div>

      {/* ── Top-up packs (Pro only) ── */}
      {tier === "pro" && (
        <div id="topup" className="mb-6 rounded-2xl border border-[var(--line-soft)] bg-[var(--surface)] p-6">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Buy extra credits</h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Pro only · valid until renewal</span>
          </div>
          <p className="mb-4 text-[13px] text-[var(--muted-foreground)]">
            Top-up credits are added on top of your daily 300 and expire when your subscription renews or ends. Unused credits are not refunded.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TOPUP_PACKS.map((pack) => (
              <button
                key={pack.id}
                onClick={() => handleTopup(pack.id)}
                disabled={topupLoading === pack.id}
                className="flex flex-col rounded-xl border border-[var(--line-soft)] p-4 text-left transition hover:border-[var(--accent)] disabled:opacity-50"
              >
                <span className="font-mono text-[18px] font-semibold leading-none">{pack.credits}</span>
                <span className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">credits</span>
                <span className="mt-3 font-mono text-[13px] font-medium text-[var(--accent)]">
                  {currencyLoading ? "…" : `₹${pack.inr}`}
                </span>
                <span className="mt-2 rounded-lg bg-[var(--accent)] py-1.5 text-center text-[11px] font-medium text-white transition hover:opacity-90">
                  {topupLoading === pack.id ? "Redirecting…" : "Buy"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Plan comparison ── */}
      <div id="plans" className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">Switch plan</h2>
        <div className="flex rounded-lg border border-[var(--line-soft)] p-0.5 text-[12px]">
          {(["monthly", "yearly"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1 capitalize transition ${period === p ? "bg-[var(--accent)] text-white font-medium" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
            >
              {p}{p === "yearly" && <span className="ml-1.5 text-[10px] opacity-80">save up to 25%</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <PlanCard
          name="Free"
          price="₹0"
          priceSub="forever"
          current={tier === "free"}
          features={["5 evaluations / day", "1 resume / day", "Unlimited pipeline", "Browser extension"]}
          locked={["Daily credits", "Autofill forms", "Premium resume"]}
          cta={tier === "free" ? "Current plan" : undefined}
          ctaDisabled
        />
        <PlanCard
          name="Starter"
          price={currencyLoading ? "…" : price(period === "monthly" ? INR_PRICES.starter_monthly : INR_PRICES.starter_yearly).display}
          priceSub={`/ ${period === "monthly" ? "month" : "month, billed yearly"}`}
          highlight
          badge="Most popular"
          current={tier === "starter"}
          features={["100 credits / day", "1 autofill / day", "Standard resumes", "Pipeline tracking"]}
          locked={["Unlimited autofill", "Premium resumes", "Credit top-ups"]}
          cta={tier === "starter" ? "Current plan" : tier === "pro" ? "Downgrade" : "Get Starter"}
          ctaHref={tier === "free" ? (checkoutUrl("starter", period, email) ?? undefined) : tier === "pro" && portalUrl ? portalUrl : undefined}
          ctaDisabled={tier === "starter" || (tier === "pro" && !portalUrl)}
        />
        <PlanCard
          name="Pro"
          badge="★ Full power"
          price={currencyLoading ? "…" : price(period === "monthly" ? INR_PRICES.pro_monthly : INR_PRICES.pro_yearly).display}
          priceSub={`/ ${period === "monthly" ? "month" : "month, billed yearly"}`}
          current={tier === "pro"}
          features={["300 credits / day", "Unlimited autofill", "Premium resumes", "Credit top-ups"]}
          cta={tier === "pro" ? "Current plan" : "Go Pro"}
          ctaHref={tier === "pro" ? undefined : (checkoutUrl("pro", period, email) ?? undefined)}
          ctaDisabled={tier === "pro"}
        />
      </div>

      {/* ── Credit usage log ── */}
      <div className="mt-6">
        <CreditLog entries={creditLog} />
      </div>

      {/* ── Credits explainer ── */}
      <div className="mt-6 rounded-2xl border border-[var(--line-soft)] bg-[var(--surface)] p-6">
        <h3 className="mb-3 text-[14px] font-semibold">How credits work</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 text-[13px] leading-[1.65] text-[var(--muted-foreground)]">
            <p>Credits reset to your daily allowance at <strong className="text-[var(--foreground)]">midnight UTC</strong> every day. Unused credits are not carried over.</p>
            <p>Free users have a separate daily limit system — no credit balance is shown.</p>
          </div>
          <div className="rounded-xl bg-[var(--surface-soft)] p-4">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Credit costs per action</div>
            <table className="w-full text-[13px]">
              <tbody className="divide-y divide-[var(--line-soft)]">
                {[
                  ["Job evaluation",    "5 credits"],
                  ["Standard resume",   "10 credits"],
                  ["Premium resume",    "25 credits"],
                  ["Autofill (form)",   "8 credits"],
                ].map(([action, cost]) => (
                  <tr key={action}>
                    <td className="py-1.5 text-[var(--muted-foreground)]">{action}</td>
                    <td className="py-1.5 text-right font-mono font-medium">{cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function UsageCell({ label, value, sub, warn, locked }: {
  label: string; value: string; sub: string; warn?: boolean; locked?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--line-soft)] p-4">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">{label}</div>
      <div className={`font-mono text-[20px] font-medium leading-none ${warn ? "text-red-500" : locked ? "text-[var(--muted-foreground)] opacity-40" : ""}`}>{value}</div>
      <div className="mt-1 text-[11px] text-[var(--muted-foreground)]">{sub}</div>
    </div>
  );
}

function PlanCard({ name, price, priceSub, highlight, badge, current, features, locked, cta, ctaHref, ctaDisabled }: {
  name: string; price: string; priceSub: string; highlight?: boolean; badge?: string;
  current?: boolean; features: string[]; locked?: string[]; cta?: string;
  ctaHref?: string; ctaDisabled?: boolean;
}) {
  return (
    <div className={`flex flex-col rounded-2xl p-6 ${
      highlight ? "border-2 border-[var(--accent)] shadow-[0_4px_20px_rgba(200,74,31,0.10)]" : "border border-[var(--line-soft)]"
    } ${current ? "bg-[var(--accent)]/3" : "bg-[var(--surface)]"}`}>
      <div className="mb-4 flex items-start justify-between">
        <span className={`font-mono text-[10px] uppercase tracking-[0.16em] ${highlight ? "text-[var(--accent)]" : "text-[var(--muted-foreground)]"}`}>
          {name}
        </span>
        {badge && (
          <span className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] ${highlight ? "bg-[var(--accent)] text-white" : "border border-[var(--line-soft)] text-[var(--muted-foreground)]"}`}>
            {badge}
          </span>
        )}
      </div>
      <div className="mb-1 flex items-baseline gap-1.5">
        <span className="text-[28px] font-normal leading-none tracking-[-0.02em]">{price}</span>
      </div>
      <div className="mb-5 text-[11px] text-[var(--muted-foreground)]">{priceSub}</div>
      <ul className="mb-5 flex-1 space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[13px]"><CheckIcon />{f}</li>
        ))}
        {locked?.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[13px] opacity-40"><LockIcon />{f}</li>
        ))}
      </ul>
      {ctaHref ? (
        <a href={ctaHref} className={`block rounded-xl py-2.5 text-center text-[13px] font-medium transition ${
          highlight ? "bg-[var(--accent)] text-white hover:opacity-90" : "border border-[var(--line-soft)] text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
        }`}>{cta}</a>
      ) : (
        <button disabled={ctaDisabled} className={`rounded-xl py-2.5 text-center text-[13px] font-medium transition ${
          ctaDisabled ? "cursor-default opacity-40 border border-[var(--line-soft)] text-[var(--muted-foreground)]"
          : highlight ? "bg-[var(--accent)] text-white hover:opacity-90"
          : "border border-[var(--line-soft)] text-[var(--foreground)]"
        }`}>{cta}</button>
      )}
    </div>
  );
}
