"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandWordmark } from "@/components/nextrole/brand";
import { useCurrency, INR_PRICES } from "@/lib/hooks/use-currency";

type Period = "monthly" | "yearly";

const RZP_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";

interface RzpOptions {
  key: string; amount: number; currency: string; order_id: string;
  name: string; description: string; prefill: { email: string };
  theme: { color: string };
  handler: (res: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  modal: { ondismiss: () => void };
}
declare global { interface Window { Razorpay: new (o: RzpOptions) => { open(): void } } }

const TIERS = [
  {
    id: "free",
    name: "Free",
    inrMonthly: 0,
    inrYearly: 0,
    jobLimit: "5 jobs",
    badge: null,
    features: [
      "AI job scoring",
      "Job tracker",
      "CV management",
      "Job scanner",
      "Browser extension",
      "5 job slots",
    ],
    cta: "Start free",
    ctaStyle: "secondary" as const,
  },
  {
    id: "starter",
    name: "Starter",
    inrMonthly: INR_PRICES.starter_monthly,
    inrYearly:  INR_PRICES.starter_yearly,
    jobLimit: "25 jobs",
    badge: null,
    features: [
      "Everything in Free",
      "100 credits / day",
      "Tailored resumes (10 cr)",
      "Job evaluation (5 cr)",
      "1 autofill / day",
      "25 job slots",
    ],
    cta: "Get Starter",
    ctaStyle: "secondary" as const,
  },
  {
    id: "pro",
    name: "Pro",
    inrMonthly: INR_PRICES.pro_monthly,
    inrYearly:  INR_PRICES.pro_yearly,
    jobLimit: "Unlimited jobs",
    badge: "Most Popular",
    features: [
      "Everything in Starter",
      "300 credits / day",
      "Unlimited autofill",
      "Premium resumes (25 cr)",
      "Credit top-ups",
      "Unlimited job slots",
    ],
    cta: "Get Pro",
    ctaStyle: "primary" as const,
  },
] as const;

type TierId = (typeof TIERS)[number]["id"];

interface Props {
  trialEndsAt: string | null;
  email: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function trialDaysLeft(endsAt: string | null): number | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return null;
  return Math.ceil(ms / 86_400_000);
}

function yearlyDiscount(monthly: number, yearly: number): number {
  return Math.round(((monthly - yearly / 12) / monthly) * 100);
}

function CheckIcon({ accent }: { accent?: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke={accent ? "var(--accent)" : "var(--ok)"}
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OnboardingPricing({ trialEndsAt, email }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<TierId | null>(null);
  const [period, setPeriod] = useState<Period>("monthly");
  const daysLeft = trialDaysLeft(trialEndsAt);
  const { price, currency, loading: currencyLoading } = useCurrency();
  const scriptLoaded = useRef(false);

  const toggleDiscount = yearlyDiscount(INR_PRICES.pro_monthly, INR_PRICES.pro_yearly);

  useEffect(() => {
    if (scriptLoaded.current || document.getElementById("rzp-script")) { scriptLoaded.current = true; return; }
    const s = document.createElement("script");
    s.id = "rzp-script"; s.src = "https://checkout.razorpay.com/v1/checkout.js"; s.async = true;
    document.body.appendChild(s); scriptLoaded.current = true;
  }, []);

  async function completeOnboarding() {
    await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
  }

  async function handleFreeOrByok(tierId: TierId) {
    setLoading(tierId);
    await completeOnboarding();
    router.push("/dashboard");
  }

  async function handlePaidTier(tierId: "starter" | "pro") {
    setLoading(tierId);
    try {
      const res = await fetch("/api/razorpay/create-order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "subscription", plan: tierId, period }),
      });
      const order = await res.json() as { order_id?: string; amount?: number; currency?: string; error?: string };
      if (!order.order_id) { alert(order.error ?? "Could not create order"); setLoading(null); return; }

      const rzp = new window.Razorpay({
        key: RZP_KEY, amount: order.amount!, currency: order.currency!, order_id: order.order_id,
        name: "NextRole", description: `${tierId.charAt(0).toUpperCase() + tierId.slice(1)} — ${period}`,
        prefill: { email }, theme: { color: "#c84a1f" },
        handler: async (paymentRes) => {
          const verify = await fetch("/api/razorpay/verify-payment", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...paymentRes, type: "subscription", plan: tierId, period }),
          });
          const result = await verify.json() as { ok?: boolean; error?: string };
          if (result.ok) { await completeOnboarding(); router.push("/dashboard"); }
          else { alert(result.error ?? "Payment verification failed"); setLoading(null); }
        },
        modal: { ondismiss: () => setLoading(null) },
      });
      rzp.open();
    } catch { setLoading(null); }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-10">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          <BrandWordmark />
          {daysLeft !== null && (
            <span className="rounded-full border border-[var(--accent)] bg-[#fcefe7] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
              {daysLeft}d trial active
            </span>
          )}
        </div>

