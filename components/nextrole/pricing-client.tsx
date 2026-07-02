"use client";

import { useCurrency, INR_PRICES } from "@/lib/hooks/use-currency";

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-[2px] shrink-0">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function CreditIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-[2px] shrink-0">
      <circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>
    </svg>
  );
}

function LimitIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-[2px] shrink-0 opacity-50">
      <path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10z"/><path d="M12 8v4M12 16h.01"/>
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-[2px] shrink-0">
      <rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
    </svg>
  );
}

type FeatureKind = "check" | "credit" | "limit" | "lock";
interface Feature { text: string; kind: FeatureKind }

function FeatureRow({ text, kind }: Feature) {
  const icons: Record<FeatureKind, React.ReactNode> = {
    check:  <CheckIcon />,
    credit: <CreditIcon />,
    limit:  <LimitIcon />,
    lock:   <LockIcon />,
  };
  return (
    <li className={`flex items-start gap-2.5 text-[14px]${kind === "lock" ? " opacity-40" : kind === "limit" ? " text-[var(--muted-foreground)]" : ""}`}>
      {icons[kind]}{text}
    </li>
  );
}

const FREE_FEATURES: Feature[] = [
  { text: "Job pipeline — save & track applications", kind: "check" },
  { text: "Browser extension — auto job detection", kind: "check" },
  { text: "CV storage", kind: "check" },
  { text: "5 AI evaluations per day", kind: "limit" },
  { text: "1 tailored resume per day", kind: "limit" },
  { text: "Autofill forms — free for 7 days", kind: "limit" },
  { text: "Premium resumes", kind: "lock" },
];
const STARTER_FEATURES: Feature[] = [
  { text: "Everything in Free", kind: "check" },
  { text: "100 credits / day — resets at midnight", kind: "credit" },
  { text: "Standard tailored resumes (10 credits)", kind: "check" },
  { text: "Job evaluation & fit scoring (5 credits)", kind: "check" },
  { text: "Unlimited autofill", kind: "check" },
  { text: "Up to 25 jobs in pipeline", kind: "limit" },
  { text: "Premium resumes", kind: "lock" },
  { text: "Credit top-ups", kind: "lock" },
];
const PRO_FEATURES: Feature[] = [
  { text: "Everything in Starter", kind: "check" },
  { text: "300 credits / day — resets at midnight", kind: "credit" },
  { text: "Unlimited autofill — all fields", kind: "check" },
  { text: "Premium resumes (25 credits)", kind: "check" },
  { text: "Unlimited jobs in pipeline", kind: "check" },
  { text: "Credit top-ups available", kind: "check" },
];

/**
 * Optional commerce-config props. When provided (by a server-rendered
 * caller), the public pricing page advertises live prices + flag state
 * that match what /api/razorpay/create-order will actually enforce. When
 * omitted, falls back to compile-time defaults (safe — used only if a
 * caller forgets to pass props; otherwise UI/server can drift).
 */
export interface PricingCommerce {
  planPricesInr: Partial<Record<string, number>>;
  flags: { starter_enabled: boolean; pro_enabled: boolean; topups_enabled: boolean };
}

