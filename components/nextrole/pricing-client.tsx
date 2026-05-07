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
  { text: "Job pipeline — save unlimited jobs", kind: "check" },
  { text: "Browser extension — auto job detection", kind: "check" },
  { text: "CV storage", kind: "check" },
  { text: "5 AI evaluations per day", kind: "limit" },
  { text: "1 custom resume per day", kind: "limit" },
  { text: "Autofill forms", kind: "lock" },
];
const STARTER_FEATURES: Feature[] = [
  { text: "Everything in Free", kind: "check" },
  { text: "50 daily credits — evaluations + resumes", kind: "credit" },
  { text: "1 autofill per day (name, email, phone, LinkedIn)", kind: "limit" },
  { text: "Interview prep + follow-up drafts", kind: "check" },
  { text: "Export + templates", kind: "check" },
  { text: "Direct resume upload to forms", kind: "lock" },
];
const PRO_FEATURES: Feature[] = [
  { text: "Everything in Starter", kind: "check" },
  { text: "200 daily credits — evaluations + resumes", kind: "credit" },
  { text: "Unlimited autofill — all fields + AI-generated", kind: "check" },
  { text: "Direct resume upload to application forms", kind: "check" },
  { text: "Cover letters + salary negotiation", kind: "check" },
  { text: "Deep research + batch evaluation", kind: "check" },
];

export function PricingCards() {
  const { price, loading, currency } = useCurrency();

  const starterPrice = price(INR_PRICES.starter_monthly);
  const proPrice     = price(INR_PRICES.pro_monthly);

  const approxNote = !loading && currency.code !== "INR"
    ? `≈ ${currency.code} · converted from ₹`
    : null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

      {/* Free */}
      <div className="flex flex-col rounded-2xl border border-[var(--line-soft)] bg-[var(--surface)] p-7">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Free</p>
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

      {/* Starter */}
      <div className="flex flex-col rounded-2xl border-2 border-[var(--accent)] bg-[var(--surface)] p-7 shadow-[0_4px_24px_rgba(200,74,31,0.12)]">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">Starter</p>
          <span className="rounded-full bg-[var(--accent)] px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-white">
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
          50 credits / day · resets at midnight
          {approxNote && <> · <span className="opacity-60">{approxNote}</span></>}
        </p>
        <p className="mt-3 text-[14px] leading-[1.55] text-[var(--muted-foreground)]">
          Daily credits for evaluations and resumes, plus one autofill per day on application forms.
        </p>
        <ul className="mt-6 flex-1 space-y-2.5">
          {STARTER_FEATURES.map((f) => <FeatureRow key={f.text} {...f} />)}
        </ul>
        <a href="/signup?plan=starter" className="mt-8 block rounded-xl bg-[var(--accent)] py-3 text-center text-[14px] font-semibold text-white transition hover:opacity-90">
          Start with Starter
        </a>
      </div>

      {/* Pro */}
      <div className="flex flex-col rounded-2xl border border-[var(--line-soft)] bg-[var(--surface)] p-7">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Pro</p>
          <span className="rounded-full border border-[var(--line-soft)] bg-[var(--surface-soft)] px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
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
          200 credits / day · resets at midnight
          {approxNote && <> · <span className="opacity-60">{approxNote}</span></>}
        </p>
        <p className="mt-3 text-[14px] leading-[1.55] text-[var(--muted-foreground)]">
          Everything unlocked — unlimited autofill, direct resume upload to forms, deep research, and batch evaluation.
        </p>
        <ul className="mt-6 flex-1 space-y-2.5">
          {PRO_FEATURES.map((f) => <FeatureRow key={f.text} {...f} />)}
        </ul>
        <a href="/signup?plan=pro" className="mt-8 block rounded-xl border border-[var(--line-soft)] py-3 text-center text-[14px] font-medium text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
          Go Pro
        </a>
      </div>
    </div>
  );
}