        {/* Hero + period toggle */}
        <div className="mb-10 text-center">
          <h1 className="font-serif text-4xl font-bold text-[var(--foreground)] sm:text-5xl">
            Choose your plan
          </h1>
          <p className="mt-3 text-[var(--muted-foreground)]">
            Start free or upgrade for more credits and features.
          </p>

          <div className="mt-6 inline-flex items-center gap-1 rounded-xl border border-[var(--line-soft)] bg-[var(--surface-soft)] p-1">
            <button onClick={() => setPeriod("monthly")}
              className={`rounded-lg px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] font-semibold transition ${
                period === "monthly"
                  ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}>
              Monthly
            </button>
            <button onClick={() => setPeriod("yearly")}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] font-semibold transition ${
                period === "yearly"
                  ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}>
              Yearly
              <span className="rounded-full bg-[var(--ok-bg)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--ok)]">
                -{toggleDiscount}%
              </span>
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {TIERS.map((tier) => {
            const isByok    = false;
            const isPaid    = ["starter", "pro"].includes(tier.id);
            const isLoading = loading === tier.id;
            const discount  = period === "yearly" && tier.inrMonthly > 0
              ? yearlyDiscount(tier.inrMonthly, tier.inrYearly)
              : null;

            // Price display
            let displayPrice: React.ReactNode;
            let displaySub: string;
            if (tier.inrMonthly === 0) {
              displayPrice = "Free";
              displaySub = "";
            } else if (period === "yearly") {
              const perMo = Math.round(tier.inrYearly / 12);
              displayPrice = currencyLoading
                ? <span className="animate-pulse text-[var(--muted-foreground-2)]">—</span>
                : price(perMo).display;
              displaySub = currencyLoading ? "/mo · yearly" : `/mo · ${price(tier.inrYearly).display}/yr`;
            } else {
              displayPrice = currencyLoading
                ? <span className="animate-pulse text-[var(--muted-foreground-2)]">—</span>
                : price(tier.inrMonthly).display;
              displaySub = "/mo";
            }

            return (
              <div key={tier.id}
                className={[
                  "relative flex flex-col rounded-[20px] border p-5 transition-shadow",
                  isByok
                    ? "border-[var(--accent)] shadow-lg ring-1 ring-[var(--accent)]"
                    : "border-[var(--line-soft)] bg-[var(--surface)]",
                ].join(" ")}
                style={isByok ? { background: "#fff9f7" } : undefined}
              >
                {/* Badge row */}
                <div className="mb-2 flex min-h-[20px] items-center justify-between gap-1">
                  {tier.badge ? (
                    <span className={[
                      "inline-block rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em]",
                      isByok
                        ? "bg-[var(--accent)] text-white"
                        : "border border-[var(--line-soft)] text-[var(--muted-foreground)]",
                    ].join(" ")}>
                      {tier.badge}
                    </span>
                  ) : <span />}
                  {discount && (
                    <span className="rounded-full bg-[var(--ok-bg)] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[var(--ok)]">
                      -{discount}%
                    </span>
                  )}
                </div>

                {/* Name + Price */}
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                  {tier.name}
                </p>
                <div className="mt-1">
                  <span className="text-3xl font-bold text-[var(--foreground)]">
                    {displayPrice}
                  </span>
                </div>
                <p className="mt-0.5 font-mono text-[10px] text-[var(--muted-foreground-2)]">
                  {displaySub}
                  {!currencyLoading && currency.code !== "INR" && tier.inrMonthly > 0 && (
                    <span className="ml-1 opacity-60">· approx</span>
                  )}
                </p>
                <p className="mt-1 font-mono text-[10px] text-[var(--muted-foreground-2)]">
                  {tier.jobLimit}
                </p>

                <hr className="my-4 border-[var(--line-soft)]" />

                {/* Features */}
                <ul className="flex-1 space-y-2">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-[var(--foreground)]">
                      <span className={isByok ? "text-[var(--accent)]" : "text-[var(--ok)]"}>
                        <CheckIcon accent={isByok} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="mt-5">
                  {tier.id === "free" ? (
                    <button onClick={() => handleFreeOrByok("free")} disabled={!!loading}
                      className="w-full rounded-full border border-[var(--line-soft)] bg-transparent py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--foreground)] transition hover:border-[var(--line)] disabled:opacity-50">
                      {isLoading ? "Starting…" : tier.cta}
                    </button>
                  ) : isPaid ? (
                    <button
                      onClick={() => handlePaidTier(tier.id as "starter" | "pro")}
                      disabled={!!loading}
                      className={[
                        "w-full rounded-full py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] transition disabled:opacity-50",
                        tier.ctaStyle === "primary"
                          ? "bg-[var(--foreground)] text-[var(--background)] hover:opacity-90"
                          : "border border-[var(--line-soft)] text-[var(--foreground)] hover:border-[var(--line)]",
                      ].join(" ")}>
                      {isLoading ? "Processing…" : tier.cta}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground-2)]">
          No credit card required · Cancel anytime
        </p>

      </div>
    </div>
  );
}
