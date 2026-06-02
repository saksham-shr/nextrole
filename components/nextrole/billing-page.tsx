"use client";

import { useEffect, useRef, useState } from "react";
import type { UserTier, PaymentRecord } from "@/lib/db/types";
import { useCurrency } from "@/lib/hooks/use-currency";

const RZP_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";

// ── Razorpay script loader ─────────────────────────────────────────────────

function useRazorpayScript() {
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current || document.getElementById("rzp-script")) { loaded.current = true; return; }
    const s = document.createElement("script");
    s.id = "rzp-script"; s.src = "https://checkout.razorpay.com/v1/checkout.js"; s.async = true;
    document.body.appendChild(s); loaded.current = true;
  }, []);
}

interface RzpOptions {
  key: string; amount: number; currency: string; order_id: string;
  name: string; description: string; prefill: { email: string };
  theme: { color: string };
  handler: (res: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  modal: { ondismiss: () => void };
}
declare global { interface Window { Razorpay: new (o: RzpOptions) => { open(): void } } }

// ── Icons ──────────────────────────────────────────────────────────────────

function CheckIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-[2px] shrink-0"><path d="M20 6 9 17l-5-5"/></svg>;
}
function LockIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-[2px] shrink-0 opacity-40"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>;
}
function AlertIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
}

// ── Types ──────────────────────────────────────────────────────────────────

interface UsageData {
  creditsRemaining: number;
  autofillsToday: number;
  resumesToday: number;
  evaluationsToday: number;
}

interface CreditLogEntry {
  id: string; task_type: string; credits_used: number; created_at: string;
}

interface CommerceProps {
  planPricesInr: Record<string, number>;
  topupPacks: Array<{ id: string; credits: number; inr: number }>;
  flags: { starter_enabled: boolean; pro_enabled: boolean; topups_enabled: boolean };
}

interface BillingPageProps {
  tier: UserTier;
  email: string;
  isAdmin?: boolean;
  trialEndsAt: string | null;
  subscriptionStatus: string | null;
  renewsAt: string | null;
  usage: UsageData;
  creditLog?: CreditLogEntry[];
  paymentRecords?: PaymentRecord[];
  commerce: CommerceProps;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function trialDaysLeft(endsAt: string | null): number | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86_400_000);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtAmount(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}
function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor(diff / 60_000);
  if (d > 0) return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

const DAILY_BASE: Record<string, number> = { starter: 100, pro: 300 };
const PLAN_NAME:  Record<string, string>  = { free: "Free", starter: "Starter", pro: "Pro" };
const TASK_LABELS: Record<string, string> = {
  evaluate: "Job evaluation", resume_standard: "Standard resume", resume_premium: "Premium resume",
  autofill: "Autofill", tailor: "AI tailoring", topup: "Top-up purchase",
  subscription: "Subscription payment",
};

// ── Past-due / halted alert banner ─────────────────────────────────────────

