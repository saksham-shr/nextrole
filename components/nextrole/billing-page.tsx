"use client";

import Link from "next/link";
import { useState } from "react";
import type { UserTier } from "@/lib/db/types";
import { useCurrency, INR_PRICES } from "@/lib/hooks/use-currency";

const URLS = {
  starter: process.env.NEXT_PUBLIC_LS_STARTER_CHECKOUT_URL ?? "",
  pro:     process.env.NEXT_PUBLIC_LS_PRO_CHECKOUT_URL ?? "",
  team:    process.env.NEXT_PUBLIC_LS_TEAM_CHECKOUT_URL ?? "",
  byok:    process.env.NEXT_PUBLIC_LS_BYOK_CHECKOUT_URL ?? "",
};

type Period = "monthly" | "yearly";

function trialDaysLeft(endsAt: string | null): number | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function CheckIcon({ color }: { color?: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke={color ?? "var(--ok)"} strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" className="mt-[2px] shrink-0">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

interface PlanConfig {
  id: UserTier;
  name: string;
  inrMonthly: number;
  inrYearly?: number;
  credits: string;
  jobLimit: string;
  features: string[];
  badge?: string;
  accentColor?: string;
}

const PLANS: PlanConfig[] = [
  {
    id: "free",
    name: "Free",
    inrMonthly: 0,
    credits: "10 credits/mo",
    jobLimit: "5 job slots",
    features: ["Job pipeline & tracker", "AI job scoring", "CV storage", "Browser extension"],
  },
  {
    id: "starter",
    name: "Starter",
    inrMonthly: INR_PRICES.starter_monthly,
    inrYearly:  INR_PRICES.starter_yearly,
    credits: "100 credits/mo",
    jobLimit: "25 job slots",
    features: ["Everything in Free", "Resume tailoring", "Interview prep", "Apply assistant", "Follow-ups & outreach"],
  },
  {
    id: "pro",
    name: "Pro",
    inrMonthly: INR_PRICES.pro_monthly,
    inrYearly:  INR_PRICES.pro_yearly,
    credits: "500 credits/mo",
    jobLimit: "Unlimited jobs",
    features: ["Everything in Starter", "Cover letters", "Salary negotiation", "Deep research", "Batch processing"],
    badge: "Most Popular",
    accentColor: "var(--ok)",
  },
  {
    id: "team",
    name: "Team",
    inrMonthly: INR_PRICES.team_monthly,
    inrYearly:  INR_PRICES.team_yearly,
    credits: "2000 shared credits",
    jobLimit: "Unlimited jobs",
    features: ["Everything in Pro", "Team dashboard", "5 seats included", "Shared job pools"],
  },
  {
    id: "byok",
    name: "BYOK",
    inrMonthly: INR_PRICES.byok_monthly,
    inrYearly:  INR_PRICES.byok_yearly,
    credits: "Unlimited",
    jobLimit: "Unlimited jobs",
    features: ["All Pro features", "Your own API key", "Zero credit cost", "Anthropic · OpenAI · Gemini"],
    badge: "Recommended",
    accentColor: "var(--accent)",
  },
];

function getCheckoutUrl(id: UserTier): string {
  if (id === "free") return "";
  return URLS[id as keyof typeof URLS] ?? "";
}

function yearlyDiscount(monthly: number, yearly: number): number {
  const perMonth = yearly / 12;
  return Math.round(((monthly - perMonth) / monthly) * 100);
}

export function BillingPage({
  tier,
  creditsRemaining,
  trialEndsAt,
  userEmail: _userEmail,
}: {
  tier: UserTier;
  creditsRemaining: number;
  trialEndsAt: string | null;
  userEmail?: string;
}) {
  const [period, setPeriod] = useState<Period>("monthly");
  const { price, loading: currencyLoading } = useCurrency();

  const daysLeft     = trialDaysLeft(trialEndsAt);
  const inTrial      = daysLeft !== null && daysLeft > 0;
  const trialExpired = daysLeft !== null && daysLeft <= 0 && tier === "free";

  // Largest discount across all paid tiers for the toggle badge
  const maxDiscount = yearlyDiscount(INR_PRICES.starter_monthly, INR_PRICES.starter_yearly);

  function displayPrice(plan: PlanConfig): { main: string; sub: string } {
    if (plan.inrMonthly === 0) return { main: "Free", sub: "forever" };

    if (period === "yearly" && plan.inrYearly) {
      const perMo  = Math.round(plan.inrYearly / 12);
      const yearly = plan.inrYearly;
      return {
        main: currencyLoading ? "—" : price(perMo).display,
        sub: `/ mo · ${currencyLoading ? "—" : price(yearly).display}/yr`,
      };
    }

    return {
      main: currencyLoading ? "—" : price(plan.inrMonthly).display,
      sub: "/ month",
    };
  }

  function renderCta(plan: PlanConfig) {
    const isCurrent = tier === plan.id;
    const url = getCheckoutUrl(plan.id);
    const accent = plan.accentColor;

    if (plan.id === "free") {
      return (
        <div className={`mt-5 rounded-xl border py-2.5 text-center text-[12px] font-medium ${
          isCurrent
            ? "border-[var(--ok)] text-[var(--ok)]"
            : "border-[var(--line-soft)] text-[var(--muted-foreground)]"
        }`}>
          {isCurrent ? "Current plan" : "Free forever"}
        </div>
      );
    }

    if (isCurrent) {
      return plan.id === "byok" ? (
        <Link href="/dashboard/providers"
          className="mt-5 block w-full rounded-xl border border-[var(--accent)] py-2.5 text-center text-[12px] font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-bg)]">
          Manage API key
        </Link>
      ) : (
        <div className="mt-5 rounded-xl border border-[var(--ok)] py-2.5 text-center text-[12px] font-medium text-[var(--ok)]">
          Current plan
        </div>
      );
    }

    if (!url) {
      return (
        <div className="mt-5 rounded-xl border border-[var(--line-soft)] py-2.5 text-center text-[12px] text-[var(--muted-foreground)] opacity-50 cursor-not-allowed">
          Coming soon
        </div>
      );
    }

    return accent ? (
      <Link href={url} target="_blank" rel="noreferrer"
        className="mt-5 block w-full rounded-xl py-2.5 text-center text-[12px] font-semibold text-white transition hover:opacity-90"
        style={{ backgroundColor: accent }}>
        {plan.id === "byok" ? "Start free trial" : `Upgrade to ${plan.name}`}
      </Link>
    ) : (
      <Link href={url} target="_blank" rel="noreferrer"
        className="mt-5 block w-full rounded-xl border border-[var(--line-soft)] py-2.5 text-center text-[12px] font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
        Upgrade to {plan.name}
      </Link>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">

      {/* Header */}
      <div>
        <p className="font-['DM_Mono'] text-[10px] uppercase tracking-[0.22em] text-[var(--muted-foreground-2)]">
          NextRole workspace
        </p>
        <h1 className="mt-2 font-['DM_Serif_Display'] text-4xl text-[var(--foreground)] sm:text-5xl">
          Plans & Billing
        </h1>
      </div>

      {/* Current plan card */}
      <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--surface-soft)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Current plan
            </p>
            <div className="mt-1.5 flex items-center gap-3">
              <p className="font-['DM_Serif_Display'] text-2xl text-[var(--foreground)]">
                {tier === "byok" ? "BYOK" : tier.charAt(0).toUpperCase() + tier.slice(1)}
              </p>
              {inTrial && (
                <span className="rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-[11px] font-semibold text-white">
                  {daysLeft}d trial left
                </span>
              )}
              {trialExpired && (
                <span className="rounded-full bg-[var(--warn-bg)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--warn)]">
                  Trial ended
                </span>
              )}
            </div>
            {inTrial && (
              <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
                Full access until trial ends.{" "}
                <Link href="/dashboard/providers" className="text-[var(--accent)] hover:underline">
                  Add your API key →
                </Link>
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[11px] text-[var(--muted-foreground)]">AI credits</p>
            <p className="mt-0.5 font-['DM_Serif_Display'] text-3xl text-[var(--foreground)]">
              {creditsRemaining === -1 || tier === "byok" ? "∞" : creditsRemaining}
            </p>
          </div>
        </div>
        {inTrial && (
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[var(--line-soft)]">
            <div className="h-full rounded-full bg-[var(--accent)] transition-all"
              style={{ width: `${Math.min(100, ((daysLeft ?? 0) / 14) * 100)}%` }} />
          </div>
        )}
      </div>

      {/* Trial expired warning */}
      {trialExpired && (
        <div className="rounded-2xl border border-[var(--warn)] bg-[var(--warn-bg)] px-5 py-4">
          <p className="text-[13px] font-semibold text-[var(--warn)]">Your trial has ended.</p>
          <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
            You&apos;re now on the Free plan. Upgrade to continue using AI features.
          </p>
        </div>
      )}

      {/* Customer portal */}
      {tier !== "free" && !inTrial && (
        <div className="flex items-center justify-between rounded-2xl border border-[var(--line-soft)] bg-[var(--surface)] px-5 py-4">
          <p className="text-[13px] text-[var(--muted-foreground)]">
            Manage payment method, change plan, or cancel.
          </p>
          <Link href="/api/billing/portal"
            className="shrink-0 rounded-xl border border-[var(--line-soft)] px-4 py-2 text-[13px] font-medium text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
            Manage subscription →
          </Link>
        </div>
      )}

      {/* Plan grid */}
      <div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Available plans
          </p>

          {/* Monthly / Yearly toggle */}
          <div className="flex items-center gap-1 rounded-xl border border-[var(--line-soft)] bg-[var(--surface-soft)] p-1">
            <button onClick={() => setPeriod("monthly")}
              className={`rounded-lg px-3.5 py-1.5 text-[12px] font-semibold transition ${
                period === "monthly"
                  ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}>
              Monthly
            </button>
            <button onClick={() => setPeriod("yearly")}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[12px] font-semibold transition ${
                period === "yearly"
                  ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}>
              Yearly
              <span className="rounded-full bg-[var(--ok-bg)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--ok)]">
                -{maxDiscount}%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {PLANS.map((plan) => {
            const isCurrent = tier === plan.id;
            const { main, sub } = displayPrice(plan);
            const accent = plan.accentColor;
            const discount = period === "yearly" && plan.inrYearly
              ? yearlyDiscount(plan.inrMonthly, plan.inrYearly)
              : null;

            return (
              <div key={plan.id}
                className={[
                  "flex flex-col rounded-2xl border p-5 transition",
                  isCurrent
                    ? "border-[var(--ok)] bg-[var(--surface)]"
                    : accent
                    ? "border-2 bg-[var(--surface)] shadow-sm"
                    : "border-[var(--line-soft)] bg-[var(--surface)]",
                ].join(" ")}
                style={accent && !isCurrent ? { borderColor: accent } : undefined}>

                {/* Name + badge */}
                <div className="flex items-start justify-between gap-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em]"
                    style={{ color: isCurrent ? "var(--ok)" : (accent ?? "var(--muted-foreground)") }}>
                    {plan.name}
                  </p>
                  {isCurrent ? (
                    <span className="rounded-full bg-[var(--ok-bg)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--ok)] whitespace-nowrap">
                      Active
                    </span>
                  ) : discount ? (
                    <span className="rounded-full bg-[var(--ok-bg)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--ok)] whitespace-nowrap">
                      -{discount}%
                    </span>
                  ) : plan.badge ? (
                    <span className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold whitespace-nowrap"
                      style={{ backgroundColor: accent ?? "var(--surface-soft)", color: "white" }}>
                      {plan.badge}
                    </span>
                  ) : null}
                </div>

                {/* Price */}
                <p className={`mt-2 font-['DM_Serif_Display'] text-[26px] leading-none text-[var(--foreground)] ${
                  currencyLoading && plan.inrMonthly > 0 ? "animate-pulse text-[var(--muted-foreground-2)]" : ""
                }`}>
                  {main}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">{sub}</p>

                {/* Credits + job limit */}
                <div className="mt-3 space-y-0.5">
                  <p className="text-[11px] text-[var(--muted-foreground-2)]">{plan.credits}</p>
                  <p className="text-[11px] text-[var(--muted-foreground-2)]">{plan.jobLimit}</p>
                </div>

                <hr className="my-3.5 border-[var(--line-soft)]" />

                {/* Features */}
                <ul className="flex-1 space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-[12px] text-[var(--muted-foreground)]">
                      <CheckIcon color={accent ?? "var(--ok)"} />
                      {f}
                    </li>
                  ))}
                </ul>

                {renderCta(plan)}
              </div>
            );
          })}
        </div>
      </div>

      {/* BYOK explainer */}
      <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--surface-soft)] px-6 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          About BYOK
        </p>
        <p className="mt-2 text-[13px] leading-[1.65] text-[var(--muted-foreground)]">
          Bring your own Anthropic, OpenAI, or Gemini API key. Every AI run calls your provider
          directly — you pay only actual API cost (typically ₹1–₹8 per run). The subscription
          covers the NextRole platform, workspace, and all features.{" "}
          <Link href="/dashboard/providers"
            className="font-semibold text-[var(--foreground)] underline underline-offset-2 hover:text-[var(--accent)]">
            Add your API key →
          </Link>
        </p>
      </div>
    </div>
  );
}
