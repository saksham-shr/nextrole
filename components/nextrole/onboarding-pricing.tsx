"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandWordmark } from "@/components/nextrole/brand";
import { useCurrency, INR_PRICES } from "@/lib/hooks/use-currency";

type Period = "monthly" | "yearly";
type Step = 1 | 2 | 3;

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
  currentTier?: string;
}

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

function StepIndicator({ current }: { current: Step }) {
  const steps = ["Plan", "Your CV", "Preferences"];
  return (
    <div className="flex items-center justify-center gap-2 mb-10">
      {steps.map((label, i) => {
        const n = (i + 1) as Step;
        const done = n < current;
        const active = n === current;
        return (
          <div key={n} className="flex items-center">
            {i > 0 && <span className="w-8 h-px bg-[var(--line-soft)] mx-2" />}
            <div className="flex items-center gap-1.5">
              <span className={[
                "w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-semibold shrink-0",
                done ? "bg-[var(--ok)] text-white" :
                active ? "bg-[var(--accent)] text-white" :
                "border border-[var(--line-soft)] text-[var(--muted-foreground)]",
              ].join(" ")}>
                {done ? "✓" : n}
              </span>
              <span className={[
                "font-mono text-[10px] uppercase tracking-[0.14em]",
                active ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]",
              ].join(" ")}>
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function OnboardingPricing({ trialEndsAt, email, currentTier = "free" }: Props) {
  const router = useRouter();

  // If the user already has a paid plan (e.g. returned mid-onboarding), skip plan step
  const [step, setStep] = useState<Step>(currentTier !== "free" ? 2 : 1);

  // Step 1
  const [loading, setLoading] = useState<TierId | null>(null);
  const [period, setPeriod] = useState<Period>("monthly");

  // Step 2 — CV
  const [cvText, setCvText] = useState("");
  const [cvBusy, setCvBusy] = useState(false);

  // Step 3 — Preferences
  const [targetRoles, setTargetRoles] = useState("");
  const [targetLocations, setTargetLocations] = useState("");
  const [workMode, setWorkMode] = useState<"remote" | "hybrid" | "onsite" | null>(null);
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [prefsBusy, setPrefsBusy] = useState(false);
  const [prefsError, setPrefsError] = useState("");

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
    // Don't complete onboarding yet — advance to profile setup
    setStep(2);
    setLoading(null);
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
          if (result.ok) {
            setStep(2);
            setLoading(null);
          } else {
            alert(result.error ?? "Payment verification failed");
            setLoading(null);
          }
        },
        modal: { ondismiss: () => setLoading(null) },
      });
      rzp.open();
    } catch { setLoading(null); }
  }

  async function handleCvNext() {
    setCvBusy(true);
    if (cvText.trim()) {
      try {
        await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base_cv: cvText.trim() }),
        });
      } catch { /* non-fatal */ }
    }
    setCvBusy(false);
    setStep(3);
  }

  async function handlePrefsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPrefsBusy(true);
    setPrefsError("");

    const roles = targetRoles.split(",").map(s => s.trim()).filter(Boolean);
    const locs = targetLocations.split(",").map(s => s.trim()).filter(Boolean);
    const patch: Record<string, unknown> = {};
    if (roles.length) patch.target_roles = roles;
    if (locs.length) patch.target_locations = locs;
    if (workMode !== null) patch.work_mode = workMode;
    const min = Number(salaryMin);
    const max = Number(salaryMax);
    if (salaryMin && !isNaN(min)) patch.comp_min = min;
    if (salaryMax && !isNaN(max)) patch.comp_max = max;

    if (Object.keys(patch).length > 0) {
      try {
        const r = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!r.ok) {
          const data = await r.json() as { error?: string };
          setPrefsError(data.error ?? "Could not save preferences — please try again");
          setPrefsBusy(false);
          return;
        }
      } catch {
        setPrefsError("Network error — please try again");
        setPrefsBusy(false);
        return;
      }
    }

    await completeOnboarding();
    router.push("/dashboard");
  }

  async function skipToEnd() {
    await completeOnboarding();
    router.push("/dashboard");
  }

  // ── Step 2: CV ────────────────────────────────────────────────────────────────

  if (step === 2) {
    return (
      <div className="min-h-screen bg-[var(--background)] px-4 py-10">
        <div className="mx-auto" style={{ maxWidth: 680 }}>
          <div className="mb-10 flex items-center justify-between">
            <BrandWordmark />
          </div>
          <StepIndicator current={2} />
          <div className="mb-8 text-center">
            <h1 className="font-serif text-4xl font-bold text-[var(--foreground)]">Add your CV</h1>
            <p className="mt-2 text-[var(--muted-foreground)] text-sm">
              Paste your existing CV — we use it to evaluate job fit and autofill applications.
            </p>
          </div>

          <div className="rounded-[20px] border border-[var(--line-soft)] bg-[var(--surface)] p-6">
            <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)] mb-2">
              Your CV text
            </label>
            <textarea
              value={cvText}
              onChange={e => setCvText(e.target.value)}
              rows={13}
              placeholder={"John Smith\nSoftware Engineer · Bengaluru\n\nEXPERIENCE\n\nSenior Engineer · Acme Corp (2021–present)\n..."}
              className="w-full bg-[var(--background)] border border-[var(--line-soft)] rounded-[8px] p-3 text-sm text-[var(--foreground)] font-mono resize-y outline-none focus:border-[var(--accent)] transition-colors"
              style={{ minHeight: 240 }}
            />
            <p className="mt-2 font-mono text-[9px] text-[var(--muted-foreground-2)]">
              Plain text works best — no formatting required. Max 20,000 characters.
            </p>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              Skip for now
            </button>
            <button
              type="button"
              onClick={handleCvNext}
              disabled={cvBusy}
              className="rounded-full bg-[var(--foreground)] text-[var(--background)] px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] transition hover:opacity-90 disabled:opacity-50"
            >
              {cvBusy ? "Saving…" : "Continue →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 3: Preferences ───────────────────────────────────────────────────────

  if (step === 3) {
    return (
      <div className="min-h-screen bg-[var(--background)] px-4 py-10">
        <div className="mx-auto" style={{ maxWidth: 680 }}>
          <div className="mb-10 flex items-center justify-between">
            <BrandWordmark />
          </div>
          <StepIndicator current={3} />
          <div className="mb-8 text-center">
            <h1 className="font-serif text-4xl font-bold text-[var(--foreground)]">Job preferences</h1>
            <p className="mt-2 text-[var(--muted-foreground)] text-sm">
              Help NextRole match you to the right roles. You can update these anytime.
            </p>
          </div>

          <form onSubmit={handlePrefsSubmit}
            className="rounded-[20px] border border-[var(--line-soft)] bg-[var(--surface)] p-6"
            style={{ display: "flex", flexDirection: "column", gap: 20 }}
          >
            {prefsError && (
              <div className="text-xs text-[#b53a3a] bg-[rgba(181,58,58,0.08)] border border-[rgba(181,58,58,0.25)] rounded-[6px] px-3 py-2">
                {prefsError}
              </div>
            )}

            {/* Target roles */}
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)] mb-1.5">
                Target roles
              </label>
              <input
                type="text"
                value={targetRoles}
                onChange={e => setTargetRoles(e.target.value)}
                placeholder="Software Engineer, Product Manager, Data Scientist, ..."
                className="w-full bg-[var(--background)] border border-[var(--line-soft)] rounded-[8px] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-colors"
              />
              <p className="mt-1 font-mono text-[9px] text-[var(--muted-foreground-2)]">Separate multiple roles with commas</p>
            </div>

            {/* Preferred locations */}
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)] mb-1.5">
                Preferred locations
              </label>
              <input
                type="text"
                value={targetLocations}
                onChange={e => setTargetLocations(e.target.value)}
                placeholder="Bengaluru, Mumbai, Remote, ..."
                className="w-full bg-[var(--background)] border border-[var(--line-soft)] rounded-[8px] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-colors"
              />
              <p className="mt-1 font-mono text-[9px] text-[var(--muted-foreground-2)]">Separate multiple locations with commas</p>
            </div>

            {/* Work mode */}
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)] mb-2">
                Work mode
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["remote", "hybrid", "onsite"] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setWorkMode(prev => prev === mode ? null : mode)}
                    className={[
                      "rounded-full px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] border transition",
                      workMode === mode
                        ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                        : "border-[var(--line-soft)] text-[var(--muted-foreground)] hover:border-[var(--line)]",
                    ].join(" ")}
                  >
                    {mode === "onsite" ? "On-site" : mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Salary range */}
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)] mb-1.5">
                Expected salary (₹ LPA)
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input
                  type="number"
                  min={0}
                  max={9999}
                  value={salaryMin}
                  onChange={e => setSalaryMin(e.target.value)}
                  placeholder="Min"
                  className="bg-[var(--background)] border border-[var(--line-soft)] rounded-[8px] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-colors"
                  style={{ width: 110 }}
                />
                <span className="font-mono text-[10px] text-[var(--muted-foreground)]">to</span>
                <input
                  type="number"
                  min={0}
                  max={9999}
                  value={salaryMax}
                  onChange={e => setSalaryMax(e.target.value)}
                  placeholder="Max"
                  className="bg-[var(--background)] border border-[var(--line-soft)] rounded-[8px] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-colors"
                  style={{ width: 110 }}
                />
                <span className="font-mono text-[9px] text-[var(--muted-foreground-2)]">lakhs per year</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}>
              <button
                type="button"
                onClick={skipToEnd}
                className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                Skip for now
              </button>
              <button
                type="submit"
                disabled={prefsBusy}
                className="rounded-full bg-[var(--foreground)] text-[var(--background)] px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] transition hover:opacity-90 disabled:opacity-50"
              >
                {prefsBusy ? "Saving…" : "Finish setup →"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── Step 1: Plan selection ────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-10">
      <div className="mx-auto max-w-6xl">

        <div className="mb-10 flex items-center justify-between">
          <BrandWordmark />
          {daysLeft !== null && (
            <span className="rounded-full border border-[var(--accent)] bg-[#fcefe7] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
              {daysLeft}d trial active
            </span>
          )}
        </div>

        <StepIndicator current={1} />

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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {TIERS.map((tier) => {
            const isPaid    = ["starter", "pro"].includes(tier.id);
            const isLoading = loading === tier.id;
            const discount  = period === "yearly" && tier.inrMonthly > 0
              ? yearlyDiscount(tier.inrMonthly, tier.inrYearly)
              : null;

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
                className="relative flex flex-col rounded-[20px] border border-[var(--line-soft)] bg-[var(--surface)] p-5 transition-shadow"
              >
                <div className="mb-2 flex min-h-[20px] items-center justify-between gap-1">
                  {tier.badge ? (
                    <span className="inline-block rounded-full border border-[var(--line-soft)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                      {tier.badge}
                    </span>
                  ) : <span />}
                  {discount && (
                    <span className="rounded-full bg-[var(--ok-bg)] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[var(--ok)]">
                      -{discount}%
                    </span>
                  )}
                </div>

                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                  {tier.name}
                </p>
                <div className="mt-1">
                  <span className="text-3xl font-bold text-[var(--foreground)]">{displayPrice}</span>
                </div>
                <p className="mt-0.5 font-mono text-[10px] text-[var(--muted-foreground-2)]">
                  {displaySub}
                  {!currencyLoading && currency.code !== "INR" && tier.inrMonthly > 0 && (
                    <span className="ml-1 opacity-60">· approx</span>
                  )}
                </p>
                <p className="mt-1 font-mono text-[10px] text-[var(--muted-foreground-2)]">{tier.jobLimit}</p>

                <hr className="my-4 border-[var(--line-soft)]" />

                <ul className="flex-1 space-y-2">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-[var(--foreground)]">
                      <span className="mt-0.5"><CheckIcon /></span>
                      {f}
                    </li>
                  ))}
                </ul>

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

        <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground-2)]">
          No credit card required · Cancel anytime
        </p>
      </div>
    </div>
  );
}
