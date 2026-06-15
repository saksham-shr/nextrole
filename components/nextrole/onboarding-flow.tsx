"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandWordmark } from "@/components/nextrole/brand";
import { useCurrency, INR_PRICES } from "@/lib/hooks/use-currency";

// ── Types ────────────────────────────────────────────────────────────────────

type Period = "monthly" | "yearly";
type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type TierId = "free" | "starter" | "pro";

const STEP_LABELS: Record<Step, string> = {
  1: "Welcome",
  2: "Plan",
  3: "Profile",
  4: "Preferences",
  5: "AI Scoring",
  6: "Your Flow",
  7: "Done",
};

// ── Razorpay ─────────────────────────────────────────────────────────────────

const RZP_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";

interface RzpOptions {
  key: string; amount: number; currency: string; order_id: string;
  name: string; description: string; prefill: { email: string };
  theme: { color: string };
  handler: (res: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  modal: { ondismiss: () => void };
}
declare global { interface Window { Razorpay: new (o: RzpOptions) => { open(): void } } }

// ── Plan data ─────────────────────────────────────────────────────────────────

const TIERS = [
  {
    id: "free" as TierId,
    name: "Free",
    inrMonthly: 0,
    inrYearly: 0,
    badge: null,
    features: ["AI job scoring", "Job tracker", "CV management", "Browser extension", "5 job slots"],
    cta: "Start free",
    primary: false,
  },
  {
    id: "starter" as TierId,
    name: "Starter",
    inrMonthly: INR_PRICES.starter_monthly,
    inrYearly: INR_PRICES.starter_yearly,
    badge: null,
    features: ["Everything in Free", "100 credits / day", "25 job slots", "Tailored resumes", "Job evaluation"],
    cta: "Get Starter",
    primary: false,
  },
  {
    id: "pro" as TierId,
    name: "Pro",
    inrMonthly: INR_PRICES.pro_monthly,
    inrYearly: INR_PRICES.pro_yearly,
    badge: "Most Popular",
    features: ["Everything in Starter", "300 credits / day", "Unlimited autofill", "Premium resumes", "Unlimited job slots"],
    cta: "Get Pro",
    primary: true,
  },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function yearlyDiscount(monthly: number, yearly: number) {
  return Math.round(((monthly - yearly / 12) / monthly) * 100);
}

function trialDaysLeft(endsAt: string | null): number | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 86_400_000) : null;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function StepIndicator({ current, hasPlan }: { current: Step; hasPlan: boolean }) {
  // When the user already has a paid plan, step 2 (Plan) is skipped.
  const visibleSteps: Step[] = hasPlan
    ? [1, 3, 4, 5, 6, 7]
    : [1, 2, 3, 4, 5, 6, 7];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 36 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {visibleSteps.map((s, i) => {
          const done = s < current;
          const active = s === current;
          return (
            <div key={s} style={{ display: "flex", alignItems: "center" }}>
              {i > 0 && <span style={{ display: "block", width: 20, height: 1, background: "var(--line-soft)", marginRight: 6 }} />}
              <span style={{
                width: 24, height: 24, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)",
                flexShrink: 0,
                background: done ? "var(--ok)" : active ? "var(--accent)" : "transparent",
                color: done || active ? "white" : "var(--muted-foreground)",
                border: done || active ? "none" : "1px solid var(--line-soft)",
              }}>
                {done ? "✓" : s}
              </span>
            </div>
          );
        })}
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--accent)" }}>
        {STEP_LABELS[current]}
      </span>
    </div>
  );
}

function SkillChips({ skills, onAdd, onRemove }: {
  skills: string[];
  onAdd: (s: string) => void;
  onRemove: (s: string) => void;
}) {
  const [input, setInput] = useState("");

  function commit() {
    const val = input.trim();
    if (val && !skills.includes(val)) onAdd(val);
    setInput("");
  }

  return (
    <div>
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 6, minHeight: 36,
        border: "1px solid var(--line-soft)", borderRadius: 8,
        padding: "6px 10px", background: "var(--background)",
      }}>
        {skills.map(s => (
          <span key={s} style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            background: "var(--surface-soft)", border: "1px solid var(--line-soft)",
            borderRadius: 20, padding: "2px 8px",
            fontSize: 12, color: "var(--foreground)",
          }}>
            {s}
            <button type="button" onClick={() => onRemove(s)}
              style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 0, fontSize: 12, lineHeight: 1 }}>
              ×
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); } }}
          onBlur={commit}
          placeholder={skills.length === 0 ? "Type a skill and press Enter…" : "Add more…"}
          style={{
            flex: 1, minWidth: 120, border: "none", outline: "none",
            background: "transparent", fontSize: 13, color: "var(--foreground)",
          }}
        />
      </div>
      <p style={{ marginTop: 4, fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted-foreground-2)" }}>
        Press Enter or comma to add each skill
      </p>
    </div>
  );
}