export function PricingCards({ commerce }: { commerce?: PricingCommerce } = {}) {
  const { price, loading, currency } = useCurrency();

  // Live commerce values (with safe fallback to defaults). Hiding a plan
  // is more honest than rendering an unbuyable card with a stale price.
  const flags = commerce?.flags ?? { starter_enabled: true, pro_enabled: true, topups_enabled: true };
  const starterInr = commerce?.planPricesInr.starter_monthly ?? INR_PRICES.starter_monthly;
  const proInr     = commerce?.planPricesInr.pro_monthly     ?? INR_PRICES.pro_monthly;

  const starterPrice = price(starterInr);
  const proPrice     = price(proInr);

  const approxNote = !loading && currency.code !== "INR"
    ? `≈ ${currency.code} · converted from ₹`
    : null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

      {/* Free — always shown */}
      <div className="flex flex-col rounded-2xl border border-[var(--line-soft)] bg-[var(--surface)] p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--muted-foreground)]">Free</p>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="text-[38px] font-normal leading-none tracking-[-0.02em]" style={{ fontFamily: "var(--font-display)" }}>$0</span>
          <span className="text-[13px] text-[var(--muted-foreground)]">forever</span>
        </div>
        <p className="mt-3 text-[14px] leading-[1.55] text-[var(--muted-foreground)]">
          Save jobs, get detected by the extension, and use AI daily within generous free limits.
        </p>
        <ul className="mt-6 flex-1 space-y-2.5">
          {FREE_FEATURES.map((f) => <FeatureRow key={f.text} {...f} />)}
        </ul>
        <a href="/signup" className="mt-8 block rounded-xl border border-[var(--line-soft)] py-3 text-center text-[14px] font-medium text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
          Get started free
        </a>
      </div>

      {/* Starter — only shown when admin has enabled it */}
      {flags.starter_enabled ? (
        <div className="flex flex-col rounded-2xl border-2 border-[var(--accent)] bg-[var(--surface)] p-7 shadow-[0_4px_24px_rgba(200,74,31,0.12)]">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--accent)]">Starter</p>
            <span className="rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-white">
              Most popular
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-[38px] font-normal leading-none tracking-[-0.02em]" style={{ fontFamily: "var(--font-display)" }}>
              {loading ? "…" : starterPrice.display}
            </span>
            <span className="text-[13px] text-[var(--muted-foreground)]">/ month</span>
          </div>
          <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
            100 credits / day · resets at midnight
            {approxNote && <> · <span className="opacity-60">{approxNote}</span></>}
          </p>
          <p className="mt-3 text-[14px] leading-[1.55] text-[var(--muted-foreground)]">
            Daily credits for job evaluations and tailored resumes, plus one autofill per day on application forms.
          </p>
          <ul className="mt-6 flex-1 space-y-2.5">
            {STARTER_FEATURES.map((f) => <FeatureRow key={f.text} {...f} />)}
          </ul>
          <a href="/signup?plan=starter" className="mt-8 block rounded-xl bg-[var(--accent)] py-3 text-center text-[14px] font-semibold text-white transition hover:opacity-90">
            Start with Starter
          </a>
        </div>
      ) : (
        <DisabledPlanCard name="Starter" />
      )}

      {/* Pro — only shown when admin has enabled it */}
      {flags.pro_enabled ? (
        <div className="flex flex-col rounded-2xl border border-[var(--line-soft)] bg-[var(--surface)] p-7">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--muted-foreground)]">Pro</p>
            <span className="rounded-full border border-[var(--line-soft)] bg-[var(--surface-soft)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--muted-foreground)]">
              ★ Full power
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-[38px] font-normal leading-none tracking-[-0.02em]" style={{ fontFamily: "var(--font-display)" }}>
              {loading ? "…" : proPrice.display}
            </span>
            <span className="text-[13px] text-[var(--muted-foreground)]">/ month</span>
          </div>
          <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
            300 credits / day · resets at midnight
            {approxNote && <> · <span className="opacity-60">{approxNote}</span></>}
          </p>
          <p className="mt-3 text-[14px] leading-[1.55] text-[var(--muted-foreground)]">
            Full access — unlimited autofill, premium resumes, unlimited pipeline{flags.topups_enabled ? ", and the ability to top up credits anytime." : "."}
          </p>
          <ul className="mt-6 flex-1 space-y-2.5">
            {PRO_FEATURES.filter((f) => flags.topups_enabled || !/top-?up/i.test(f.text)).map((f) => <FeatureRow key={f.text} {...f} />)}
          </ul>
          <a href="/signup?plan=pro" className="mt-8 block rounded-xl border border-[var(--line-soft)] py-3 text-center text-[14px] font-medium text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
            Go Pro
          </a>
        </div>
      ) : (
        <DisabledPlanCard name="Pro" />
      )}
    </div>
  );
}

/**
 * Rendered in place of a plan whose `flags.<plan>_enabled` is false.
 * Conservative + truthful: no fake price, no purchase CTA, clear messaging.
 */
function DisabledPlanCard({ name }: { name: string }) {
  return (
    <div className="flex flex-col rounded-2xl border border-dashed border-[var(--line-soft)] bg-[var(--surface)] p-7 opacity-70">
      <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--muted-foreground)]">{name}</p>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-[38px] font-normal leading-none tracking-[-0.02em] text-[var(--muted-foreground)]" style={{ fontFamily: "var(--font-display)" }}>—</span>
      </div>
      <p className="mt-3 text-[14px] leading-[1.55] text-[var(--muted-foreground)]">
        The {name} plan is temporarily unavailable. Start free and we&apos;ll let you know when it&apos;s back.
      </p>
      <div className="flex-1" />
      <a href="/signup" className="mt-8 block rounded-xl border border-[var(--line-soft)] py-3 text-center text-[14px] font-medium text-[var(--muted-foreground)]">
        Start with Free
      </a>
    </div>
  );
}