function StatusBanner({
  status, tier, period, email,
  onRetry,
}: {
  status: string; tier: string; period: string | null; email: string;
  onRetry: (plan: "starter" | "pro", period: "monthly" | "yearly") => void;
}) {
  const [retrying, setRetrying] = useState(false);

  if (status === "past_due") {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
        <span className="mt-0.5 text-red-500 shrink-0"><AlertIcon /></span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-red-800">Payment failed — action required</p>
          <p className="mt-0.5 text-[12px] text-red-700">
            Your last payment could not be processed. Retry now to keep your {PLAN_NAME[tier] ?? tier} access.
          </p>
        </div>
        <button
          onClick={() => { setRetrying(true); onRetry(tier as "starter" | "pro", (period ?? "monthly") as "monthly" | "yearly"); }}
          disabled={retrying}
          className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          {retrying ? "Opening…" : "Retry payment"}
        </button>
      </div>
    );
  }

  if (status === "halted") {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
        <span className="mt-0.5 text-red-500 shrink-0"><AlertIcon /></span>
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-red-800">Subscription suspended</p>
          <p className="mt-0.5 text-[12px] text-red-700">
            After multiple failed attempts your subscription has been suspended. Re-subscribe below to restore access.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

// ── Cancel confirmation inline ─────────────────────────────────────────────

function CancelSection({ tier, renewsAt, onCancelled }: {
  tier: string; renewsAt: string | null; onCancelled: () => void;
}) {
  const [open, setOpen]       = useState(false);
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState("");

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-[12px] text-[var(--muted-foreground)] hover:text-red-600 underline transition"
      >
        Cancel subscription
      </button>
    );
  }

  const until = renewsAt ? fmtDate(renewsAt) : "the end of your current period";

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
      <p className="text-[13px] font-semibold text-red-800 mb-1">Cancel {PLAN_NAME[tier] ?? tier}?</p>
      <p className="text-[12px] text-red-700 mb-3">
        You'll keep full access until <strong>{until}</strong>. After that your account moves to the Free tier.
        No further charges will be made.
      </p>
      {error && <p className="text-[11px] text-red-600 mb-2">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={async () => {
            setBusy(true); setError("");
            try {
              const r = await fetch("/api/razorpay/cancel-subscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
              const data = await r.json() as { ok?: boolean; error?: string };
              if (data.ok) { onCancelled(); }
              else { setError(data.error ?? "Failed to cancel"); }
            } catch { setError("Network error — please try again"); }
            finally { setBusy(false); }
          }}
          disabled={busy}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          {busy ? "Cancelling…" : "Yes, cancel"}
        </button>
        <button onClick={() => setOpen(false)} className="rounded-lg border border-red-200 px-3 py-1.5 text-[12px] text-red-700 transition hover:bg-red-100">
          Keep plan
        </button>
      </div>
    </div>
  );
}

// ── Payment history ────────────────────────────────────────────────────────