// Score zone bar used in step 5
function ScoreBar({ applyThreshold, watchThreshold }: { applyThreshold: number; watchThreshold: number }) {
  const skipPct  = ((watchThreshold - 1) / 4) * 100;
  const watchPct = ((applyThreshold - watchThreshold) / 4) * 100;
  const applyPct = ((5 - applyThreshold) / 4) * 100;

  return (
    <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid var(--line-soft)" }}>
      <div style={{ display: "flex", height: 32 }}>
        <div style={{ width: `${skipPct}%`, background: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {skipPct > 15 && <span style={{ fontSize: 10, fontWeight: 700, color: "white" }}>Skip</span>}
        </div>
        <div style={{ width: `${watchPct}%`, background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {watchPct > 15 && <span style={{ fontSize: 10, fontWeight: 700, color: "white" }}>Watch</span>}
        </div>
        <div style={{ width: `${applyPct}%`, background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }}>
          {applyPct > 15 && <span style={{ fontSize: 10, fontWeight: 700, color: "white" }}>Apply</span>}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px", fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}>
        <span>1.0</span>
        <span style={{ color: "#f59e0b" }}>Watch ≥ {watchThreshold.toFixed(1)}</span>
        <span style={{ color: "#22c55e" }}>Apply ≥ {applyThreshold.toFixed(1)}</span>
        <span>5.0</span>
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  trialEndsAt: string | null;
  email: string;
  currentTier?: string;
}

// ── Main component ────────────────────────────────────────────────────────────

export function OnboardingFlow({ trialEndsAt, email, currentTier = "free" }: Props) {
  const router = useRouter();
  const hasPlan = currentTier !== "free";

  const [step, setStep]   = useState<Step>(hasPlan ? 3 : 1);
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState("");

  // Step 2 — Plan
  const [period, setPeriod]     = useState<Period>("monthly");
  const [planLoading, setPlanLoading] = useState<TierId | null>(null);
  const scriptLoaded = useRef(false);
  const daysLeft = trialDaysLeft(trialEndsAt);
  const { price, currency, loading: currencyLoading } = useCurrency();
  const toggleDiscount = yearlyDiscount(INR_PRICES.pro_monthly, INR_PRICES.pro_yearly);

  // Step 3 — Profile
  const [fullName,   setFullName]   = useState("");
  const [yearsExp,   setYearsExp]   = useState<string>("");
  const [skills,     setSkills]     = useState<string[]>([]);
  const [cvText,     setCvText]     = useState("");

  // Step 4 — Preferences
  const [targetRoles,     setTargetRoles]     = useState("");
  const [targetLocations, setTargetLocations] = useState("");
  const [workMode,        setWorkMode]        = useState<"remote" | "hybrid" | "onsite" | null>(null);
  const [salaryMin,       setSalaryMin]       = useState("");
  const [salaryMax,       setSalaryMax]       = useState("");

  // Step 5 — AI Thresholds
  const [applyScore, setApplyScore] = useState(3.5);
  const [watchScore, setWatchScore] = useState(2.5);

  useEffect(() => {
    if (scriptLoaded.current || document.getElementById("rzp-script")) { scriptLoaded.current = true; return; }
    const s = document.createElement("script");
    s.id = "rzp-script"; s.src = "https://checkout.razorpay.com/v1/checkout.js"; s.async = true;
    document.body.appendChild(s); scriptLoaded.current = true;
  }, []);

  // ── API helpers ────────────────────────────────────────────────────────────

  async function patchProfile(data: Record<string, unknown>) {
    const r = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!r.ok) {
      const d = await r.json() as { error?: string };
      throw new Error(d.error ?? "Could not save profile");
    }
  }

  async function completeOnboarding() {
    await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
  }

  // ── Step 2: Plan handlers ──────────────────────────────────────────────────

  async function handleFree() {
    setPlanLoading("free");
    setStep(3);
    setPlanLoading(null);
  }

  async function handlePaidTier(tierId: "starter" | "pro") {
    setPlanLoading(tierId);
    try {
      const res = await fetch("/api/razorpay/create-order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "subscription", plan: tierId, period }),
      });
      const order = await res.json() as { order_id?: string; amount?: number; currency?: string; error?: string };
      if (!order.order_id) { alert(order.error ?? "Could not create order"); setPlanLoading(null); return; }

      const rzp = new window.Razorpay({
        key: RZP_KEY, amount: order.amount!, currency: order.currency!, order_id: order.order_id,
        name: "NextRole",
        description: `${tierId.charAt(0).toUpperCase() + tierId.slice(1)} — ${period}`,
        prefill: { email }, theme: { color: "#c84a1f" },
        handler: async (paymentRes) => {
          const verify = await fetch("/api/razorpay/verify-payment", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...paymentRes, type: "subscription", plan: tierId, period }),
          });
          const result = await verify.json() as { ok?: boolean; error?: string };
          if (result.ok) {
            setStep(3);
            setPlanLoading(null);
          } else {
            alert(result.error ?? "Payment verification failed");
            setPlanLoading(null);
          }
        },
        modal: { ondismiss: () => setPlanLoading(null) },
      });
      rzp.open();
    } catch { setPlanLoading(null); }
  }

  // ── Step 3: Profile submit ────────────────────────────────────────────────

  async function handleProfileNext() {
    setBusy(true); setError("");
    try {
      const patch: Record<string, unknown> = {};
      if (fullName.trim()) patch.full_name = fullName.trim();
      if (yearsExp !== "" && !isNaN(Number(yearsExp))) patch.years_experience = Number(yearsExp);
      if (skills.length) patch.skills = skills;
      if (cvText.trim()) patch.base_cv = cvText.trim();
      if (Object.keys(patch).length > 0) await patchProfile(patch);
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally { setBusy(false); }
  }

  // ── Step 4: Preferences submit ────────────────────────────────────────────

  async function handlePrefsNext() {
    setBusy(true); setError("");
    try {
      const patch: Record<string, unknown> = {};
      const roles = targetRoles.split(",").map(s => s.trim()).filter(Boolean);
      const locs  = targetLocations.split(",").map(s => s.trim()).filter(Boolean);
      if (roles.length) patch.target_roles = roles;
      if (locs.length)  patch.target_locations = locs;
      if (workMode !== null) patch.work_mode = workMode;
      const min = Number(salaryMin); const max = Number(salaryMax);
      if (salaryMin && !isNaN(min)) patch.comp_min = min;
      if (salaryMax && !isNaN(max)) patch.comp_max = max;
      if (Object.keys(patch).length > 0) await patchProfile(patch);
      setStep(5);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally { setBusy(false); }
  }

  // ── Step 5: Thresholds submit ─────────────────────────────────────────────

  async function handleThresholdsNext() {
    setBusy(true); setError("");
    try {
      await patchProfile({ eval_score_apply: applyScore, eval_score_watch: watchScore });
      setStep(6);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally { setBusy(false); }
  }

  // ── Step 7: Complete ──────────────────────────────────────────────────────

  async function handleComplete() {
    setBusy(true);
    await completeOnboarding();
    router.push("/dashboard");
  }

  // ── Shell ─────────────────────────────────────────────────────────────────

  function Shell({ wide, children }: { wide?: boolean; children: React.ReactNode }) {
    return (
      <div className="min-h-screen bg-[var(--background)] px-4 py-10">
        <div className="mx-auto" style={{ maxWidth: wide ? 900 : 680 }}>
          <div className="mb-10 flex items-center justify-between">
            <BrandWordmark />
            {daysLeft !== null && (
              <span className="rounded-full border border-[var(--accent)] bg-[#fcefe7] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
                {daysLeft}d trial active
              </span>
            )}
          </div>
          <StepIndicator current={step} hasPlan={hasPlan} />
          {children}
        </div>
      </div>
    );
  }

  function ErrorBanner() {
    if (!error) return null;
    return (
      <div style={{
        marginBottom: 16, fontSize: 12, color: "#b53a3a",
        background: "rgba(181,58,58,0.08)", border: "1px solid rgba(181,58,58,0.25)",
        borderRadius: 6, padding: "8px 12px",
      }}>{error}</div>
    );
  }

  function Card({ children }: { children: React.ReactNode }) {
    return (
      <div className="rounded-[20px] border border-[var(--line-soft)] bg-[var(--surface)] p-6">
        {children}
      </div>
    );
  }

  function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
      <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)] mb-1.5">
        {children}
      </label>
    );
  }

  function TextInput({ value, onChange, placeholder, type = "text" }: {
    value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
  }) {
    return (
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[var(--background)] border border-[var(--line-soft)] rounded-[8px] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-colors"
      />
    );
  }

  function ActionRow({ onSkip, skipLabel = "Skip for now", submitLabel, onSubmit, submitBusy }: {
    onSkip?: () => void;
    skipLabel?: string;
    submitLabel: string;
    onSubmit?: () => void;
    submitBusy?: boolean;
  }) {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
        {onSkip ? (
          <button type="button" onClick={onSkip}
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
            {skipLabel}
          </button>
        ) : <span />}
        <button
          type={onSubmit ? "button" : "submit"}
          onClick={onSubmit}
          disabled={submitBusy}
          className="rounded-full bg-[var(--foreground)] text-[var(--background)] px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] transition hover:opacity-90 disabled:opacity-50"
        >
          {submitBusy ? "Saving…" : submitLabel}
        </button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1 — Welcome
  // ═══════════════════════════════════════════════════════════════════════════

  if (step === 1) {
    return (
      <Shell>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, background: "var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px",
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <h1 className="font-serif text-4xl font-bold text-[var(--foreground)] sm:text-5xl">
            Welcome to NextRole
          </h1>
          <p className="mt-3 text-[var(--muted-foreground)] max-w-md mx-auto">
            Your AI-powered job search co-pilot. We'll have you set up and evaluating jobs in under 3 minutes.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 40 }}>
          {[
            { icon: "⚡", title: "AI Evaluation", desc: "Score every job 1–5 across 5 dimensions before you apply" },
            { icon: "📄", title: "Resume Tailoring", desc: "Generate a resume tuned to each job description" },
            { icon: "🖱️", title: "Autofill", desc: "Auto-complete application forms with your profile" },
            { icon: "📊", title: "Job Tracker", desc: "Track every application from evaluation to offer" },
          ].map(f => (
            <div key={f.title} style={{
              border: "1px solid var(--line-soft)", borderRadius: 16,
              padding: "20px 18px", background: "var(--surface)",
            }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{f.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: "var(--foreground)" }}>{f.title}</div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center" }}>
          <button
            onClick={() => setStep(hasPlan ? 3 : 2)}
            className="rounded-full bg-[var(--foreground)] text-[var(--background)] px-8 py-3 font-mono text-[12px] uppercase tracking-[0.18em] transition hover:opacity-90"
          >
            Get started →
          </button>
          <p style={{ marginTop: 12, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted-foreground-2)", textTransform: "uppercase", letterSpacing: "0.14em" }}>
            Takes about 3 minutes
          </p>
        </div>
      </Shell>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2 — Plan selection
  // ═══════════════════════════════════════════════════════════════════════════

  if (step === 2) {
    return (
      <Shell wide>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h1 className="font-serif text-4xl font-bold text-[var(--foreground)] sm:text-5xl">
            Choose your plan
          </h1>
          <p className="mt-3 text-[var(--muted-foreground)]">
            Start free or upgrade for more credits and features.
          </p>

          <div className="mt-6 inline-flex items-center gap-1 rounded-xl border border-[var(--line-soft)] bg-[var(--surface-soft)] p-1">
            {(["monthly", "yearly"] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] font-semibold transition ${
                  period === p
                    ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}>
                {p === "monthly" ? "Monthly" : (
                  <>Yearly <span className="rounded-full bg-[var(--ok-bg)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--ok)]">-{toggleDiscount}%</span></>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {TIERS.map(tier => {
            const isLoading = planLoading === tier.id;
            let displayPrice: React.ReactNode;
            let displaySub = "";

            if (tier.inrMonthly === 0) {
              displayPrice = "Free";
            } else if (period === "yearly") {
              const perMo = Math.round(tier.inrYearly / 12);
              displayPrice = currencyLoading ? <span className="animate-pulse text-[var(--muted-foreground-2)]">—</span> : price(perMo).display;
              displaySub = currencyLoading ? "/mo · yearly" : `/mo · ${price(tier.inrYearly).display}/yr`;
            } else {
              displayPrice = currencyLoading ? <span className="animate-pulse text-[var(--muted-foreground-2)]">—</span> : price(tier.inrMonthly).display;
              displaySub = "/mo";
            }

            const discount = period === "yearly" && tier.inrMonthly > 0
              ? yearlyDiscount(tier.inrMonthly, tier.inrYearly) : null;

            return (
              <div key={tier.id} className="relative flex flex-col rounded-[20px] border border-[var(--line-soft)] bg-[var(--surface)] p-5">
                <div className="mb-2 flex min-h-[20px] items-center justify-between gap-1">
                  {tier.badge ? (
                    <span className="inline-block rounded-full border border-[var(--line-soft)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                      {tier.badge}
                    </span>
                  ) : <span />}
                  {discount && (
                    <span className="rounded-full bg-[var(--ok-bg)] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[var(--ok)]">-{discount}%</span>
                  )}
                </div>

                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">{tier.name}</p>
                <div className="mt-1"><span className="text-3xl font-bold text-[var(--foreground)]">{displayPrice}</span></div>
                <p className="mt-0.5 font-mono text-[10px] text-[var(--muted-foreground-2)]">
                  {displaySub}
                  {!currencyLoading && currency.code !== "INR" && tier.inrMonthly > 0 && <span className="ml-1 opacity-60">· approx</span>}
                </p>

                <hr className="my-4 border-[var(--line-soft)]" />

                <ul className="flex-1 space-y-2">
                  {tier.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-[var(--foreground)]">
                      <span className="mt-0.5"><CheckIcon /></span>{f}
                    </li>
                  ))}
                </ul>

                <div className="mt-5">
                  {tier.id === "free" ? (
                    <button onClick={handleFree} disabled={!!planLoading}
                      className="w-full rounded-full border border-[var(--line-soft)] bg-transparent py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--foreground)] transition hover:border-[var(--line)] disabled:opacity-50">
                      {isLoading ? "Starting…" : tier.cta}
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePaidTier(tier.id as "starter" | "pro")}
                      disabled={!!planLoading}
                      className={`w-full rounded-full py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] transition disabled:opacity-50 ${
                        tier.primary
                          ? "bg-[var(--foreground)] text-[var(--background)] hover:opacity-90"
                          : "border border-[var(--line-soft)] text-[var(--foreground)] hover:border-[var(--line)]"
                      }`}>
                      {isLoading ? "Processing…" : tier.cta}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground-2)]">
          No credit card required · Cancel anytime
        </p>
      </Shell>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3 — Build your profile
  // ═══════════════════════════════════════════════════════════════════════════

  if (step === 3) {
    return (
      <Shell>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 className="font-serif text-4xl font-bold text-[var(--foreground)]">Build your profile</h1>
          <p className="mt-2 text-[var(--muted-foreground)] text-sm">
            The AI uses this to score job fit and personalise every evaluation.
          </p>
        </div>

        <ErrorBanner />

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--muted-foreground)", marginBottom: 16 }}>
              Basic info
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <FieldLabel>Full name</FieldLabel>
                <TextInput value={fullName} onChange={setFullName} placeholder="Jane Smith" />
              </div>
              <div>
                <FieldLabel>Years of experience</FieldLabel>
                <input
                  type="number" min={0} max={50}
                  value={yearsExp}
                  onChange={e => setYearsExp(e.target.value)}
                  placeholder="e.g. 4"
                  className="bg-[var(--background)] border border-[var(--line-soft)] rounded-[8px] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-colors"
                  style={{ width: 120 }}
                />
              </div>
              <div>
                <FieldLabel>Skills</FieldLabel>
                <SkillChips
                  skills={skills}
                  onAdd={s => setSkills(prev => [...prev, s])}
                  onRemove={s => setSkills(prev => prev.filter(x => x !== s))}
                />
              </div>
            </div>
          </Card>

          <Card>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--muted-foreground)", marginBottom: 12 }}>
              Your CV <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— optional but recommended</span>
            </p>
            <textarea
              value={cvText}
              onChange={e => setCvText(e.target.value)}
              rows={10}
              placeholder={"Jane Smith\nSoftware Engineer · Bengaluru\n\nEXPERIENCE\nSenior Engineer · Acme Corp (2021–present)\n..."}
              className="w-full bg-[var(--background)] border border-[var(--line-soft)] rounded-[8px] p-3 text-sm text-[var(--foreground)] font-mono resize-y outline-none focus:border-[var(--accent)] transition-colors"
              style={{ minHeight: 200 }}
            />
            <p style={{ marginTop: 6, fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted-foreground-2)" }}>
              Plain text, no formatting needed. Max 20,000 characters.
            </p>
          </Card>
        </div>

        <ActionRow
          onSkip={() => setStep(4)}
          submitLabel="Continue →"
          onSubmit={handleProfileNext}
          submitBusy={busy}
        />
      </Shell>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4 — Job preferences
  // ═══════════════════════════════════════════════════════════════════════════

  if (step === 4) {
    return (
      <Shell>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 className="font-serif text-4xl font-bold text-[var(--foreground)]">Job preferences</h1>
          <p className="mt-2 text-[var(--muted-foreground)] text-sm">
            Tell NextRole what you're looking for. You can change these anytime.
          </p>
        </div>

        <ErrorBanner />

        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <FieldLabel>Target roles</FieldLabel>
              <TextInput value={targetRoles} onChange={setTargetRoles} placeholder="Software Engineer, Product Manager, ..." />
              <p style={{ marginTop: 4, fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted-foreground-2)" }}>Separate multiple roles with commas</p>
            </div>

            <div>
              <FieldLabel>Preferred locations</FieldLabel>
              <TextInput value={targetLocations} onChange={setTargetLocations} placeholder="Bengaluru, Mumbai, Remote, ..." />
              <p style={{ marginTop: 4, fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted-foreground-2)" }}>Separate multiple locations with commas</p>
            </div>

            <div>
              <FieldLabel>Work mode</FieldLabel>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(["remote", "hybrid", "onsite"] as const).map(mode => (
                  <button key={mode} type="button"
                    onClick={() => setWorkMode(prev => prev === mode ? null : mode)}
                    className={`rounded-full px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] border transition ${
                      workMode === mode
                        ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                        : "border-[var(--line-soft)] text-[var(--muted-foreground)] hover:border-[var(--line)]"
                    }`}>
                    {mode === "onsite" ? "On-site" : mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Expected salary (₹ LPA)</FieldLabel>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <input type="number" min={0} max={9999} value={salaryMin} onChange={e => setSalaryMin(e.target.value)}
                  placeholder="Min"
                  className="bg-[var(--background)] border border-[var(--line-soft)] rounded-[8px] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-colors"
                  style={{ width: 100 }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted-foreground)" }}>to</span>
                <input type="number" min={0} max={9999} value={salaryMax} onChange={e => setSalaryMax(e.target.value)}
                  placeholder="Max"
                  className="bg-[var(--background)] border border-[var(--line-soft)] rounded-[8px] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] transition-colors"
                  style={{ width: 100 }} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted-foreground-2)" }}>lakhs per year</span>
              </div>
            </div>
          </div>
        </Card>

        <ActionRow
          onSkip={() => setStep(5)}
          submitLabel="Continue →"
          onSubmit={handlePrefsNext}
          submitBusy={busy}
        />
      </Shell>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 5 — AI Scoring thresholds
  // ═══════════════════════════════════════════════════════════════════════════

  if (step === 5) {
    return (
      <Shell>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 className="font-serif text-4xl font-bold text-[var(--foreground)]">AI Score Setup</h1>
          <p className="mt-2 text-[var(--muted-foreground)] text-sm">
            Every job gets scored 1–5 across five dimensions. Set your thresholds for Apply, Watch, and Skip.
          </p>
        </div>

        <ErrorBanner />

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Score zone visualiser */}
          <Card>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--muted-foreground)", marginBottom: 14 }}>
              Score zones
            </p>
            <ScoreBar applyThreshold={applyScore} watchThreshold={watchScore} />

            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              {[
                { label: "Apply", color: "#22c55e", desc: "Strong fit — submit your application" },
                { label: "Watch", color: "#f59e0b", desc: "Possible fit — keep an eye on it" },
                { label: "Skip",  color: "#ef4444", desc: "Poor fit — not worth your time" },
              ].map(d => (
                <div key={d.label} style={{
                  flex: 1, minWidth: 140,
                  border: `1px solid ${d.color}22`, borderRadius: 10, padding: "10px 12px",
                  background: `${d.color}0d`,
                }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: d.color }}>{d.label}</span>
                  <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 3, lineHeight: 1.4 }}>{d.desc}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Threshold sliders */}
          <Card>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--muted-foreground)", marginBottom: 20 }}>
              Your thresholds
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#22c55e" }}>Apply threshold</span>
                    <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>Jobs scoring this or above are recommended to apply</p>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color: "#22c55e", minWidth: 36, textAlign: "right" }}>
                    {applyScore.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range" min={watchScore + 0.1} max={5} step={0.1}
                  value={applyScore}
                  onChange={e => {
                    const v = parseFloat(e.target.value);
                    setApplyScore(Math.round(v * 10) / 10);
                  }}
                  style={{ width: "100%", accentColor: "#22c55e" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted-foreground-2)", marginTop: 2 }}>
                  <span>{(watchScore + 0.1).toFixed(1)}</span><span>5.0</span>
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b" }}>Watch threshold</span>
                    <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>Jobs scoring this or above (but below Apply) go into Watch list</p>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color: "#f59e0b", minWidth: 36, textAlign: "right" }}>
                    {watchScore.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range" min={1} max={applyScore - 0.1} step={0.1}
                  value={watchScore}
                  onChange={e => {
                    const v = parseFloat(e.target.value);
                    setWatchScore(Math.round(v * 10) / 10);
                  }}
                  style={{ width: "100%", accentColor: "#f59e0b" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted-foreground-2)", marginTop: 2 }}>
                  <span>1.0</span><span>{(applyScore - 0.1).toFixed(1)}</span>
                </div>
              </div>
            </div>

            <p style={{ marginTop: 16, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted-foreground-2)" }}>
              Default: Apply ≥ 3.5 · Watch ≥ 2.5 · These can be changed anytime from Settings.
            </p>
          </Card>

          {/* Score dimensions */}
          <Card>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--muted-foreground)", marginBottom: 14 }}>
              What gets scored
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
              {[
                { name: "Role Fit",         desc: "Job title & scope vs your target roles" },
                { name: "CV Match",         desc: "Your experience vs job requirements, gaps & strengths" },
                { name: "Compensation",     desc: "Salary vs your expected range & market benchmarks" },
                { name: "Level Strategy",   desc: "Career progression value of this role" },
                { name: "Legitimacy",       desc: "Is the posting real, clear, and high quality?" },
              ].map(d => (
                <div key={d.name} style={{
                  border: "1px solid var(--line-soft)", borderRadius: 8,
                  padding: "10px 12px", background: "var(--surface-soft)",
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 3, lineHeight: 1.4 }}>{d.desc}</div>
                </div>
              ))}
              <div style={{
                border: "1px solid var(--accent)", borderRadius: 8,
                padding: "10px 12px", background: "rgba(200,74,31,0.06)",
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>Final Score</div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 3, lineHeight: 1.4 }}>Weighted average → Apply / Watch / Skip</div>
              </div>
            </div>
          </Card>
        </div>

        <ActionRow
          onSkip={() => setStep(6)}
          skipLabel="Use defaults"
          submitLabel="Save & continue →"
          onSubmit={handleThresholdsNext}
          submitBusy={busy}
        />
      </Shell>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 6 — How your flow works
  // ═══════════════════════════════════════════════════════════════════════════

  if (step === 6) {
    return (
      <Shell>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 className="font-serif text-4xl font-bold text-[var(--foreground)]">Your Job Search Flow</h1>
          <p className="mt-2 text-[var(--muted-foreground)] text-sm">
            From spotting a job to landing an offer — here's how NextRole fits in.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Pipeline */}
          <Card>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--muted-foreground)", marginBottom: 16 }}>
              Application pipeline
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "stretch" }}>
              {[
                { stage: "1. Find", desc: "Spot a job on LinkedIn, Naukri, or anywhere", accent: false },
                { stage: "2. Evaluate", desc: "Paste the URL — AI scores it across 5 dimensions in seconds", accent: true },
                { stage: "3. Track", desc: "Applied, Shortlisted, Interview, Offer — all in one board", accent: false },
                { stage: "4. Tailor", desc: "Generate a resume tuned to each JD before you apply", accent: false },
                { stage: "5. Autofill", desc: "Browser extension fills application forms from your profile", accent: false },
              ].map(s => (
                <div key={s.stage} style={{ flex: 1, minWidth: 140 }}>
                  <div style={{
                    border: s.accent ? "1px solid var(--accent)" : "1px solid var(--line-soft)",
                    borderRadius: 12, padding: "14px 14px",
                    background: s.accent ? "rgba(200,74,31,0.06)" : "var(--surface-soft)",
                    height: "100%",
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: s.accent ? "var(--accent)" : "var(--foreground)", marginBottom: 4 }}>{s.stage}</div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.5 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* How to evaluate */}
          <Card>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--muted-foreground)", marginBottom: 14 }}>
              How to evaluate a job
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { step: "1", text: "Go to Dashboard → Evaluate a Job" },
                { step: "2", text: "Paste the job URL or description" },
                { step: "3", text: "AI scores it 1–5 across Role Fit, CV Match, Compensation, Level Strategy, and Legitimacy" },
                { step: "4", text: "If the score is ≥ your Apply threshold, the AI recommends applying" },
                { step: "5", text: "Add it to your pipeline and tailor your resume in one click" },
              ].map(item => (
                <div key={item.step} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: "50%", background: "var(--accent)",
                    color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1,
                  }}>{item.step}</span>
                  <p style={{ fontSize: 13, color: "var(--foreground)", lineHeight: 1.5 }}>{item.text}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Credits note */}
          <div style={{
            border: "1px solid var(--line-soft)", borderRadius: 12, padding: "12px 16px",
            background: "var(--surface-soft)", display: "flex", gap: 10, alignItems: "flex-start",
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
              Each evaluation costs <strong style={{ color: "var(--foreground)" }}>5 credits</strong>.
              Tailored resumes cost <strong style={{ color: "var(--foreground)" }}>10 credits</strong>.
              Credits reset daily — Starter gets 100/day, Pro gets 300/day.
              Free users get 5 free evaluations per day.
            </div>
          </div>
        </div>

        <ActionRow
          submitLabel="Let's go →"
          onSubmit={() => setStep(7)}
        />
      </Shell>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 7 — All set!
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <Shell>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{
          width: 60, height: 60, borderRadius: "50%", background: "#22c55e",
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px",
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="font-serif text-4xl font-bold text-[var(--foreground)]">You're all set!</h1>
        <p className="mt-2 text-[var(--muted-foreground)] text-sm">
          Your profile is ready. Time to find your next role.
        </p>
      </div>

      <Card>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--muted-foreground)", marginBottom: 16 }}>
          What's set up
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { label: "Profile created",            done: true },
            { label: "CV saved",                   done: !!cvText.trim() },
            { label: "Job preferences set",        done: !!(targetRoles || targetLocations || workMode) },
            { label: "AI score thresholds set",    done: true },
          ].map(item => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                background: item.done ? "#22c55e" : "var(--line-soft)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {item.done && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </span>
              <span style={{ fontSize: 13, color: item.done ? "var(--foreground)" : "var(--muted-foreground)" }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginTop: 16 }}>
        {[
          { label: "Evaluate a job",     desc: "Paste a job URL and get an AI score",   href: "/dashboard/evaluate" },
          { label: "Browse pipeline",    desc: "Track your applications in one place",   href: "/dashboard/pipeline" },
          { label: "Upload resume",      desc: "Add a PDF or tailor a new one",          href: "/dashboard/profile" },
          { label: "Get the extension",  desc: "Autofill forms right from your browser", href: "/dashboard/extension" },
        ].map(link => (
          <a key={link.label} href={link.href} style={{
            border: "1px solid var(--line-soft)", borderRadius: 12,
            padding: "14px 14px", background: "var(--surface)",
            textDecoration: "none", display: "block",
            transition: "box-shadow 0.15s",
          }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.07)")}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", marginBottom: 3 }}>{link.label} →</div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.4 }}>{link.desc}</div>
          </a>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <button
          onClick={handleComplete}
          disabled={busy}
          className="rounded-full bg-[var(--foreground)] text-[var(--background)] px-8 py-3 font-mono text-[12px] uppercase tracking-[0.18em] transition hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Heading in…" : "Go to dashboard →"}
        </button>
      </div>
    </Shell>
  );
}