function PaymentHistory({ records }: { records: PaymentRecord[] }) {
  if (records.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--surface)] p-6">
      <h3 className="mb-4 text-[14px] font-semibold">Payment history</h3>
      <div className="overflow-hidden rounded-xl border border-[var(--line-soft)]">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[var(--line-soft)] bg-[var(--surface-soft)]">
              <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Description</th>
              <th className="px-4 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Amount</th>
              <th className="px-4 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Date</th>
              <th className="px-4 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line-soft)]">
            {records.map((r) => {
              const label = r.type === "subscription"
                ? `${PLAN_NAME[r.plan ?? ""] ?? r.plan ?? "Plan"} — ${r.period ?? ""}`
                : `Credit top-up${r.pack_id ? ` (${r.pack_id})` : ""}`;
              return (
                <tr key={r.id} className="hover:bg-[var(--surface-soft)] transition-colors">
                  <td className="px-4 py-3 text-[var(--foreground)]">{label}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium">{fmtAmount(r.amount_paise)}</td>
                  <td className="px-4 py-3 text-right text-[var(--muted-foreground)]">{fmtDate(r.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {r.status === "refunded" ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Refunded</span>
                    ) : r.status === "partially_refunded" ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Part. refunded</span>
                    ) : (
                      <span className="rounded-full bg-[var(--ok-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--ok)]">Paid</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Credit usage log ────────────────────────────────────────────────────────

function CreditLog({ entries }: { entries: CreditLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--surface)] p-6">
        <h3 className="mb-2 text-[14px] font-semibold">Credit usage log</h3>
        <p className="text-[13px] text-[var(--muted-foreground)]">No AI actions recorded yet.</p>
      </div>
    );
  }

  const totalSpent = entries.filter((e) => e.task_type !== "topup" && e.credits_used > 0).reduce((s, e) => s + e.credits_used, 0);

  return (
    <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--surface)] p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[14px] font-semibold">Credit usage log</h3>
        <span className="font-mono text-[11px] text-[var(--muted-foreground)]">{totalSpent} spent · last {entries.length} actions</span>
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
            {entries.map((e) => (
              <tr key={e.id} className="hover:bg-[var(--surface-soft)] transition-colors">
                <td className="px-4 py-3">{TASK_LABELS[e.task_type] ?? e.task_type.replace(/_/g, " ")}</td>
                {e.task_type === "topup" || e.task_type === "subscription" ? (
                  <td className="px-4 py-3 text-right font-mono text-[var(--ok)]">—</td>
                ) : e.credits_used === 0 ? (
                  <td className="px-4 py-3 text-right font-mono text-[var(--muted-foreground)]">—</td>
                ) : (
                  <td className="px-4 py-3 text-right font-mono text-[var(--accent)]">−{e.credits_used}</td>
                )}
                <td className="px-4 py-3 text-right text-[var(--muted-foreground)]">{relativeTime(e.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function BillingPage({
  tier, email, isAdmin = false,
  trialEndsAt, subscriptionStatus, renewsAt,
  usage, creditLog = [], paymentRecords = [], commerce,
}: BillingPageProps) {
  const [period, setPeriod]               = useState<"monthly" | "yearly">("monthly");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState(subscriptionStatus);
  const { price, loading: currencyLoading } = useCurrency();

  useRazorpayScript();

  const daysLeft  = trialDaysLeft(trialEndsAt);
  const inTrial   = daysLeft !== null && daysLeft > 0 && currentStatus === "trialing";
  const dailyBase = DAILY_BASE[tier] ?? 0;
  const isPaid    = tier !== "free";

  // Look up what period the user is on (from payment_records)
  const lastSubRecord = paymentRecords.find((r) => r.type === "subscription" && r.status === "captured");
  const activePeriod  = (lastSubRecord?.period ?? "monthly") as "monthly" | "yearly";

  async function startRazorpay(
    loadingKey: string,
    orderPayload: Record<string, string>,
    description: string,
    onSuccess: (ids: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => Promise<void>,
  ) {
    setCheckoutLoading(loadingKey);
    try {
      const res  = await fetch("/api/razorpay/create-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(orderPayload) });
      const text = await res.text();
      let order: { order_id?: string; amount?: number; currency?: string; error?: string };
      try { order = JSON.parse(text); } catch { alert(`Server error: ${text.slice(0, 120)}`); return; }
      if (!order.order_id) { alert(order.error ?? "Could not create payment order. Please try again."); return; }

      new window.Razorpay({
        key: RZP_KEY, amount: order.amount!, currency: order.currency!, order_id: order.order_id,
        name: "NextRole", description, prefill: { email }, theme: { color: "#c84a1f" },
        handler: async (paymentRes) => {
          setCheckoutLoading(loadingKey + "_verifying");
          try { await onSuccess(paymentRes); } finally { setCheckoutLoading(null); }
        },
        modal: { ondismiss: () => setCheckoutLoading(null) },
      }).open();
    } catch (err) {
      alert((err as Error).message ?? "Payment failed. Please try again.");
      setCheckoutLoading(null);
    }
  }

  async function handleCheckout(plan: "starter" | "pro", checkoutPeriod: "monthly" | "yearly") {
    await startRazorpay(
      `${plan}_${checkoutPeriod}`,
      { type: "subscription", plan, period: checkoutPeriod },
      `NextRole ${plan.charAt(0).toUpperCase() + plan.slice(1)} — ${checkoutPeriod}`,
      async (paymentRes) => {
        const verify = await fetch("/api/razorpay/verify-payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...paymentRes, type: "subscription", plan, period: checkoutPeriod }) });
        const result = await verify.json() as { ok?: boolean; error?: string };
        if (result.ok) { window.location.reload(); }
        else { alert(result.error ?? "Payment verification failed. Please contact support."); }
      },
    );
  }

  async function handleTopup(packId: string) {
    const pack = commerce.topupPacks.find((p) => p.id === packId);
    await startRazorpay(
      packId,
      { type: "topup", pack_id: packId },
      `NextRole Credits — ${pack?.credits ?? ""} credits`,
      async (paymentRes) => {
        const verify = await fetch("/api/razorpay/verify-payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...paymentRes, type: "topup", pack_id: packId }) });
        const result = await verify.json() as { ok?: boolean; error?: string };
        if (result.ok) { window.location.reload(); }
        else { alert(result.error ?? "Payment verification failed. Please contact support."); }
      },
    );
  }

  const starterInr      = commerce.planPricesInr[`starter_${period}`];
  const proInr          = commerce.planPricesInr[`pro_${period}`];
  const starterDisabled = !commerce.flags.starter_enabled || !starterInr;
  const proDisabled     = !commerce.flags.pro_enabled || !proInr;

  function planCta(plan: "starter" | "pro"): string {
    if (tier === plan) return "Current plan";
    if (plan === "starter" && tier === "pro") return "Switch to Starter";
    if (plan === "pro" && tier === "starter") return "Upgrade to Pro";
    return plan === "starter" ? "Get Starter" : "Get Pro";
  }

  function canCheckout(plan: "starter" | "pro"): boolean {
    if (isAdmin) return false;
    if (tier === plan) return false;
    if (currentStatus === "cancelled" && tier === plan) return false;
    if (plan === "starter" && starterDisabled) return false;
    if (plan === "pro" && proDisabled) return false;
    return true;
  }

  return (
    <div className="mx-auto max-w-[860px] px-6 py-8">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Plan</div>
      <h1 className="mb-8 text-[24px] font-normal tracking-[-0.02em]">Plan & credits</h1>

      {/* ── Status banners ── */}
      {!isAdmin && (currentStatus === "past_due" || currentStatus === "halted") && (
        <StatusBanner
          status={currentStatus}
          tier={tier}
          period={activePeriod}
          email={email}
          onRetry={(plan, p) => handleCheckout(plan, p)}
        />
      )}

      {/* ── Current plan card ── */}
      <div className="mb-6 rounded-2xl border border-[var(--line-soft)] bg-[var(--surface)] p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Current plan</div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-md px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.1em] font-medium ${
                tier === "pro"     ? "bg-[var(--accent)] text-white" :
                tier === "starter" ? "bg-[var(--surface-soft)] border border-[var(--line-soft)] text-[var(--foreground)]" :
                "bg-[var(--accent)]/10 text-[var(--accent)]"
              }`}>
                {tier === "pro" ? "★ " : ""}{PLAN_NAME[tier] ?? tier}
              </span>
              {renewsAt && !inTrial && currentStatus === "active" && (
                <span className="text-[13px] text-[var(--muted-foreground)]">
                  renews {fmtDate(renewsAt)}
                </span>
              )}
              {inTrial && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
                  Trial · {daysLeft} {daysLeft === 1 ? "day" : "days"} left
                </span>
              )}
              {currentStatus === "cancelled" && renewsAt && (
                <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-medium text-orange-700">
                  Access until {fmtDate(renewsAt)}
                </span>
              )}
              {currentStatus === "past_due" && (
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-medium text-red-700">Payment failed</span>
              )}
              {currentStatus === "halted" && (
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-medium text-red-700">Suspended</span>
              )}
            </div>
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
            {(() => {
              const topup   = Math.max(0, usage.creditsRemaining - dailyBase);
              const daily   = Math.min(usage.creditsRemaining, dailyBase);
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
            <UsageCell label="Autofills today" value={tier === "pro" ? "∞" : `${Math.max(0, 1 - usage.autofillsToday)} / 1`} sub={tier === "pro" ? "unlimited" : "1 per day"} />
            <UsageCell label="Credit costs" value="5 · 10 · 25" sub="eval · resume · premium" />
          </div>
        )}

        {/* Cancel link — only for active paid plans */}
        {!isAdmin && isPaid && currentStatus === "active" && (
          <div className="mt-5 pt-4 border-t border-[var(--line-soft)]">
            <CancelSection
              tier={tier}
              renewsAt={renewsAt}
              onCancelled={() => setCurrentStatus("cancelled")}
            />
          </div>
        )}
      </div>

      {/* ── Top-up packs (Pro only) ── */}
      {tier === "pro" && commerce.flags.topups_enabled && commerce.topupPacks.length > 0 && (
        <div id="topup" className="mb-6 rounded-2xl border border-[var(--line-soft)] bg-[var(--surface)] p-6">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Buy extra credits</h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Pro only · valid until renewal</span>
          </div>
          <p className="mb-4 text-[13px] text-[var(--muted-foreground)]">
            Top-up credits stack on top of your daily 300. Unused credits expire at renewal.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {commerce.topupPacks.map((pack) => {
              const isLoading = checkoutLoading === pack.id || checkoutLoading === `${pack.id}_verifying`;
              return (
                <button key={pack.id} onClick={() => handleTopup(pack.id)} disabled={!!checkoutLoading}
                  className="flex flex-col rounded-xl border border-[var(--line-soft)] p-4 text-left transition hover:border-[var(--accent)] disabled:opacity-50">
                  <span className="font-mono text-[18px] font-semibold leading-none">{pack.credits}</span>
                  <span className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">credits</span>
                  <span className="mt-3 font-mono text-[13px] font-medium text-[var(--accent)]">
                    {currencyLoading ? "…" : `₹${pack.inr}`}
                  </span>
                  <span className="mt-2 rounded-lg bg-[var(--accent)] py-1.5 text-center text-[11px] font-medium text-white">
                    {isLoading ? "Processing…" : "Buy"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Plan switch ── */}
      <div id="plans" className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">Switch plan</h2>
        <div className="flex rounded-lg border border-[var(--line-soft)] p-0.5 text-[12px]">
          {(["monthly", "yearly"] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1 capitalize transition ${period === p ? "bg-[var(--accent)] text-white font-medium" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}>
              {p}{p === "yearly" && <span className="ml-1.5 text-[10px] opacity-80">save up to 25%</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        {/* Free */}
        <PlanCard
          name="Free" price="₹0" priceSub="forever"
          current={tier === "free"}
          features={["5 evaluations / day", "1 resume / day", "Unlimited pipeline", "Browser extension"]}
          locked={["Daily credits", "Autofill forms", "Premium resume"]}
          cta={tier === "free" ? "Current plan" : undefined}
          ctaDisabled
        />

        {/* Starter */}
        {commerce.flags.starter_enabled ? (
          <PlanCard
            name="Starter" highlight badge="Most popular"
            price={currencyLoading ? "…" : (starterInr ? price(starterInr).display : "—")}
            priceSub={`/ ${period === "monthly" ? "month" : "month, billed yearly"}`}
            current={tier === "starter"}
            features={["100 credits / day", "1 autofill / day", "Standard resumes", "Pipeline tracking"]}
            locked={["Unlimited autofill", "Premium resumes", "Credit top-ups"]}
            cta={planCta("starter")}
            loading={checkoutLoading?.startsWith("starter") ?? false}
            onCheckout={canCheckout("starter") ? () => handleCheckout("starter", period) : undefined}
            ctaDisabled={!canCheckout("starter") || !!checkoutLoading}
          />
        ) : (
          <PlanCard name="Starter" price="—" priceSub="temporarily unavailable"
            features={["100 credits / day"]} cta="Unavailable" ctaDisabled />
        )}

        {/* Pro */}
        {commerce.flags.pro_enabled ? (
          <PlanCard
            name="Pro" badge="★ Full power"
            price={currencyLoading ? "…" : (proInr ? price(proInr).display : "—")}
            priceSub={`/ ${period === "monthly" ? "month" : "month, billed yearly"}`}
            current={tier === "pro"}
            features={["300 credits / day", "Unlimited autofill", "Premium resumes", "Credit top-ups"]}
            cta={planCta("pro")}
            loading={checkoutLoading?.startsWith("pro") ?? false}
            onCheckout={canCheckout("pro") ? () => handleCheckout("pro", period) : undefined}
            ctaDisabled={!canCheckout("pro") || !!checkoutLoading}
          />
        ) : (
          <PlanCard name="Pro" badge="★ Full power" price="—" priceSub="temporarily unavailable"
            features={["300 credits / day"]} cta="Unavailable" ctaDisabled />
        )}
      </div>

      {/* ── Payment history ── */}
      {paymentRecords.length > 0 && (
        <div className="mb-6">
          <PaymentHistory records={paymentRecords} />
        </div>
      )}

      {/* ── Credit usage log ── */}
      <div className="mb-6">
        <CreditLog entries={creditLog} />
      </div>

      {/* ── Credits explainer ── */}
      <div className="rounded-2xl border border-[var(--line-soft)] bg-[var(--surface)] p-6">
        <h3 className="mb-3 text-[14px] font-semibold">How credits work</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 text-[13px] leading-[1.65] text-[var(--muted-foreground)]">
            <p>Credits reset to your daily allowance at <strong className="text-[var(--foreground)]">midnight UTC</strong> every day. Unused credits are not carried over.</p>
            <p>Top-up credits stack on top of daily credits and expire at renewal.</p>
          </div>
          <div className="rounded-xl bg-[var(--surface-soft)] p-4">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Credit costs per action</div>
            <table className="w-full text-[13px]">
              <tbody className="divide-y divide-[var(--line-soft)]">
                {[["Job evaluation","5 cr"],["Standard resume","10 cr"],["Premium resume","25 cr"],["Autofill AI","2 cr"],["Tailor answers","8 cr"]].map(([a, c]) => (
                  <tr key={a}><td className="py-1.5 text-[var(--muted-foreground)]">{a}</td><td className="py-1.5 text-right font-mono font-medium">{c}</td></tr>
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

function PlanCard({ name, price, priceSub, highlight, badge, current, features, locked, cta, onCheckout, ctaDisabled, loading }: {
  name: string; price: string; priceSub: string; highlight?: boolean; badge?: string;
  current?: boolean; features: string[]; locked?: string[]; cta?: string;
  onCheckout?: () => void; ctaDisabled?: boolean; loading?: boolean;
}) {
  return (
    <div className={`flex flex-col rounded-2xl p-6 ${
      highlight ? "border-2 border-[var(--accent)] shadow-[0_4px_20px_rgba(200,74,31,0.10)]" : "border border-[var(--line-soft)]"
    } ${current ? "bg-[var(--accent)]/3" : "bg-[var(--surface)]"}`}>
      <div className="mb-4 flex items-start justify-between">
        <span className={`font-mono text-[10px] uppercase tracking-[0.16em] ${highlight ? "text-[var(--accent)]" : "text-[var(--muted-foreground)]"}`}>{name}</span>
        {badge && <span className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] ${highlight ? "bg-[var(--accent)] text-white" : "border border-[var(--line-soft)] text-[var(--muted-foreground)]"}`}>{badge}</span>}
      </div>
      <div className="mb-1 flex items-baseline gap-1.5">
        <span className="text-[28px] font-normal leading-none tracking-[-0.02em]">{price}</span>
      </div>
      <div className="mb-5 text-[11px] text-[var(--muted-foreground)]">{priceSub}</div>
      <ul className="mb-5 flex-1 space-y-2">
        {features.map((f) => <li key={f} className="flex items-start gap-2 text-[13px]"><CheckIcon />{f}</li>)}
        {locked?.map((f) => <li key={f} className="flex items-start gap-2 text-[13px] opacity-40"><LockIcon />{f}</li>)}
      </ul>
      <button onClick={onCheckout} disabled={ctaDisabled || loading}
        className={`rounded-xl py-2.5 text-center text-[13px] font-medium transition ${
          ctaDisabled && !loading ? "cursor-default opacity-40 border border-[var(--line-soft)] text-[var(--muted-foreground)]"
          : highlight ? "bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-60"
          : "border border-[var(--line-soft)] text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-60"
        }`}>
        {loading ? "Processing…" : cta}
      </button>
    </div>
  );
}
